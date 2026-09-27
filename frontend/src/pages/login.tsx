import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Github,
  Lock,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserPlus,
  LogIn,
  Layers,
  Sparkles,
  Award,
} from "lucide-react";

export default function LoginPage() {
  usePageTitle();
  const [, setLocation] = useLocation();
  const {
    user,
    oauthEnabled,
    loginWithOAuth,
    register,
    loginWithCredentials,
    loginAsDemo,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Sign in state
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regGithubUsername, setRegGithubUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setTimeout(() => setLocation("/dashboard"), 900);
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
      setTimeout(() => {
        if (regGithubUsername.trim()) {
          setLocation(`/analyze/${regGithubUsername.trim()}`);
        } else {
          setLocation("/dashboard");
        }
      }, 1000);
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
      setTimeout(() => setLocation(`/analyze/${demoUser}`), 800);
    } else {
      setError(res.error || "Demo sign in failed");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Platform Security & Access Benefits (5 cols) */}
          <div className="md:col-span-5 border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000] flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 border border-black bg-primary px-3 py-1 font-heading font-black text-xs uppercase mb-4 shadow-[2px_2px_0_#000]">
                <ShieldCheck className="w-3.5 h-3.5" />
                DevScope Security
              </div>

              <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase leading-tight tracking-tight mb-3">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed mb-6">
                Register or sign in to save your personal 30-day growth plans, track milestone progress, and generate recruiter-grade portfolio assets.
              </p>

              <div className="space-y-4">
                <div className="border-2 border-black p-3 bg-yellow-50 shadow-[2px_2px_0_#000]">
                  <p className="font-heading font-black text-xs uppercase text-primary mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Persistent 30-Day Roadmaps
                  </p>
                  <p className="text-[11px] font-medium text-black/80">
                    Check off weekly engineering tasks that save automatically to your account across visits.
                  </p>
                </div>

                <div className="border-2 border-black p-3 bg-purple-50 shadow-[2px_2px_0_#000]">
                  <p className="font-heading font-black text-xs uppercase text-purple-700 mb-1 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    Verified GitHub README Badge
                  </p>
                  <p className="text-[11px] font-medium text-black/80">
                    Generate an official SVG score badge embeddable on your GitHub profile markdown.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-black flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>PBKDF2/SHA-512 Security</span>
              <span className="text-black">100% Free Forever</span>
            </div>
          </div>

          {/* Right Column: Sign In / Register Card (7 cols) */}
          <div className="md:col-span-7 border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000] flex flex-col justify-between">
            <div>
              {/* Top Mode Tabs */}
              <div className="grid grid-cols-2 gap-2 border-2 border-black p-1 bg-gray-100 mb-6">
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
                  Register Account
                </button>
              </div>

              {/* Feedback messages */}
              {error && (
                <div className="border-2 border-black bg-red-100 p-3 mb-4 flex items-start gap-2 text-xs font-bold text-red-900 shadow-[2px_2px_0_#000]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="border-2 border-black bg-green-100 p-3 mb-4 flex items-start gap-2 text-xs font-bold text-green-900 shadow-[2px_2px_0_#000]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* TAB 1: SIGN IN */}
              {mode === "login" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider block">
                      Username or Email
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. torvalds or dev@company.com"
                        className="h-12 pl-10 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider block">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 pl-10 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 border-3 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white font-black uppercase tracking-wider shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all text-sm"
                  >
                    {loading ? "Authenticating…" : "Sign In →"}
                  </Button>

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
                    className="w-full h-11 border-2 border-black rounded-none bg-black text-white hover:bg-primary hover:text-black font-black uppercase tracking-wider shadow-[2px_2px_0_#000] flex items-center justify-center gap-2 text-xs"
                  >
                    <Github className="w-4 h-4" />
                    Sign In with GitHub OAuth
                  </Button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-muted-foreground font-semibold">
                      New to DevScope?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("register")}
                        className="font-bold text-black underline uppercase"
                      >
                        Create account
                      </button>
                    </span>
                  </div>
                </form>
              )}

              {/* TAB 2: REGISTER */}
              {mode === "register" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider block">
                        Desired Username *
                      </label>
                      <Input
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. janesmith"
                        className="h-11 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium text-xs"
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
                        placeholder="jane@company.com"
                        className="h-11 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium text-xs"
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
                        className="h-11 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium text-xs"
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
                        className="h-11 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium text-xs"
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
                        placeholder="GitHub handle (auto-syncs your real avatar & repos)"
                        className="h-11 pl-7 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 border-3 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white font-black uppercase tracking-wider shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all text-sm mt-1"
                  >
                    {loading ? "Creating Account…" : "Register Developer Account →"}
                  </Button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-muted-foreground font-semibold">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="font-bold text-black underline uppercase"
                      >
                        Sign in
                      </button>
                    </span>
                  </div>
                </form>
              )}

              {/* Quick Demo Test Profiles */}
              <div className="mt-6 pt-3 border-t border-black/15 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Recruiter 1-Click Demo:</span>
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
            </div>

            {/* Currently Logged In State */}
            {user && (
              <div className="mt-8 border-t-2 border-black pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-7 h-7 border border-black"
                  />
                  <div className="text-xs">
                    <span className="font-bold">Signed in as <strong>@{user.username}</strong></span>
                    <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 bg-yellow-200 border border-black font-black">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => void logout()}
                  className="text-xs font-black text-red-600 uppercase hover:underline"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
