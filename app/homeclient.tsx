"use client";

import { useEffect, useState, useRef } from "react";
import BellIcon from "@/public/icons/bell";
import CheckIcon from "@/public/icons/check";
import SpinnerIcon from "@/public/icons/spinner";
import ShopBrowser from "./components/ShopBrowser";

interface HomeClientProps {
  initialShops: any[];
  userId: string | null | undefined;
}

export default function HomeClient({ initialShops, userId }: HomeClientProps) {
  const [activeTokenId, setActiveTokenId] = useState<number | string | null>(
    null,
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState<boolean>(true);

  // Modal visual overlays
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAccountOpen, setIsAccountOpen] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] =
    useState<boolean>(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string>("");
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<number | string>>(
    new Set([2, 6, 9, 11]),
  );

  const [heroCardIndex, setHeroCardIndex] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Carousel auto-rotation loop
  useEffect(() => {
    if (activeTokenId) return;
    const interval = setInterval(() => {
      setHeroCardIndex((prevIndex) => (prevIndex + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTokenId]);

  // DYNAMIC STACK STYLE GENERATOR
  const getCardStyle = (cardIdx: number) => {
    // Calculates position relative to active index: 0 = Front, 1 = Middle, 2 = Back
    const position = (cardIdx - heroCardIndex + 3) % 3;

    if (position === 0) {
      return {
        transform: "translateX(0px) translateY(0px) scale(1)",
        zIndex: 30,
        opacity: 1,
        filter: "brightness(1)",
      };
    }
    if (position === 1) {
      return {
        // Shift up and right cleanly
        transform: "translateX(24px) translateY(-20px) scale(0.95)",
        zIndex: 20,
        opacity: 0.85,
        filter: "brightness(0.9)",
      };
    }
    // position === 2 (Back card)
    return {
      // Shift further up and right
      transform: "translateX(48px) translateY(-40px) scale(0.90)",
      zIndex: 10,
      opacity: 0.5,
      filter: "brightness(0.7)",
    };
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col transition-opacity duration-300 w-full relative">
        <section
          id="heroSection"
          className="pt-12 lg:pt-40 pb-12 lg:pb-24 px-6 max-w-[1300px] mx-auto w-full flex flex-col lg:flex-row items-center justify-between relative overflow-visible gap-12 lg:gap-8 animate-slide-up"
        >
          <div className="w-full lg:w-[45%] flex flex-col items-start text-left z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-bgSurface mb-6 shadow-sm bg-bgMain">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[9px] font-bold text-brandPrimary uppercase tracking-wider">
                Smart Dining Experience
              </span>
            </div>
            <h1 className="text-5xl lg:text-[4.5rem] text-brandPrimary mb-6 leading-[1.05] font-bold tracking-tight">
              Savor the Flavors
              <br />
              of Fresh,
              <br />
              <span className="text-textMuted font-light italic">
                Authentic Cuisine.
              </span>
            </h1>
            <p className="text-textMuted text-base lg:text-lg mb-10 max-w-[420px] leading-relaxed font-medium">
              Skip the physical line. Secure your digital token remotely, track
              your wait time in real-time, and arrive exactly when your table is
              ready.
            </p>
          </div>

          {/* Carousel Side Slideshow Container */}
          <div className="w-full lg:w-[55%] h-[400px] lg:h-[600px] relative items-center justify-center hidden sm:flex">
            {!activeTokenId ? (
              <div
                id="heroImageView"
                className="relative w-full max-w-[580px] h-[450px] flex items-center justify-center mx-auto"
              >
                {/* Card index 0 */}
                <div
                  className="absolute w-full h-full bg-white rounded-2xl shadow-2xl border border-bgSurface transition-all duration-700 ease-in-out transform flex flex-col"
                  style={getCardStyle(0)}
                >
                  <div className="h-8 bg-bgMain border-b border-bgSurface flex items-center px-4 gap-1.5 shrink-0 rounded-t-2xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&auto=format&fit=crop&q=80"
                    className="w-full h-full object-cover rounded-b-2xl"
                    alt="Dining 1"
                  />
                  <div className="absolute -top-4 -right-4 xl:-top-5 xl:-right-5 bg-white px-5 py-3 xl:px-6 xl:py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-bgSurface z-10">
                    <p className="text-[8px] xl:text-[9px] font-bold text-textMuted tracking-widest uppercase mb-1">
                      Est. Wait Time
                    </p>
                    <p className="font-bold text-xl xl:text-2xl text-brandPrimary">
                      15 Mins
                    </p>
                  </div>
                  <div className="absolute -bottom-4 -left-4 xl:-bottom-5 xl:-left-5 bg-white px-4 py-3 xl:px-5 xl:py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-bgSurface flex items-center gap-3 xl:gap-4 z-10">
                    <div className="w-8 h-8 xl:w-10 xl:h-10 bg-brandPrimary rounded-full flex items-center justify-center text-white">
                      <BellIcon className="size-5" />
                    </div>
                    <div>
                      <p className="text-[8px] xl:text-[9px] font-bold text-textMuted tracking-widest uppercase mb-0.5">
                        Update
                      </p>
                      <p className="font-bold text-xs xl:text-sm text-brandPrimary leading-none">
                        Table Ready
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card index 1 */}
                <div
                  className="absolute w-full h-full bg-white rounded-2xl shadow-2xl border border-bgSurface transition-all duration-700 ease-in-out transform flex flex-col"
                  style={getCardStyle(1)}
                >
                  <div className="h-8 bg-bgMain border-b border-bgSurface flex items-center px-4 gap-1.5 shrink-0 rounded-t-2xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80"
                    className="w-full h-full object-cover rounded-b-2xl"
                    alt="Dining 2"
                  />
                  <div className="absolute -top-4 -right-4 xl:-top-5 xl:-right-5 bg-white px-5 py-3 xl:px-6 xl:py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-bgSurface z-10">
                    <p className="text-[8px] xl:text-[9px] font-bold text-textMuted tracking-widest uppercase mb-1">
                      Est. Wait Time
                    </p>
                    <p className="font-bold text-xl xl:text-2xl text-brandPrimary">
                      25 Mins
                    </p>
                  </div>
                  <div className="absolute -bottom-4 -left-4 xl:-bottom-5 xl:-left-5 bg-white px-4 py-3 xl:px-5 xl:py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-bgSurface flex items-center gap-3 xl:gap-4 z-10">
                    <div className="w-8 h-8 xl:w-10 xl:h-10 bg-brandPrimary rounded-full flex items-center justify-center text-white">
                      <SpinnerIcon className="size-6 animate-spin" />
                    </div>
                    <div>
                      <p className="text-[8px] xl:text-[9px] font-bold text-textMuted tracking-widest uppercase mb-0.5">
                        Status
                      </p>
                      <p className="font-bold text-xs xl:text-sm text-brandPrimary leading-none">
                        Queue Moving
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card index 2 */}
                <div
                  className="absolute w-full h-full bg-white rounded-2xl shadow-2xl border border-bgSurface transition-all duration-700 ease-in-out transform flex flex-col"
                  style={getCardStyle(2)}
                >
                  <div className="h-8 bg-bgMain border-b border-bgSurface flex items-center px-4 gap-1.5 shrink-0 rounded-t-2xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&auto=format&fit=crop&q=80"
                    className="w-full h-full object-cover rounded-b-2xl"
                    alt="Dining 3"
                  />
                  <div className="absolute -top-4 -right-4 xl:-top-5 xl:-right-5 bg-white px-5 py-3 xl:px-6 xl:py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-bgSurface z-10">
                    <p className="text-[8px] xl:text-[9px] font-bold text-textMuted tracking-widest uppercase mb-1">
                      Est. Wait Time
                    </p>
                    <p className="font-bold text-xl xl:text-2xl text-brandPrimary">
                      45 Mins
                    </p>
                  </div>
                  <div className="absolute -bottom-4 -left-4 xl:-bottom-5 xl:-left-5 bg-white px-4 py-3 xl:px-5 xl:py-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-bgSurface flex items-center gap-3 xl:gap-4 z-10">
                    <div className="w-8 h-8 xl:w-10 xl:h-10 bg-brandPrimary rounded-full flex items-center justify-center text-white">
                      <CheckIcon className="size-5" />
                    </div>
                    <div>
                      <p className="text-[8px] xl:text-[9px] font-bold text-textMuted tracking-widest uppercase mb-0.5">
                        Confirmed
                      </p>
                      <p className="font-bold text-xs xl:text-sm text-brandPrimary leading-none">
                        Reserved
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                id="heroActiveTokenView"
                className="absolute inset-0 flex items-center justify-center"
              >
                token got
              </div>
            )}
          </div>
        </section>

        <ShopBrowser initialShops={initialShops} userId={userId} />
      </main>

      <div
        id="toast"
        className={`fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 bg-brandPrimary text-bgMain px-6 py-3 rounded-xl text-sm font-medium shadow-2xl z-[120] transition-all duration-300 transform text-center w-max max-w-[90%] border border-white/10 ${
          isToastVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        {toastMessage}
      </div>
    </div>
  );
}
