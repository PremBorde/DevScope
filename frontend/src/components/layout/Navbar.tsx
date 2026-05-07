import React, { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Github, LogOut, User, History, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, oauthEnabled, login, logout } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const val = searchValue.trim();
    if (val) {
      setLocation(`/analyze/${val}`);
      setSearchValue("");
    }
  };

  const handleAnalyzeMyProfile = () => {
    if (user?.username) setLocation(`/analyze/${user.username}`);
  };

  const isActive = (path: string) => location === path || location.startsWith(path + "/");

  const navLinks = [
    { href: "/dashboard",         label: "Dashboard"                                              },
    { href: "/dashboard/history", label: "History", icon: <History className="w-3.5 h-3.5" />   },
    { href: "/compare",           label: "Compare",  icon: <Scale   className="w-3.5 h-3.5" />   },
  ];

  return (
    <nav className="w-full border-b-4 border-black bg-background px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-50 gap-3">
      {/* Left: logo + nav links */}
      <div className="flex items-center gap-5 min-w-0">
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center group-hover:-rotate-12 transition-transform duration-200">
            <span className="font-heading font-bold text-lg text-black">DS</span>
          </div>
          <span className="font-heading font-bold text-xl tracking-tight hidden sm:inline">DevScope AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold text-sm uppercase tracking-wide transition-all border-2 ${
                isActive(href)
                  ? "border-black bg-primary text-black shadow-[2px_2px_0_#000]"
                  : "border-transparent hover:border-black hover:bg-white hover:shadow-[2px_2px_0_#000]"
              }`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right: search + auth */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <form onSubmit={handleSearch} className="hidden sm:flex relative w-52 group">
          <Input
            name="username"
            value={searchValue}
            onChange={handleSearchChange}
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

        {!isLoading && (
          <>
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAnalyzeMyProfile}
                  className="hidden sm:flex h-9 px-4 text-sm font-bold border-2 border-black rounded-none bg-primary text-black hover:bg-black hover:text-white shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 transition-all uppercase tracking-wide"
                >
                  Analyze Mine
                </Button>

                <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-1.5 shadow-[3px_3px_0_0_#000]">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-6 h-6 border border-black" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="text-sm font-bold hidden md:inline">{user.username}</span>
                </div>

                <Button
                  onClick={() => void logout()}
                  size="icon"
                  variant="ghost"
                  title="Sign out"
                  className="h-9 w-9 border-2 border-black rounded-none shadow-[2px_2px_0_0_#000] hover:bg-black hover:text-white transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : oauthEnabled ? (
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
