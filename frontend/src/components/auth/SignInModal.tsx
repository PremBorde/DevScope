import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, authModal } from "@/hooks/useAuth";
import {
  Github,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  LogIn,
} from "lucide-react";

export default function SignInModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const {
    user,
    oauthEnabled,
    loginWithOAuth,
    register,
    loginWithCredentials,
    loginAsDemo,
    logout,
  } = useAuth();

  // Login form state
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regGithubUsername, setRegGithubUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    return authModal.subscribe((shouldOpen, initialTab) => {
      setOpen(shouldOpen);
      if (initialTab) {
        setMode(initialTab);
      }
      if (shouldOpen) {
        setError(null);
        setSuccessMsg(null);
      }
    });
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !loginPassword.trim()) return;
    setLoading(true);
    setError(null);

    const res = await loginWithCredentials({
      identifier: identifier.trim(),
      password: loginPassword.trim(),
    });
    setLoading(false);

    if (res.success) {
      setSuccessMsg("Signed in successfully!");
      setTimeout(() => setOpen(false), 1000);
    } else {
      setError(res.error || "Invalid username or password");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) return;

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await register({
      username: regUsername.trim(),
      email: regEmail.trim(),
      password: regPassword.trim(),
      confirmPassword: regConfirmPassword.trim(),
      githubUsername: regGithubUsername.trim() || undefined,
    });
    setLoading(false);

    if (res.success) {
      setSuccessMsg("Account registered and authenticated successfully!");
      setTimeout(() => setOpen(false), 1200);
    } else {
      setError(res.error || "Registration failed");
    }
  };

  const handleDemoClick = async (demoUser: string) => {
    setLoading(true);
    setError(null);
    const res = await loginAsDemo(demoUser);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Signed in as demo profile @${demoUser}!`);
      setTimeout(() => setOpen(false), 1000);
    } else {
      setError(res.error || "Demo sign in failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md w-full border-4 border-black bg-white p-6 shadow-[8px_8px_0_#000] rounded-none sm:max-w-lg">
        <DialogHeader className="space-y-1 text-left border-b-2 border-black pb-3">
          <div className="flex items-center justify-between">
            <span className="inline-block border border-black bg-primary px-2.5 py-0.5 text-[10px] font-heading font-black uppercase tracking-wider">
              {mode === "login" ? "Account Access" : "Create Developer Account"}
            </span>
            {user && (
              <span className="text-[10px] font-bold uppercase bg-green-100 text-green-800 border border-black px-2 py-0.5">
                ● Signed In (@{user.username})
              </span>
            )}
          </div>
          <DialogTitle className="font-heading font-black text-2xl uppercase tracking-tight">
            {mode === "login" ? "Sign In to DevScope" : "Register New Account"}
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            {mode === "login"
              ? "Access your saved roadmaps, interview simulator, and verified badges."
              : "Register to save custom 30-day growth roadmaps and track progress."}
          </DialogDescription>
        </DialogHeader>

        {/* Feedback Alerts */}
        {error && (
          <div className="border-2 border-black bg-red-100 p-3 flex items-start gap-2 text-xs font-bold text-red-900 shadow-[2px_2px_0_#000]">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="border-2 border-black bg-green-100 p-3 flex items-start gap-2 text-xs font-bold text-green-900 shadow-[2px_2px_0_#000]">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Primary Tabs: Sign In vs Register */}
        <div className="grid grid-cols-2 gap-2 border-2 border-black p-1 bg-gray-100">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-2 text-xs font-heading font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
              mode === "login"
                ? "bg-primary text-black border-2 border-black shadow-[2px_2px_0_#000]"
                : "bg-transparent text-muted-foreground hover:text-black"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`py-2 text-xs font-heading font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
              mode === "register"
                ? "bg-primary text-black border-2 border-black shadow-[2px_2px_0_#000]"
                : "bg-transparent text-muted-foreground hover:text-black"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Account
          </button>
        </div>

        {/* MODE 1: SIGN IN */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider block">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. torvalds or dev@example.com"
                  className="pl-9 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 border-2 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white font-black uppercase tracking-wider shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all text-xs"
            >
              {loading ? "Authenticating…" : "Sign In →"}
            </Button>

            {/* Alternative Auth divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/20" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black">
                <span className="bg-white px-2 text-muted-foreground">Or Connect With</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={loginWithOAuth}
              className="w-full h-10 border-2 border-black rounded-none bg-zinc-900 text-white hover:bg-primary hover:text-black font-black uppercase tracking-wider shadow-[2px_2px_0_#000] flex items-center justify-center gap-2 text-xs"
            >
              <Github className="w-4 h-4" />
              Sign In with GitHub OAuth
            </Button>

            {/* Quick Demo Login Strip */}
            <div className="pt-2 border-t border-black/15 flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Quick Test Demo:</span>
              <div className="flex gap-1.5">
                {["torvalds", "gaearon", "shadcn"].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => handleDemoClick(u)}
                    className="px-2 py-0.5 border border-black bg-gray-100 hover:bg-yellow-200 text-[10px] font-black uppercase transition-all shadow-[1px_1px_0_#000]"
                  >
                    @{u}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* MODE 2: REGISTER */}
        {mode === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider block">
                  Desired Username *
                </label>
                <Input
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. devhero"
                  className="border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider block">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider block">
                  Password *
                </label>
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider block">
                  Confirm Password *
                </label>
                <Input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider block">
                Link Public GitHub Profile (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">
                  @
                </span>
                <Input
                  value={regGithubUsername}
                  onChange={(e) => setRegGithubUsername(e.target.value)}
                  placeholder="Auto-syncs your real avatar and repository portfolio"
                  className="pl-7 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 border-2 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white font-black uppercase tracking-wider shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all text-xs mt-2"
            >
              {loading ? "Creating Account…" : "Create Developer Account →"}
            </Button>

            <div className="text-center pt-2">
              <span className="text-xs text-muted-foreground font-semibold">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-bold text-black underline uppercase"
                >
                  Sign in here
                </button>
              </span>
            </div>
          </form>
        )}

        {/* Active Session Info */}
        {user && (
          <div className="border-t-2 border-black pt-3 flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground">
              Signed in as: <strong className="text-black">@{user.username}</strong>
            </span>
            <button
              onClick={() => void logout()}
              className="font-black text-red-600 uppercase hover:underline"
            >
              Sign Out
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
