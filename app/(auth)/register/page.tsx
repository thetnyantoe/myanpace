"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RegisterForm } from "./form";

export default function RegisterPage() {
  const [scrolled, setScrolled] = useState(false);

  // Sync scroll detection for header animation
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Global CSS Dependencies */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&family=Helvetica&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />

      {/* Styled Override Directives */}
      <style jsx global>{`
        body {
          background-color: #f3f4f5;
          color: #1d2846;
          font-family: "Jost", "Helvetica", sans-serif;
          -webkit-tap-highlight-color: transparent;
          scroll-behavior: smooth;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #d6d6d5;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #949492;
        }

        .glass-nav {
          background: rgba(29, 40, 70, 0.95);
          backdrop-filter: blur(12px);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 24px);
        }
        .pt-safe {
          padding-top: env(safe-area-inset-top, 16px);
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #f3f4f5 inset !important;
          -webkit-text-fill-color: #1d2846 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .strength-bar {
          transition: all 0.3s ease-in-out;
        }
      `}</style>

      <div className="antialiased flex flex-col min-h-screen">
        <main className="flex-1 flex flex-col lg:flex-row w-full min-h-screen relative z-20">
          {/* Left Side Branding Visuals */}
          <div className="w-full lg:w-1/2 relative flex flex-col justify-center px-8 pt-24 pb-16 lg:p-20 overflow-hidden bg-brandPrimary min-h-[30vh] lg:min-h-screen lg:sticky lg:top-0 max-h-screen">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80"
              alt="Dining Experience"
              className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-brandPrimary/95 via-brandPrimary/80 to-brandPrimary/60"></div>

            <div className="relative z-10 w-full max-w-lg mx-auto mt-6 lg:mx-0 lg:mt-12 animate-slide-up">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl flex items-center justify-center text-brandPrimary shadow-2xl font-bold text-2xl sm:text-3xl">
                  MP
                </div>
                <span className="font-bold text-3xl sm:text-4xl text-white tracking-tight">
                  MyanPace
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-[1.15]">
                Join the Future <br />
                <span className="text-white/70 italic font-light">
                  of Premium Dining.
                </span>
              </h1>

              <p className="text-white/80 text-base sm:text-lg leading-relaxed font-medium max-w-md">
                Create an account to skip the physical line, secure your digital
                token remotely, and unlock a world of seamless culinary
                experiences.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex items-center justify-center px-5 py-12 lg:p-12 bg-bgMain relative lg:min-h-screen">
            <RegisterForm />
          </div>
        </main>
      </div>
    </>
  );
}
