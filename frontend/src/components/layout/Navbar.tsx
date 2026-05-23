import React, { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Github, LogOut, User, History, Scale, Menu, X, LayoutDashboard, GitCompare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, oauthEnabled, login, logout } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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
    { href: "/dashboard",         label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/dashboard/history", label: "History",   icon: <History         className="w-4 h-4" /> },
    { href: "/compare",           label: "Compare",   icon: <GitCompare      className="w-4 h-4" /> },
  ];

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className="w-full border-b-4 border-black bg-background px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-50 gap-3">
        {/* Left: logo + desktop nav links */}
        <div className="flex items-center gap-5 min-w-0">
          <Link href="/" onClick={closeMenu} className="flex items-center gap-2 group flex-shrink-0">
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

        {/* Right: search + auth + hamburger */}
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
                    className="hidden sm:flex h-9 w-9 border-2 border-black rounded-none shadow-[2px_2px_0_0_#000] hover:bg-black hover:text-white transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : oauthEnabled ? (
                <Button
                  onClick={login}
                  className="hidden sm:flex h-9 px-4 text-sm font-bold border-2 border-black rounded-none bg-white text-black hover:bg-black hover:text-white shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 transition-all items-center gap-2 uppercase tracking-wide"
                >
                  <Github className="w-4 h-4" />
                  Login with GitHub
                </Button>
              ) : null}
            </>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden h-9 w-9 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000] bg-background hover:bg-black hover:text-white transition-all"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] z-40 bg-background border-t-2 border-black flex flex-col">
          {/* Search */}
          <div className="px-4 pt-4 pb-2">
            <form
              onSubmit={(e) => { handleSearch(e); closeMenu(); }}
              className="flex relative w-full"
            >
              <Input
                name="username"
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="GitHub username…"
                className="pr-10 border-2 border-black rounded-none shadow-[2px_2px_0_0_#000] focus-visible:ring-0 bg-white"
              />
              <Button type="submit" size="icon" variant="ghost" className="absolute right-0 top-0 h-full rounded-none">
                <Search className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Nav links */}
          <div className="flex flex-col px-4 gap-2 py-2">
            {navLinks.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 font-bold text-sm uppercase tracking-wide border-2 transition-all ${
                  isActive(href)
                    ? "border-black bg-primary text-black shadow-[3px_3px_0_#000]"
                    : "border-black bg-white hover:bg-primary hover:shadow-[3px_3px_0_#000]"
                }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </div>

          {/* Auth section */}
          {!isLoading && (
            <div className="flex flex-col px-4 gap-2 pt-2 border-t-2 border-black mt-2">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-2 border-black bg-white shadow-[3px_3px_0_#000]">
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt={user.username} className="w-7 h-7 border border-black" />
                      : <User className="w-5 h-5" />}
                    <span className="font-bold text-sm">{user.username}</span>
                  </div>
                  <button
                    onClick={() => { handleAnalyzeMyProfile(); closeMenu(); }}
                    className="flex items-center gap-3 px-4 py-3 font-bold text-sm uppercase tracking-wide border-2 border-black bg-primary hover:bg-black hover:text-white shadow-[3px_3px_0_#000] transition-all"
                  >
                    <User className="w-4 h-4" />
                    Analyze My Profile
                  </button>
                  <button
                    onClick={() => { void logout(); closeMenu(); }}
                    className="flex items-center gap-3 px-4 py-3 font-bold text-sm uppercase tracking-wide border-2 border-black bg-white hover:bg-black hover:text-white shadow-[3px_3px_0_#000] transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : oauthEnabled ? (
                <button
                  onClick={() => { login(); closeMenu(); }}
                  className="flex items-center gap-3 px-4 py-3 font-bold text-sm uppercase tracking-wide border-2 border-black bg-white hover:bg-black hover:text-white shadow-[3px_3px_0_#000] transition-all"
                >
                  <Github className="w-4 h-4" />
                  Login with GitHub
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </>
  );
}
