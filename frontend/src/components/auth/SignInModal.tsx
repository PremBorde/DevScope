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
  Zap,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Lock,
} from "lucide-react";

export default function SignInModal() {
  const [open, setOpen] = useState(false);
  const {
    user,
    oauthEnabled,
    loginWithOAuth,
    loginAsDeveloper,
    loginWithPAT,
    loginAsDemo,
    logout,
  } = useAuth();

  const [tab, setTab] = useState<"dev" | "oauth" | "pat" | "demo">("dev");
  const [username, setUsername] = useState("");
  const [pat, setPat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    return authModal.subscribe((shouldOpen) => {
      setOpen(shouldOpen);
      if (shouldOpen) {
        setError(null);
        setSuccessMsg(null);
      }
    });
  }, []);

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    const res = await loginAsDeveloper(username.trim());
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Welcome, @${username.trim()}! Authenticated as Developer.`);
      setTimeout(() => setOpen(false), 1200);
    } else {
      setError(res.error || "Failed to sign in");
    }
  };

  const handlePatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pat.trim()) return;
    setLoading(true);
    setError(null);

    const res = await loginWithPAT(pat.trim());
    setLoading(false);

    if (res.success) {
      setSuccessMsg("Pro Tier verified! Unlimited AI rate limits & private repo access enabled.");
      setTimeout(() => setOpen(false), 1200);
    } else {
      setError(res.error || "Invalid Personal Access Token");
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
        <DialogHeader className="space-y-1 text-left border-b-2 border-black pb-4">
          <div className="flex items-center justify-between">
            <span className="inline-block border border-black bg-primary px-2.5 py-0.5 text-[10px] font-heading font-black uppercase tracking-wider">
              Authentication & Authorization
            </span>
            {user && (
              <span className="text-[10px] font-bold uppercase bg-green-100 text-green-800 border border-black px-2 py-0.5">
                ● Signed In (@{user.username})
              </span>
            )}
          </div>
          <DialogTitle className="font-heading font-black text-2xl uppercase tracking-tight">
            Sign In to DevScope
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            Save custom 30-day roadmaps, unlock recruiter technical screens, and manage embeddable badges.
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

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 border-2 border-black p-1 bg-gray-100">
          <button
            type="button"
            onClick={() => setTab("dev")}
            className={`py-1.5 text-[11px] font-heading font-black uppercase transition-all ${
              tab === "dev"
                ? "bg-primary text-black border border-black shadow-[1.5px_1.5px_0_#000]"
                : "bg-transparent text-muted-foreground hover:text-black"
            }`}
          >
            ⚡ Dev
          </button>
          <button
            type="button"
            onClick={() => setTab("oauth")}
            className={`py-1.5 text-[11px] font-heading font-black uppercase transition-all ${
              tab === "oauth"
                ? "bg-primary text-black border border-black shadow-[1.5px_1.5px_0_#000]"
                : "bg-transparent text-muted-foreground hover:text-black"
            }`}
          >
            🐙 OAuth
          </button>
          <button
            type="button"
            onClick={() => setTab("pat")}
            className={`py-1.5 text-[11px] font-heading font-black uppercase transition-all ${
              tab === "pat"
                ? "bg-primary text-black border border-black shadow-[1.5px_1.5px_0_#000]"
                : "bg-transparent text-muted-foreground hover:text-black"
            }`}
          >
            🔑 Pro PAT
          </button>
          <button
            type="button"
            onClick={() => setTab("demo")}
            className={`py-1.5 text-[11px] font-heading font-black uppercase transition-all ${
              tab === "demo"
                ? "bg-primary text-black border border-black shadow-[1.5px_1.5px_0_#000]"
                : "bg-transparent text-muted-foreground hover:text-black"
            }`}
          >
            🚀 Demo
          </button>
        </div>

        {/* Tab 1: Instant Developer Sign In */}
        {tab === "dev" && (
          <form onSubmit={handleDevSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider block">
                Your Public GitHub Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                  @
                </span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. torvalds or your username"
                  className="pl-8 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold">
                Verifies against official GitHub API. Automatically loads your avatar & public metrics. No password needed.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 border-2 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white font-black uppercase tracking-wider shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              {loading ? "Verifying GitHub Profile…" : "Sign In As Developer →"}
            </Button>
          </form>
        )}

        {/* Tab 2: GitHub OAuth (Official) */}
        {tab === "oauth" && (
          <div className="space-y-4 pt-1 text-center">
            <div className="border-2 border-black bg-zinc-50 p-4 text-left">
              <div className="flex items-center gap-2 mb-2 font-heading font-black text-sm uppercase">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Official GitHub OAuth
              </div>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Connect your account via GitHub's secure OAuth flow. Grants read-only access to verify identity and enable cloud synchronization.
              </p>
            </div>

            <Button
              onClick={loginWithOAuth}
              className="w-full h-12 border-3 border-black rounded-none bg-black text-white hover:bg-primary hover:text-black font-black uppercase tracking-wider shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Github className="w-5 h-5" />
              Sign In with GitHub OAuth
            </Button>

            {!oauthEnabled && (
              <p className="text-[10px] text-muted-foreground font-bold uppercase">
                Tip: If OAuth app keys are not configured, use the "⚡ Dev" tab for instant sign-in.
              </p>
            )}
          </div>
        )}

        {/* Tab 3: Personal Access Token (Pro Tier) */}
        {tab === "pat" && (
          <form onSubmit={handlePatSubmit} className="space-y-4 pt-1">
            <div className="border-2 border-black bg-purple-50 p-3">
              <span className="text-[10px] font-black uppercase bg-purple-200 text-purple-900 border border-black px-1.5 py-0.2 mb-1 inline-block">
                ⚡ Pro Tier Unlock
              </span>
              <p className="text-xs text-black/80 font-medium">
                Using a GitHub PAT grants <strong>5,000 requests/hour</strong> and lets DevScope evaluate private repositories safely.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider block">
                GitHub Token (Classic or Fine-Grained)
              </label>
              <Input
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-mono text-xs"
                required
              />
              <p className="text-[10px] text-muted-foreground font-semibold">
                Requires read:user scope. Tokens are verified with GitHub and never stored in plain text.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 border-2 border-black rounded-none bg-purple-400 text-black hover:bg-black hover:text-white font-black uppercase tracking-wider shadow-[3px_3px_0_#000] hover:-translate-y-0.5 transition-all"
            >
              {loading ? "Validating Token…" : "Unlock Pro With PAT →"}
            </Button>
          </form>
        )}

        {/* Tab 4: 1-Click Demo Profiles */}
        {tab === "demo" && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground font-semibold">
              Select a legendary maintainer profile to instantly test the platform with full permissions:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { username: "torvalds", name: "Linus Torvalds", role: "Pro Tier (Kernel Fellow)" },
                { username: "gaearon", name: "Dan Abramov", role: "Developer (React Core)" },
                { username: "shadcn", name: "shadcn", role: "Developer (UI Architect)" },
              ].map((demo) => (
                <button
                  key={demo.username}
                  type="button"
                  onClick={() => handleDemoClick(demo.username)}
                  className="flex items-center justify-between p-2.5 border-2 border-black bg-gray-50 hover:bg-yellow-100 transition-all text-left shadow-[2px_2px_0_#000] hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={`https://github.com/${demo.username}.png`}
                      alt={demo.username}
                      className="w-8 h-8 border border-black rounded-none"
                    />
                    <div>
                      <p className="font-heading font-black text-xs uppercase">{demo.name}</p>
                      <p className="text-[10px] text-muted-foreground">@{demo.username} · {demo.role}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-primary">Login →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Session Info / Sign Out Option */}
        {user && (
          <div className="border-t-2 border-black pt-3 flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground">
              Role: <strong className="text-black uppercase">{user.role}</strong>
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
