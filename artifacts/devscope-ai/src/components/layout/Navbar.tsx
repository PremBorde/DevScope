import React from "react";
import { Link, useLocation } from "wouter";
import { Search, Github, LogOut, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [, setLocation] = useLocation();
  const { user, isLoading, oauthEnabled, login, logout } = useAuth();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    if (username.trim()) {
      setLocation(`/analyze/${username.trim()}`);
    }
  };

  const handleAnalyzeMyProfile = () => {
    if (user?.username) {
      setLocation(`/analyze/${user.username}`);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="w-full border-b-4 border-black bg-background px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center group-hover:-rotate-12 transition-transform duration-200">
            <span className="font-heading font-bold text-lg text-black">DS</span>
          </div>
          <span className="font-heading font-bold text-xl tracking-tight">DevScope AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-sm uppercase tracking-wide hover:text-primary transition-colors">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick search bar */}
        <form onSubmit={handleSearch} className="hidden sm:flex relative w-56 group">
          <Input
            name="username"
            placeholder="GitHub username…"
            className="pr-10 border-2 border-black rounded-none shadow-[2px_2px_0_0_#000] focus-visible:ring-0 focus-visible:shadow-[4px_4px_0_0_#000] transition-all bg-white"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="absolute right-0 top-0 h-full rounded-none hover:bg-transparent"
          >
            <Search className="w-4 h-4" />
          </Button>
        </form>

        {/* Auth area */}
        {!isLoading && (
          <>
            {user ? (
              /* ── Logged-in state ── */
              <div className="flex items-center gap-2">
                {/* Analyze my profile */}
                <Button
                  onClick={handleAnalyzeMyProfile}
                  className="hidden sm:flex h-9 px-4 text-sm font-bold border-2 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 transition-all uppercase tracking-wide"
                >
                  Analyze Mine
                </Button>

                {/* Avatar + username */}
                <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 shadow-[3px_3px_0_0_#000]">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-6 h-6 border border-black rounded-none"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="text-sm font-bold hidden md:inline">{user.username}</span>
                </div>

                {/* Logout */}
                <Button
                  onClick={handleLogout}
                  size="icon"
                  variant="ghost"
                  title="Sign out"
                  className="h-9 w-9 border-2 border-black rounded-none shadow-[2px_2px_0_0_#000] hover:bg-black hover:text-white transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : oauthEnabled ? (
              /* ── Logged-out state (OAuth available) ── */
              <Button
                onClick={login}
                className="h-9 px-4 text-sm font-bold border-2 border-black rounded-none bg-white text-black hover:bg-black hover:text-white shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide"
              >
                <Github className="w-4 h-4" />
                <span className="hidden sm:inline">Login with GitHub</span>
                <span className="sm:hidden">Login</span>
              </Button>
            ) : null}
          </>
        )}
      </div>
    </nav>
  );
}
