"use client";

import React from "react";

export default function PolicyPage() {
  return (
    <>
      {/* External Fonts & Icon Libraries */}
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

      {/* Styled Embed to seamlessly preserve original custom UI and theme configurations */}
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

        /* Explicit CSS mappings for the Tailwind configuration properties */
        .text-brandPrimary { color: #1d2846; }
        .text-textMuted { color: #949492; }
        .bg-brandPrimary { background-color: #1d2846; }
        .bg-bgMain { background-color: #f3f4f5; }
        .border-bgSurface\\/60 { border-color: rgba(214, 214, 213, 0.6); }
        .border-brandPrimary\\/10 { border-color: rgba(29, 40, 70, 0.1); }
        .via-brandPrimary\\/10 { --tw-gradient-via: rgba(29, 40, 70, 0.1); }

        .glass-card {
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 12px 40px -12px rgba(29, 40, 70, 0.1);
          border-radius: 2rem;
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
        .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #e0e7ff; animation: policyBlob 15s infinite alternate; }
        .blob-2 { top: 40%; right: -20%; width: 60vw; height: 60vw; background: #dbeafe; animation: policyBlobReverse 20s infinite alternate; }
        .blob-3 { bottom: -20%; left: 20%; width: 55vw; height: 55vw; background: #f1f5f9; animation: policyBlob 18s infinite alternate; }
        
        .rule-number {
          background: linear-gradient(135deg, rgba(29,40,70,0.1) 0%, rgba(29,40,70,0.02) 100%);
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.5);
        }

        .animate-slide-up {
          animation: policySlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes policySlideUp {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes policyBlob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes policyBlobReverse {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-40px, 50px) scale(1.05); }
          66% { transform: translate(30px, -30px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `,
        }}
      />

      <div className="antialiased flex flex-col min-h-screen relative text-[#1d2846]">
        {/* Ambient Animated Graphics */}
        <div className="ambient-bg pointer-events-none">
          <div className="ambient-blob blob-1"></div>
          <div className="ambient-blob blob-2"></div>
          <div className="ambient-blob blob-3"></div>
        </div>

        {/* Core Layout Main Component */}
        <main className="flex-1 flex flex-col w-full relative z-10 pt-12 lg:pt-20 pb-24">
          <section className="px-6 max-w-[900px] mx-auto w-full text-center animate-slide-up mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-bgSurface/60 mb-6 shadow-sm bg-white/40 backdrop-blur-md">
              <i className="fa-solid fa-shield-halved text-brandPrimary text-[10px]"></i>
              <span className="text-[9px] font-bold text-brandPrimary uppercase tracking-wider">
                Guidelines
              </span>
            </div>
            <h1 className="text-4xl lg:text-6xl text-brandPrimary mb-6 leading-[1.05] font-bold tracking-tight">
              Platform{" "}
              <span className="text-textMuted italic font-light">Policies</span>
            </h1>
            <p className="text-textMuted text-lg max-w-[650px] mx-auto leading-relaxed font-medium">
              To ensure a fair, safe, and pleasant dining experience for
              everyone, all users must adhere to the following rules when using
              MyanPace.
            </p>
          </section>

          <section
            className="max-w-[850px] mx-auto px-6 w-full animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            {/* Section 1 */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5 ml-4">
                <div className="w-10 h-10 rounded-full bg-white/60 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-comments text-brandPrimary text-sm"></i>
                </div>
                <h2 className="text-2xl font-bold text-brandPrimary tracking-tight">
                  Content & Communication Rules
                </h2>
              </div>

              <div className="glass-card p-6 lg:p-10 flex flex-col gap-8">
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    1
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No Profanity or Hate Speech
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Users must not use rude words, explicit language, or slurs
                      in profile names, notes, or reviews.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    2
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No Explicit Content
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Posting nudity, pornography, or sexually suggestive images
                      anywhere on the platform is strictly prohibited.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    3
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No Harassment or Bullying
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Customers and restaurant staff must treat each other with
                      respect. Threats and personal attacks will result in bans.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    4
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No Spamming
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Sending repetitive messages, flooding the host chat, or
                      creating fake waitlist entries is not allowed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div
              className="mb-10 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex items-center gap-3 mb-5 ml-4">
                <div className="w-10 h-10 rounded-full bg-white/60 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-scale-balanced text-brandPrimary text-sm"></i>
                </div>
                <h2 className="text-2xl font-bold text-brandPrimary tracking-tight">
                  Queue Fairness & Integrity
                </h2>
              </div>

              <div className="glass-card p-6 lg:p-10 flex flex-col gap-8">
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    5
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No Spot-Selling or Trading
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Users cannot sell, trade, or transfer their digital queue
                      position to other parties for money or favors.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    6
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      One Spot Per Group
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Users may only hold one active queue spot per restaurant
                      at any given time to prevent system hoarding.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    7
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      Accurate Group Sizes
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Diners must input the correct number of guests.
                      Deliberately misrepresenting party size to get a table
                      faster is prohibited.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    8
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      Respect Grace Periods
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Diners must accept that missing the automated call-back
                      grace period (e.g., 5 minutes) means forfeiting their
                      spot.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div
              className="mb-10 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center gap-3 mb-5 ml-4">
                <div className="w-10 h-10 rounded-full bg-white/60 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-lock text-brandPrimary text-sm"></i>
                </div>
                <h2 className="text-2xl font-bold text-brandPrimary tracking-tight">
                  Safety, Privacy, & Legal
                </h2>
              </div>

              <div className="glass-card p-6 lg:p-10 flex flex-col gap-8">
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    9
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No Doxxing or Privacy Violations
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Users must not share the private information, phone
                      numbers, or photos of staff or other diners without
                      consent.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    10
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No Impersonation
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Users cannot pretend to be restaurant employees, managers,
                      or MyanPace corporate staff.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    11
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No Fraudulent Reviews
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Restaurants may not post fake positive reviews for
                      themselves, nor can competitors post fake negative
                      feedback to hurt business.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    12
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      Prohibition of Illegal Goods
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Users cannot use the order or notes section to request,
                      buy, or sell illegal substances, alcohol to minors, or
                      weapons.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div
              className="mb-10 animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center gap-3 mb-5 ml-4">
                <div className="w-10 h-10 rounded-full bg-white/60 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-server text-brandPrimary text-sm"></i>
                </div>
                <h2 className="text-2xl font-bold text-brandPrimary tracking-tight">
                  Platform Use & Maintenance
                </h2>
              </div>

              <div className="glass-card p-6 lg:p-10 flex flex-col gap-8">
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    13
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      No System Exploitation
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Attempting to hack, reverse-engineer, or use automated
                      bots to manipulate the MyanPace queue is strictly
                      forbidden.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    14
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      Accountability for Minors
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Account holders are fully responsible for any activity or
                      queue bookings made by minors using their devices.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-2xl rule-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-base border border-brandPrimary/10">
                    15
                  </div>
                  <div className="pt-1.5">
                    <h3 className="text-lg font-bold text-brandPrimary mb-2 leading-tight">
                      Right to Refuse Service
                    </h3>
                    <p className="text-textMuted text-sm lg:text-base leading-relaxed font-medium">
                      Restaurants reserve the right to remove a user from their
                      digital queue if the user exhibits aggressive behavior
                      on-site.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
