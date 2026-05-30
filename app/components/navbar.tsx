"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
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
  Globe,
} from "lucide-react";
import { AiOverlay } from "./aioverlay";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("Eng");

  const closeQrScanner = async () => {
    setQrScanOpen(false);
    setScannerReady(false);
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  };

  const openQrScanner = async () => {
    setQrScanOpen(true);
    setScannerReady(false);
    const { Html5QrcodeScanner } = await import("html5-qrcode");
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-nav",
        { fps: 10, qrbox: 220, aspectRatio: 1 },
        false,
      );
      scannerRef.current = scanner;
      scanner.render(
        (text) => {
          void closeQrScanner();
          const trimmed = text.trim();
          const match = trimmed.match(/\/shops\/([^/?#]+)/);
          const shopId = match ? match[1] : trimmed;
          if (!shopId) {
            toast.error("Could not read shop code.");
            return;
          }
          router.push(`/shops/${shopId}`);
        },
        () => {},
      );
      setScannerReady(true);
    }, 100);
  };

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

  // Set the search input automatically if loading via URL
  useEffect(() => {
    if (searchParams) {
      const q = searchParams.get("search");
      if (q) setSearchInput(q);
    }
  }, [searchParams]);

  // Sync state if the server prop dynamically changes
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    if (mobileMenu || searchOpen || accountOpen || aiOpen || qrScanOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenu, searchOpen, accountOpen, aiOpen, qrScanOpen]);

  if (!mounted) return null;

  // Manager dashboard owns its own header — hide the global navbar there.
  if (pathname === "/m" || pathname?.startsWith("/m/")) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchOpen(false);
      router.push(`/shops?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

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
          <nav className="bg-[#1d2846]/95 backdrop-blur-xl text-white rounded-full px-8 py-2 flex items-center gap-6 shadow-2xl border border-white/10">
            <Link
              href="/shops"
              className="text-sm font-medium hover:text-[#d6d6d5] transition-colors"
            >
              Shops
            </Link>
            <Link
              href="/"
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
              href="/about"
              className="text-sm font-medium hover:text-[#d6d6d5] transition-colors"
            >
              About
            </Link>
            <Link
              href="/support"
              className="text-sm font-medium hover:text-[#d6d6d5] transition-colors"
            >
              Support
            </Link>
            <div className="w-px h-5 bg-white/20" />
            <Link
              href="/"
              className="hover:text-[#d6d6d5] transition-colors"
              aria-label="Favorites"
            >
              <Heart className="w-5 h-5" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="hover:text-[#d6d6d5] transition-colors flex items-center gap-1"
                aria-label="Language"
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm font-medium">{currentLang}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute top-full right-0 mt-5 w-36 bg-white rounded-xl shadow-lg border border-[#d6d6d5] py-2 z-50 text-[#1d2846] flex flex-col overflow-hidden">
                  <button
                    onClick={() => { setCurrentLang('Eng'); setLangMenuOpen(false); }}
                    className={`px-4 py-2 text-sm text-left hover:bg-[#f3f4f5] transition-colors ${currentLang === 'Eng' ? 'font-bold' : 'font-medium'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => { setCurrentLang('Mm'); setLangMenuOpen(false); }}
                    className={`px-4 py-2 text-sm text-left hover:bg-[#f3f4f5] transition-colors ${currentLang === 'Mm' ? 'font-bold' : 'font-medium'}`}
                  >
                    Myanmar (Mm)
                  </button>
                </div>
              )}
            </div>
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
            className="cursor-pointer w-[55px] h-[55px] rounded-full bg-[#1d2846] relative overflow-hidden shadow-[0_4px_15px_rgba(29,40,70,0.3)] flex items-center justify-center group hover:scale-105 transition-all"
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
      <header className="min-[1130px]:hidden fixed top-0 left-0 w-full z-50 bg-[#f3f4f5]/95 backdrop-blur-md border-b border-[#d6d6d5] px-5 py-3 flex items-center justify-between shadow-sm relative">
        <div className="flex items-center z-10">
          <Link href="/" className="flex items-center">
            <Image
              src={logo}
              width={50}
              height={50}
              className="size-9 rounded-md"
              alt="logo"
            />
          </Link>
        </div>

        {/* Dynamic Island - PaceAI */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setAiOpen(true)}
            className="bg-[#1d2846] text-white rounded-full px-5 h-9 flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
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
            <span className="text-xs font-bold tracking-wider">PaceAI</span>
          </button>
        </div>

        <div className="flex items-center gap-2 z-10">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 flex items-center justify-center text-[#1d2846]"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <div className="relative flex items-center">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="w-9 h-9 flex items-center justify-center text-[#1d2846]"
            >
              <Globe className="w-5 h-5" />
            </button>
            {langMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-[#d6d6d5] py-2 z-50 flex flex-col overflow-hidden text-[#1d2846]">
                <button
                  onClick={() => { setCurrentLang('Eng'); setLangMenuOpen(false); }}
                  className={`px-4 py-2 text-sm text-left hover:bg-[#f3f4f5] transition-colors ${currentLang === 'Eng' ? 'font-bold' : 'font-medium'}`}
                >
                  English
                </button>
                <button
                  onClick={() => { setCurrentLang('Mm'); setLangMenuOpen(false); }}
                  className={`px-4 py-2 text-sm text-left hover:bg-[#f3f4f5] transition-colors ${currentLang === 'Mm' ? 'font-bold' : 'font-medium'}`}
                >
                  Myanmar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full min-[1130px]:hidden bg-white/95 backdrop-blur-xl border-t border-[#d6d6d5] grid grid-cols-5 items-center justify-items-center pt-2 pb-6 h-[75px] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <Link
          href="/shops"
          className="flex flex-col items-center gap-1 text-[#1d2846]"
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-medium">Shop</span>
        </Link>
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-[#949492]"
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] font-medium">Token</span>
        </Link>
        <button
          onClick={openQrScanner}
          className="flex flex-col items-center gap-1 text-[#949492]"
        >
          <QrCode className="w-5 h-5" />
          <span className="text-[10px] font-medium">QR Scan</span>
        </button>
        <Link
          href="/"
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
            <form onSubmit={handleSearchSubmit} className="flex-1 bg-[#f3f4f5] border border-[#d6d6d5] rounded-xl px-4 py-3 flex items-center gap-3">
              <Search className="w-4 h-4 text-[#949492]" />
              <input
                autoFocus
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search venues..."
                className="bg-transparent outline-none w-full text-sm font-medium text-[#1d2846] placeholder:text-[#949492]"
              />
            </form>
          </div>
          <div className="flex-1 p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#949492] mb-4">
              Suggested Spots
            </h3>
            {searchInput.trim() ? (
              <button 
                onClick={(e) => handleSearchSubmit(e as any)}
                className="bg-white w-full rounded-2xl border border-[#d6d6d5] p-5 text-center text-sm text-[#1d2846] hover:bg-gray-50 transition font-bold shadow-sm"
              >
                Search for "{searchInput}"
              </button>
            ) : (
              <div className="bg-white rounded-2xl border border-[#d6d6d5] p-5 text-center text-sm text-[#949492]">
                Start typing to search...
              </div>
            )}
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
              {/* Preferences — disabled until backed by real settings
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
              */}

              {user ? (
                <form
                  action={async () => {
                    try {
                      localStorage.removeItem("qm_my_tokens");
                      localStorage.removeItem("qm_dismissed_tokens");
                    } catch {}
                    await logout();
                  }}
                >
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
                  onClick={() => setAccountOpen(false)}
                  className="block w-full text-center py-4 rounded-2xl bg-[#1d2846] text-white font-bold hover:opacity-90 transition-opacity"
                >
                  Login / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Overlay */}
      {qrScanOpen && (
        <div className="fixed inset-0 bg-[#f3f4f5] z-[100] flex flex-col">
          <div className="px-5 py-4 bg-white border-b border-[#d6d6d5] flex items-center justify-between">
            <h2 className="font-bold text-lg text-[#1d2846]">Scan Shop QR</h2>
            <button
              onClick={closeQrScanner}
              className="w-9 h-9 rounded-full bg-[#f3f4f5] flex items-center justify-center"
              aria-label="Close scanner"
            >
              <X className="w-5 h-5 text-[#1d2846]" />
            </button>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            <p className="text-sm text-[#949492] mb-4 text-center">
              Point your camera at the shop's QR code to open it.
            </p>
            <div
              id="qr-reader-nav"
              className="bg-white rounded-2xl border border-[#d6d6d5] overflow-hidden shadow-sm"
            />
            {!scannerReady && (
              <p className="text-xs text-[#949492] mt-4 text-center">
                Starting camera…
              </p>
            )}
          </div>
        </div>
      )}

      <AiOverlay aiOpen={aiOpen} setAiOpen={setAiOpen} />

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