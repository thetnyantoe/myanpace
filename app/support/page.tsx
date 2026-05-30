"use client";

import React, { useState } from "react";

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Featured Guides dataset to manage the search functionality cleanly in React
  const guides = [
    {
      id: "priority-token",
      icon: "fa-ticket",
      title: "How to get a priority token",
      steps: [
        "Open the 'Shops' tab.",
        "Select your preferred venue.",
        'Tap the "Get Token Now" button.',
        "Track your queue in 'Token' tab.",
      ],
    },
    {
      id: "cancel-reservation",
      icon: "fa-ban",
      title: "How to cancel a reservation",
      steps: [
        "Go to the 'Token' section.",
        "View your active token card.",
        'Tap "Cancel Reservation".',
        "Confirm on the popup prompt.",
      ],
    },
    {
      id: "post-community",
      icon: "fa-users",
      title: "How to post in Community",
      steps: [
        "Navigate to 'Community' tab.",
        'Tap the "+" or "New Post" button.',
        "Write review and add photos.",
        'Tap "Publish" to share.',
      ],
    },
    {
      id: "scan-qr",
      icon: "fa-qrcode",
      title: "How to scan venue QR",
      steps: [
        "Open the mobile app menu.",
        'Tap on the "QR Scan" icon.',
        "Allow camera permissions.",
        "Point camera at venue's QR.",
      ],
    },
    {
      id: "register-account",
      icon: "fa-user-plus",
      title: "How to Register Account",
      steps: [
        'Click "Login/Register" header.',
        'Choose "Create Account".',
        "Enter phone number & password.",
        "Verify using the SMS OTP.",
      ],
    },
    {
      id: "login",
      icon: "fa-arrow-right-to-bracket",
      title: "How to Login",
      steps: [
        'Click "Login/Register" button.',
        "Enter registered phone number.",
        "Enter your secure password.",
        'Tap "Sign In" to access dashboard.',
      ],
    },
    {
      id: "use-paceai",
      icon: "fa-robot",
      title: "How to use PaceAI",
      steps: [
        "Tap PaceAI floating button.",
        'Type query (e.g., "Find sushi").',
        "AI curates venues instantly.",
        "Ask AI to queue for you.",
      ],
    },
    {
      id: "save-favorites",
      icon: "fa-heart",
      title: "How to save Favorites",
      steps: [
        "Browse venues in 'Shops'.",
        "Tap the heart icon on a card.",
        "Venue is added to Favorites.",
        "Access them in Account menu.",
      ],
    },
  ];

  // Filter guides based on title or step text matching query
  const filteredGuides = guides.filter((guide) => {
    const query = searchQuery.toLowerCase();
    const matchesTitle = guide.title.toLowerCase().includes(query);
    const matchesSteps = guide.steps.some((step) =>
      step.toLowerCase().includes(query),
    );
    return matchesTitle || matchesSteps;
  });

  return (
    <>
      {/* Dynamic Font and Icon Stylesheets injection */}
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

      {/* Embedded CSS configurations for styling preservation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        body {
          background-color: #f3f4f5;
          color: #1d2846;
          font-family: 'Jost', 'Helvetica', sans-serif;
          -webkit-tap-highlight-color: transparent;
          scroll-behavior: smooth;
          overflow-x: hidden;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .glass-nav-dark {
          background: rgba(29, 40, 70, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 12px 40px -12px rgba(29, 40, 70, 0.1);
          border-radius: 2rem;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.7);
          transform: translateY(-4px);
          box-shadow: 0 20px 50px -15px rgba(29, 40, 70, 0.15);
          border: 1px solid rgba(255, 255, 255, 1);
        }

        .glass-search {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 16px 40px -10px rgba(29, 40, 70, 0.08);
        }
        .glass-search:focus-within {
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 16px 50px -10px rgba(29, 40, 70, 0.15);
          border-color: rgba(29, 40, 70, 0.2);
        }
        
        .search-sticky {
          position: sticky;
          top: 100px;
          z-index: 50;
        }

        .step-badge {
          background: rgba(29, 40, 70, 0.05);
          color: #1d2846;
          border: 1px solid rgba(29, 40, 70, 0.1);
        }

        .ambient-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          overflow: hidden;
          background: #f3f4f5;
        }
        .ambient-blob {
          position: absolute;
          filter: blur(100px);
          opacity: 0.5;
          border-radius: 50%;
        }
        .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #e0e7ff; animation: blobAnim 15s infinite alternate; }
        .blob-2 { top: 40%; right: -20%; width: 60vw; height: 60vw; background: #dbeafe; animation: blobReverseAnim 20s infinite alternate; }
        .blob-3 { bottom: -20%; left: 20%; width: 55vw; height: 55vw; background: #f1f5f9; animation: blobAnim 18s infinite alternate; }

        .text-brandPrimary { color: #1d2846; }
        .bg-brandPrimary { background-color: #1d2846; }
        .text-textMuted { color: #949492; }
        .border-bgSurface\/60 { border-color: rgba(214, 214, 213, 0.6); }
        .bg-white\/40 { background-color: rgba(255, 255, 255, 0.4); }
        .bg-white\/60 { background-color: rgba(255, 255, 255, 0.6); }
        .bg-white\/80 { background-color: rgba(255, 255, 255, 0.8); }
        .border-brandPrimary\/10 { border-color: rgba(29, 40, 70, 0.1); }
        .bg-brandPrimary\/10 { background-color: rgba(29, 40, 70, 0.1); }
        .text-brandPrimary\/40 { color: rgba(29, 40, 70, 0.4); }
        .text-brandPrimary\/20 { color: rgba(29, 40, 70, 0.2); }
        .placeholder\:text-brandPrimary\/30::placeholder { color: rgba(29, 40, 70, 0.3); }

        .animate-slide-up {
          animation: slideUpAnim 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUpAnim {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes blobAnim {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes blobReverseAnim {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-40px, 50px) scale(1.05); }
          66% { transform: translate(30px, -30px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 24px); }
        .pt-safe { padding-top: env(safe-area-inset-top, 16px); }
      `,
        }}
      />

      <div className="antialiased flex flex-col min-h-screen relative text-[#1d2846]">
        {/* Ambient Liquid Background */}
        <div className="ambient-bg pointer-events-none">
          <div className="ambient-blob blob-1"></div>
          <div className="ambient-blob blob-2"></div>
          <div className="ambient-blob blob-3"></div>
        </div>

        <main className="flex-1 flex flex-col w-full relative z-10">
          {/* Hero Header Section */}
          <section className="pt-24 lg:pt-36 pb-12 lg:pb-16 px-6 max-w-[1300px] mx-auto w-full flex flex-col lg:flex-row items-center justify-between relative gap-12 lg:gap-8 animate-slide-up">
            <div className="w-full lg:w-[50%] flex flex-col items-start text-left z-20">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-bgSurface/60 mb-6 shadow-sm bg-white/40 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-brandPrimary animate-pulse"></span>
                <span className="text-[9px] font-bold text-brandPrimary uppercase tracking-wider">
                  Support Center
                </span>
              </div>
              <h1 className="text-5xl lg:text-[4.5rem] text-brandPrimary mb-6 leading-[1.05] font-bold tracking-tight">
                How can we{" "}
                <span className="text-textMuted italic font-light">
                  help you?
                </span>
              </h1>
              <p className="text-textMuted text-lg lg:text-xl max-w-[500px] leading-relaxed font-medium mb-8">
                Search for step-by-step guides, learn how to manage your digital
                tokens, or get in touch with our operators instantly.
              </p>
            </div>

            <div className="w-full lg:w-[50%] h-[300px] lg:h-[400px] relative items-center justify-center hidden sm:flex">
              <div className="glass-card w-full max-w-[500px] h-full p-2 relative overflow-hidden flex items-center justify-center mx-auto">
                <img
                  src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1000&auto=format&fit=crop&q=80"
                  alt="Support Team"
                  className="w-full h-full object-cover rounded-[1.5rem] opacity-90"
                />
                <div className="absolute -bottom-4 -left-4 xl:-bottom-5 xl:-left-5 bg-white/80 backdrop-blur-xl px-5 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-white flex items-center gap-4 z-10">
                  <div className="w-10 h-10 bg-brandPrimary text-white rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-headset text-sm"></i>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-textMuted tracking-widest uppercase mb-0.5">
                      Live Support
                    </p>
                    <p className="font-bold text-sm text-brandPrimary">
                      Available Now
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sticky Search Section */}
          <section className="w-full search-sticky px-6 max-w-[900px] mx-auto mb-16 z-50">
            <div className="w-full glass-search rounded-full flex items-center px-6 py-4 lg:py-5 transition-all">
              <i className="fa-solid fa-magnifying-glass text-brandPrimary/40 text-xl lg:text-2xl mr-4"></i>
              <input
                type="text"
                id="guideSearch"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for 'community' or 'token'..."
                className="w-full bg-transparent border-none outline-none text-brandPrimary font-bold placeholder:text-brandPrimary/30 text-lg lg:text-xl"
              />
              <button className="w-10 h-10 rounded-full bg-brandPrimary text-white flex items-center justify-center hover:bg-opacity-90 transition-all shadow-md shrink-0">
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </section>

          {/* Featured Guides Section */}
          <section
            className="max-w-[1300px] mx-auto px-6 py-8 w-full animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-center gap-3 mb-8 px-2">
              <h2 className="text-2xl font-bold text-brandPrimary">
                Featured Guides
              </h2>
              <div className="flex-1 h-px bg-brandPrimary/10"></div>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              id="guidesContainer"
            >
              {filteredGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="searchable-item glass-card p-6 flex flex-col h-full group"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-brandPrimary mb-5 bg-white/60 shadow-sm border border-white text-xl group-hover:scale-110 transition-transform">
                    <i className={`fa-solid ${guide.icon}`}></i>
                  </div>
                  <h3 className="text-lg font-bold text-brandPrimary mb-4 leading-tight">
                    {guide.title}
                  </h3>
                  <ol className="space-y-3 text-sm text-textMuted font-medium flex-1">
                    {guide.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full step-badge flex items-center justify-center shrink-0 font-bold text-[9px]">
                          {idx + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            {/* No Results Fallback state */}
            {filteredGuides.length === 0 && (
              <div
                id="noResults"
                className="text-center py-16 text-textMuted font-bold glass-card mt-6"
              >
                <i className="fa-solid fa-ghost text-4xl mb-4 text-brandPrimary/20"></i>
                <p>
                  No guides found matching your search. Try adjusting your
                  keywords.
                </p>
              </div>
            )}
          </section>

          {/* Quick Shortcuts Section */}
          <section
            className="max-w-[1300px] mx-auto px-6 py-10 w-full animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center gap-3 mb-8 px-2">
              <h2 className="text-2xl font-bold text-brandPrimary">
                Quick Shortcuts
              </h2>
              <div className="flex-1 h-px bg-brandPrimary/10"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-arrow-right-to-bracket text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  Login
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-user-plus text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  Register
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-store text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  Explore Shops
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-ticket text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  My Tokens
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-users text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  Community
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-robot text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  PaceAI
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-shield-halved text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  Privacy Policy
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-file-contract text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  Terms & Cond.
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-circle-question text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  General FAQ
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  Report Issue
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-handshake text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  Partner with Us
                </span>
              </a>
              <a
                href="#"
                className="glass-card p-5 flex flex-col items-center justify-center text-center group"
              >
                <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-brandPrimary mb-3 group-hover:scale-110 transition-transform shadow-sm border border-white">
                  <i className="fa-solid fa-briefcase text-sm"></i>
                </div>
                <span className="font-bold text-xs text-brandPrimary">
                  For Business
                </span>
              </a>
            </div>
          </section>

          {/* Contact Directories Section */}
          <section
            className="max-w-[1300px] mx-auto px-6 py-12 lg:py-16 w-full mb-16 animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center gap-3 mb-8 px-2">
              <h2 className="text-2xl font-bold text-brandPrimary">
                Contact Directories
              </h2>
              <div className="flex-1 h-px bg-brandPrimary/10"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card p-8 lg:p-12 relative overflow-hidden flex flex-col">
                <div className="absolute -right-12 -top-12 opacity-[0.03] text-brandPrimary pointer-events-none">
                  <i className="fa-solid fa-phone-volume text-[280px]"></i>
                </div>

                <div className="w-12 h-12 rounded-full flex items-center justify-center text-brandPrimary mb-8 bg-white/60 shadow-sm border border-white text-lg relative z-10">
                  <i className="fa-solid fa-phone"></i>
                </div>

                <h3 className="text-3xl font-bold text-brandPrimary mb-4 relative z-10 tracking-tight">
                  Direct Lines
                </h3>
                <p className="text-textMuted mb-10 font-medium max-w-[85%] relative z-10 leading-relaxed text-sm">
                  Available Monday to Friday, 9:00 AM - 6:00 PM (MMT). Reach out
                  to our operators directly.
                </p>

                <div className="space-y-4 relative z-10 mt-auto">
                  <a
                    href="tel:+959456751882"
                    className="flex items-center justify-between p-5 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/60 transition-all group shadow-sm"
                  >
                    <span className="font-bold text-brandPrimary text-lg">
                      +959 456 751 882
                    </span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-brandPrimary/40 group-hover:text-brandPrimary transition-colors"></i>
                  </a>
                  <a
                    href="tel:+959456396242"
                    className="flex items-center justify-between p-5 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/60 transition-all group shadow-sm"
                  >
                    <span className="font-bold text-brandPrimary text-lg">
                      +959 456 396 242
                    </span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-brandPrimary/40 group-hover:text-brandPrimary transition-colors"></i>
                  </a>
                  <a
                    href="tel:+959782611101"
                    className="flex items-center justify-between p-5 rounded-2xl bg-white/40 hover:bg-white/70 border border-white/60 transition-all group shadow-sm"
                  >
                    <span className="font-bold text-brandPrimary text-lg">
                      +959 782 611 101
                    </span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-brandPrimary/40 group-hover:text-brandPrimary transition-colors"></i>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
