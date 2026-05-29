"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import logo from "../../public/logo.jpg";
import { logout } from "../../backend/actions"; // Kept server action logout

import {
  Bell,
  Heart,
  Menu,
  Search,
  Store,
  Ticket,
  User,
  X,
  QrCode,
  ChevronRight,
  Settings,
  Mic,
  Shield,
  ArrowUp,
  Bot,
} from "lucide-react";

// Flexible type definition matching the data returned from your session file
type NavBarProps = {
  initialUser: {
    name: string;
    email: string | null;
    role: string;
    brand: string | null;
    avatar?: string;
  } | null;
};

export default function NavBar({ initialUser }: NavBarProps) {
  const [mounted, setMounted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Initialize the state directly with the server-provided prop
  const [user, setUser] = useState<any>(initialUser);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync state if the server prop dynamically changes
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    if (mobileMenu || searchOpen || accountOpen || aiOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenu, searchOpen, accountOpen, aiOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Desktop Header */}
      <header
        className={`hidden min-[1130px]:flex fixed top-0 left-0 w-full z-50 items-center justify-between transition-all duration-500 ${
          scrolled ? "px-[6vw] pt-3" : "px-8 pt-3"
        }`}
      >
        {/* Left */}
        <div className="flex-1 flex justify-start">
          <Link
            href="/"
            className={`flex items-center gap-1 transition-all duration-500 rounded-full ${
              scrolled
                ? "bg-white/70 backdrop-blur-md px-4 py-2 border border-[#d6d6d5] shadow-sm"
                : ""
            }`}
          >
            <Image
              src={logo}
              width={50}
              height={50}
              className="size-10 rounded-md"
              alt="logo"
            />
            <span className="text-xl text-[#1d2846] jost font-extrabold">
              MyanPace
            </span>
          </Link>
        </div>

        {/* Center */}
        <div className="flex items-center gap-4">
          <nav className="bg-[#1d2846]/95 backdrop-blur-xl text-white rounded-full px-8 py-3 flex items-center gap-6 shadow-2xl border border-white/10">
            <Link
              href="/shops"
              className="text-sm font-medium hover:text-[#d6d6d5] transition-colors"
            >
              Shops
            </Link>
            <Link
              href="/token"
              className="text-sm font-medium hover:text-[#d6d6d5] transition-colors"
            >
              Token
            </Link>
            <Link
              href="/community"
              className="text-sm font-medium hover:text-[#d6d6d5] transition-colors"
            >
              Community
            </Link>
            <div className="w-px h-5 bg-white/20" />
            <Link
              href="/support"
              className="text-sm font-medium hover:text-[#d6d6d5] transition-colors"
            >
              Support
            </Link>
            <button
              onClick={() => setAccountOpen(true)}
              className="text-sm font-medium hover:text-[#d6d6d5] transition-colors"
            >
              Account
            </button>
            <div className="w-px h-5 bg-white/20" />
            <button className="hover:text-[#d6d6d5] transition-colors">
              <Heart className="w-5 h-5" />
            </button>
            <button className="hover:text-[#d6d6d5] transition-colors relative">
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="bg-white/10 border border-white/20 rounded-full px-4 py-2 flex items-center gap-3 hover:bg-white/20 transition-colors"
            >
              <Search className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/60">Search venues...</span>
            </button>
          </nav>

          {/* PaceAI Button */}
          <button
            onClick={() => setAiOpen(true)}
            className="w-[60px] h-[60px] rounded-full bg-[#1d2846] relative overflow-hidden shadow-[0_4px_15px_rgba(29,40,70,0.3)] flex items-center justify-center group hover:scale-105 transition-all"
          >
            <div className="absolute inset-0 animate-spin-slow bg-[conic-gradient(from_0deg,transparent_0%,rgba(255,255,255,0.05)_25%,transparent_50%,rgba(29,40,70,0.5)_75%,transparent_100%)]" />
            <div className="flex items-center gap-[2px] relative z-10">
              {[1, 2, 3, 4, 5].map((bar) => (
                <span
                  key={bar}
                  className="w-[2px] bg-white rounded-full animate-wave"
                  style={{
                    height: `${10 + (bar % 3) * 6}px`,
                    animationDelay: `${bar * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Right - Profile Trigger / Login Switch */}
        <div className="flex-1 flex justify-end">
          <div className="bg-white/70 backdrop-blur-md px-3 py-2 rounded-full border border-[#d6d6d5] shadow-sm flex items-center gap-1">
            {user ? (
              <>
                <span className="text-sm font-bold text-[#1d2846]">
                  {user.name ?? "User"}
                </span>
                <button
                  onClick={() => setAccountOpen(true)}
                  className="w-9 h-9 rounded-full bg-[#1d2846] text-white flex items-center justify-center overflow-hidden border border-[#d6d6d5]"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-bold text-[#1d2846] px-2"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="min-[1130px]:hidden fixed top-0 left-0 w-full z-50 bg-[#f3f4f5]/95 backdrop-blur-md border-b border-[#d6d6d5] px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logo}
              width={50}
              height={50}
              className="size-9 rounded-md"
              alt="logo"
            />
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#949492]">
                MyanPace
              </p>
              <p className="text-xs font-bold text-[#1d2846]">
                Yangon, Myanmar
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Pace AI */}
          <button
            onClick={() => setAiOpen(true)}
            className="bg-[#1d2846] text-white rounded-2xl px-4 h-8 flex items-center gap-2 shadow-md"
          >
            <div className="flex items-center gap-[2px]">
              {[1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className="w-[2px] bg-white rounded-full animate-wave"
                  style={{
                    height: `${8 + (bar % 2) * 4}px`,
                    animationDelay: `${bar * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] font-bold tracking-wider">PaceAI</span>
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center text-[#1d2846]"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => setMobileMenu(true)}
            className="w-9 h-9 flex items-center justify-center text-[#1d2846]"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full min-[1130px]:hidden bg-white/95 backdrop-blur-xl border-t border-[#d6d6d5] flex items-center justify-around px-2 pt-2 pb-6 h-[75px] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <Link
          href="/shops"
          className="flex flex-col items-center gap-1 text-[#1d2846]"
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        <Link
          href="/token"
          className="flex flex-col items-center gap-1 text-[#949492]"
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] font-medium">Token</span>
        </Link>
        <button className="flex flex-col items-center gap-1 text-[#949492]">
          <QrCode className="w-5 h-5" />
          <span className="text-[10px] font-medium">QR Scan</span>
        </button>
        <Link
          href="/favorites"
          className="flex flex-col items-center gap-1 text-[#949492]"
        >
          <Heart className="w-5 h-5" />
          <span className="text-[10px] font-medium">Favorite</span>
        </Link>
        <button
          onClick={() => setAccountOpen(true)}
          className="flex flex-col items-center gap-1 text-[#949492]"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Account</span>
        </button>
      </nav>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 bg-[#f3f4f5] z-[100] flex flex-col animate-in fade-in">
          <div className="px-5 py-4 border-b border-[#d6d6d5] bg-white flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(false)}
              className="w-10 h-10 rounded-xl bg-[#f3f4f5] flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#1d2846]" />
            </button>
            <div className="flex-1 bg-[#f3f4f5] border border-[#d6d6d5] rounded-xl px-4 py-3 flex items-center gap-3">
              <Search className="w-4 h-4 text-[#949492]" />
              <input
                autoFocus
                placeholder="Search venues..."
                className="bg-transparent outline-none w-full text-sm font-medium text-[#1d2846] placeholder:text-[#949492]"
              />
            </div>
          </div>
          <div className="flex-1 p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#949492] mb-4">
              Suggested Spots
            </h3>
            <div className="bg-white rounded-2xl border border-[#d6d6d5] p-5 text-center text-sm text-[#949492]">
              Search results will appear here.
            </div>
          </div>
        </div>
      )}

      {/* Account Overlay */}
      {accountOpen && (
        <div className="fixed inset-0 bg-[#f3f4f5] z-[100] flex flex-col">
          <div className="px-5 py-4 bg-white border-b border-[#d6d6d5] flex items-center justify-between">
            <h2 className="font-bold text-lg text-[#1d2846]">
              Account Profile
            </h2>
            <button
              onClick={() => setAccountOpen(false)}
              className="w-9 h-9 rounded-full bg-[#f3f4f5] flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#1d2846]" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto pb-28">
            <div className="bg-white rounded-3xl border border-[#d6d6d5] p-5 flex items-center gap-4 shadow-sm mb-6">
              <div className="w-16 h-16 rounded-full bg-[#1d2846] text-white flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1d2846]">
                  {user?.name ?? "Guest User"}
                </h3>
                <p className="text-xs font-medium text-[#949492] mt-1">
                  {user
                    ? `${user.role || "Standard"} Member`
                    : "Login to continue"}
                </p>
                {user?.email && (
                  <p className="text-[11px] text-[#949492] font-mono mt-0.5">
                    {user.email}
                  </p>
                )}
                {user?.brand && (
                  <span className="inline-block mt-2 text-[10px] bg-[#1d2846]/10 text-[#1d2846] px-2 py-0.5 rounded-md font-bold">
                    Brand: {user.brand}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#949492] mb-3 pl-1">
                  Settings
                </h3>
                <div className="bg-white rounded-2xl border border-[#d6d6d5] overflow-hidden shadow-sm">
                  <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#f3f4f5] transition-colors">
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-[#949492]" />
                      <span className="font-medium text-sm text-[#1d2846]">
                        Preferences
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#949492]" />
                  </button>
                </div>
              </div>

              {user ? (
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-white border border-[#d6d6d5] text-red-600 font-medium hover:bg-red-50 transition-colors shadow-sm"
                  >
                    Log Out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="block w-full text-center py-4 rounded-2xl bg-[#1d2846] text-white font-bold hover:opacity-90 transition-opacity"
                >
                  Login / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Overlay */}
      {aiOpen && (
        <div className="fixed inset-0 z-[200] bg-[#f3f4f5]/80 backdrop-blur-xl flex flex-col">
          <div className="w-full bg-white/60 backdrop-blur-lg border-b border-white/30 px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-[2px] text-[#1d2846]">
                {[1, 2, 3, 4].map((bar) => (
                  <span
                    key={bar}
                    className="w-[3px] bg-[#1d2846] rounded-full animate-wave"
                    style={{ height: `${10 + (bar % 2) * 6}px` }}
                  />
                ))}
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#1d2846]">
                  PaceAI Interface
                </h3>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#1d2846]/70 font-medium">
                  Intelligent Dining Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setAiOpen(false)}
              className="w-10 h-10 rounded-full bg-white/50 border border-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#1d2846]" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-white/50 backdrop-blur-md border border-white/50 shadow-xl flex items-center justify-center mb-8">
              <Bot className="w-9 h-9 text-[#1d2846]" />
            </div>
            <h2 className="text-4xl font-bold text-[#1d2846] text-center tracking-tight mb-4">
              Call &quot;PacePace&quot; to Chat
            </h2>
            <p className="text-center text-[#1d2846]/80 font-medium max-w-2xl mb-10">
              Type your message below to instruct our intelligent AI formally
              with priority reservations, queue management, or customized dining
              curation.
            </p>

            <div className="w-full max-w-2xl bg-white/60 backdrop-blur-lg border border-white/50 rounded-2xl p-2 flex items-center shadow-xl">
              <div className="px-4 text-[#1d2846]/70">
                <Mic className="w-5 h-5" />
              </div>
              <input
                placeholder="Type your instruction or message..."
                className="flex-1 bg-transparent outline-none py-4 text-[#1d2846] font-semibold placeholder:text-[#1d2846]/60"
              />
              <button className="w-12 h-12 rounded-xl bg-[#1d2846] text-white flex items-center justify-center">
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-2 text-sm text-[#1d2846]">
                <Mic className="w-4 h-4" /> Voice Active
              </div>
              <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-2 text-sm text-[#1d2846]">
                <Shield className="w-4 h-4" /> Secure Context
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[150] bg-black/40 min-[1130px]:hidden">
          <div className="absolute right-0 top-0 h-full w-[300px] bg-white shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xl font-bold text-[#1d2846]">Menu</h2>
              <button
                onClick={() => setMobileMenu(false)}
                className="w-10 h-10 rounded-xl bg-[#f3f4f5] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#1d2846]" />
              </button>
            </div>
            <div className="flex flex-col gap-5">
              <Link
                href="/shops"
                className="text-[#1d2846] font-semibold text-lg"
              >
                Shops
              </Link>
              <Link
                href="/token"
                className="text-[#1d2846] font-semibold text-lg"
              >
                Token
              </Link>
              <Link
                href="/community"
                className="text-[#1d2846] font-semibold text-lg"
              >
                Community
              </Link>
              <Link
                href="/support"
                className="text-[#1d2846] font-semibold text-lg"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes wave {
          0%,
          100% {
            transform: scaleY(0.4);
            opacity: 0.6;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        .animate-wave {
          animation: wave 1.2s ease-in-out infinite;
        }
        @keyframes spin-slow {
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </>
  );
}
