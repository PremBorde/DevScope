import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Github,
  Zap,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Layers,
  Award,
  Sparkles,
  UserCheck,
} from "lucide-react";

export default function LoginPage() {
  usePageTitle();
  const [, setLocation] = useLocation();
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

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    const res = await loginAsDeveloper(username.trim());
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Welcome, @${username.trim()}! Authenticated as Developer.`);
      setTimeout(() => setLocation(`/analyze/${username.trim()}`), 1000);
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
      setTimeout(() => setLocation("/dashboard"), 1000);
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
      setTimeout(() => setLocation(`/analyze/${demoUser}`), 800);
    } else {
      setError(res.error || "Demo sign in failed");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Why Sign In & Role Info (5 cols) */}
          <div className="md:col-span-5 border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000] flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 border border-black bg-primary px-3 py-1 font-heading font-black text-xs uppercase mb-4 shadow-[2px_2px_0_#000]">
                <Lock className="w-3.5 h-3.5" />
                Access Control
              </div>

              <h1 className="text-3xl sm:text-4xl font-heading font-black uppercase leading-tight tracking-tight mb-3">
                Sign In to DevScope
              </h1>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed mb-6">
                Authenticate your GitHub identity to unlock cloud persistence, personalized career roadmaps, and recruiter screen tools.
              </p>

              <div className="space-y-4">
                <div className="border-2 border-black p-3 bg-yellow-50 shadow-[2px_2px_0_#000]">
                  <p className="font-heading font-black text-xs uppercase text-primary mb-1">
                    ⚡ Developer Tier (Free)
                  </p>
                  <p className="text-[11px] font-medium text-black/80">
                    Save 30-day roadmap progress, customize README badges, and access interview prep.
                  </p>
                </div>

                <div className="border-2 border-black p-3 bg-purple-50 shadow-[2px_2px_0_#000]">
                  <p className="font-heading font-black text-xs uppercase text-purple-700 mb-1">
                    💎 Pro Tier (PAT or Verified)
                  </p>
                  <p className="text-[11px] font-medium text-black/80">
                    5,000 req/hr rate limits, private repository audits, and high-frequency AI regeneration.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-black flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>Zero plain text storage</span>
              <span className="text-black">100% Unbiased Audits</span>
            </div>
          </div>

          {/* Right Column: Interactive Sign In Box (7 cols) */}
          <div className="md:col-span-7 border-4 border-black bg-white p-8 shadow-[8px_8px_0_#000] flex flex-col justify-between">
            <div>
              {/* Tab Selector */}
              <div className="grid grid-cols-4 gap-1 border-2 border-black p-1 bg-gray-100 mb-6">
                <button
                  type="button"
                  onClick={() => setTab("dev")}
                  className={`py-2 text-xs font-heading font-black uppercase transition-all ${
                    tab === "dev"
                      ? "bg-primary text-black border border-black shadow-[2px_2px_0_#000]"
                      : "bg-transparent text-muted-foreground hover:text-black"
                  }`}
                >
                  ⚡ Dev
                </button>
                <button
                  type="button"
                  onClick={() => setTab("oauth")}
                  className={`py-2 text-xs font-heading font-black uppercase transition-all ${
                    tab === "oauth"
                      ? "bg-primary text-black border border-black shadow-[2px_2px_0_#000]"
                      : "bg-transparent text-muted-foreground hover:text-black"
                  }`}
                >
                  🐙 OAuth
                </button>
                <button
                  type="button"
                  onClick={() => setTab("pat")}
                  className={`py-2 text-xs font-heading font-black uppercase transition-all ${
                    tab === "pat"
                      ? "bg-primary text-black border border-black shadow-[2px_2px_0_#000]"
                      : "bg-transparent text-muted-foreground hover:text-black"
                  }`}
                >
                  🔑 Pro PAT
                </button>
                <button
                  type="button"
                  onClick={() => setTab("demo")}
                  className={`py-2 text-xs font-heading font-black uppercase transition-all ${
                    tab === "demo"
                      ? "bg-primary text-black border border-black shadow-[2px_2px_0_#000]"
                      : "bg-transparent text-muted-foreground hover:text-black"
                  }`}
                >
                  🚀 Demo
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

              {/* Tab 1: Instant Developer Sign In */}
              {tab === "dev" && (
                <form onSubmit={handleDevSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider block">
                      GitHub Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                        @
                      </span>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="torvalds, gaearon, or your username"
                        className="h-12 pl-9 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-medium"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      Queries GitHub's public API to authenticate your account and sync your avatar.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 border-3 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white font-black uppercase tracking-wider shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all text-sm"
                  >
                    {loading ? "Verifying Account…" : "Sign In As Developer →"}
                  </Button>
                </form>
              )}

              {/* Tab 2: GitHub OAuth */}
              {tab === "oauth" && (
                <div className="space-y-4 text-center">
                  <div className="border-2 border-black bg-zinc-50 p-4 text-left">
                    <div className="flex items-center gap-2 mb-2 font-heading font-black text-sm uppercase">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      GitHub OAuth Strategy
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      Uses standard GitHub OAuth to grant secure, read-only session credentials for your account.
                    </p>
                  </div>

                  <Button
                    onClick={loginWithOAuth}
                    className="w-full h-13 border-3 border-black rounded-none bg-black text-white hover:bg-primary hover:text-black font-black uppercase tracking-wider shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <Github className="w-5 h-5" />
                    Sign In with GitHub OAuth
                  </Button>

                  {!oauthEnabled && (
                    <p className="text-[11px] text-muted-foreground font-bold uppercase">
                      OAuth keys not set up on this instance? Switch to "⚡ Dev" tab for instant sign-in.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Personal Access Token */}
              {tab === "pat" && (
                <form onSubmit={handlePatSubmit} className="space-y-4">
                  <div className="border-2 border-black bg-purple-50 p-3">
                    <p className="text-xs font-bold text-purple-900">
                      ⚡ Unlock Pro Tier: 5,000 req/hr & Private Repo Auditing
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider block">
                      GitHub Personal Access Token (PAT)
                    </label>
                    <Input
                      type="password"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="h-12 border-2 border-black rounded-none shadow-[2px_2px_0_#000] focus-visible:ring-0 bg-white font-mono text-xs"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      Tokens are validated directly with GitHub API and signed into your secure session.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 border-3 border-black rounded-none bg-purple-400 text-black hover:bg-black hover:text-white font-black uppercase tracking-wider shadow-[4px_4px_0_#000] hover:-translate-y-0.5 transition-all text-sm"
                  >
                    {loading ? "Validating PAT…" : "Authenticate Pro Tier →"}
                  </Button>
                </form>
              )}

              {/* Tab 4: Demo Profiles */}
              {tab === "demo" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-semibold mb-2">
                    Pick a live developer profile to evaluate the platform immediately:
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { username: "torvalds", name: "Linus Torvalds", role: "Pro Tier (Kernel Maintainer)" },
                      { username: "gaearon", name: "Dan Abramov", role: "Developer (React Core)" },
                      { username: "shadcn", name: "shadcn", role: "Developer (UI Architect)" },
                    ].map((demo) => (
                      <button
                        key={demo.username}
                        type="button"
                        onClick={() => handleDemoClick(demo.username)}
                        className="flex items-center justify-between p-3 border-2 border-black bg-gray-50 hover:bg-yellow-100 transition-all text-left shadow-[2px_2px_0_#000] hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://github.com/${demo.username}.png`}
                            alt={demo.username}
                            className="w-9 h-9 border border-black rounded-none"
                          />
                          <div>
                            <p className="font-heading font-black text-xs uppercase">{demo.name}</p>
                            <p className="text-[10px] text-muted-foreground">@{demo.username} · {demo.role}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-primary flex items-center gap-1">
                          Sign In <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
