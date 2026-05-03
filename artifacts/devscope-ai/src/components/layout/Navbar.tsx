import React from "react";
import { Link, useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    if (username.trim()) {
      setLocation(`/analyze/${username.trim()}`);
    }
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

      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch} className="hidden sm:flex relative w-64 group">
          <Input 
            name="username"
            placeholder="GitHub Username" 
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
      </div>
    </nav>
  );
}
