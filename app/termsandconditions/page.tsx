"use client";

import React from "react";

export default function TermsPage() {
  return (
    <>
      {/* Stylesheets and Custom CSS Overrides to perfectly preserve original UI */}
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

        /* Custom Tailwind Class Substitutes to guarantee UI preservation */
        .text-brandPrimary { color: #1d2846; }
        .text-textMuted { color: #949492; }
        .bg-brandPrimary { background-color: #1d2846; }
        .bg-bgMain { background-color: #f3f4f5; }
        .border-bgSurface\\/60 { border-color: rgba(214, 214, 213, 0.6); }
        .border-brandPrimary\\/10 { border-color: rgba(29, 40, 70, 0.1); }
        .via-brandPrimary\\/10 { --tw-gradient-via: rgba(29, 40, 70, 0.1); }
        .text-brandPrimary\\/30 { color: rgba(29, 40, 70, 0.3); }
        .text-brandPrimary\\/80 { color: rgba(29, 40, 70, 0.8); }

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
        .blob-1 { top: -10%; left: -10%; width: 50vw; height: 50vw; background: #e0e7ff; animation: blobAnim 15s infinite alternate; }
        .blob-2 { top: 40%; right: -20%; width: 60vw; height: 60vw; background: #dbeafe; animation: blobReverseAnim 20s infinite alternate; }
        .blob-3 { bottom: -20%; left: 20%; width: 55vw; height: 55vw; background: #f1f5f9; animation: blobAnim 18s infinite alternate; }
        
        .clause-number {
          background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%);
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), 0 4px 10px rgba(29,40,70,0.05);
        }

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
      `,
        }}
      />

      <div className="antialiased flex flex-col min-h-screen relative text-[#1d2846]">
        {/* Ambient Background */}
        <div className="ambient-bg pointer-events-none">
          <div className="ambient-blob blob-1"></div>
          <div className="ambient-blob blob-2"></div>
          <div className="ambient-blob blob-3"></div>
        </div>

        {/* Content Body */}
        <main className="flex-1 flex flex-col w-full relative z-10 pt-16 lg:pt-24 pb-32">
          <section className="px-6 max-w-[900px] mx-auto w-full text-center animate-slide-up mb-20 lg:mb-24">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-bgSurface/60 mb-8 shadow-sm bg-white/60 backdrop-blur-md">
              <i className="fa-solid fa-file-contract text-brandPrimary text-[11px]"></i>
              <span className="text-[10px] font-bold text-brandPrimary uppercase tracking-widest">
                Legal Agreements
              </span>
            </div>
            <h1 className="text-5xl lg:text-7xl text-brandPrimary mb-8 leading-[1.1] font-bold tracking-tight">
              Terms &{" "}
              <span className="text-textMuted italic font-light">
                Conditions
              </span>
            </h1>
            <p className="text-textMuted text-lg lg:text-xl max-w-[700px] mx-auto leading-[1.8] font-medium mb-8">
              Please read these terms carefully before using the MyanPace
              platform. By accessing or using our services, you agree to be
              bound by these detailed terms and conditions.
            </p>
            <p className="text-brandPrimary text-sm font-bold tracking-widest uppercase opacity-50">
              Last Updated: May 30, 2026
            </p>
          </section>

          <section
            className="max-w-[900px] mx-auto px-6 w-full animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            {/* Clause 1 */}
            <div className="mb-16">
              <div className="flex items-center gap-4 mb-8 ml-2 lg:ml-6">
                <div className="w-12 h-12 rounded-full bg-white/80 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-book text-brandPrimary text-lg"></i>
                </div>
                <h2 className="text-3xl font-bold text-brandPrimary tracking-tight">
                  1. Introduction & Acceptance
                </h2>
              </div>

              <div className="glass-card p-8 lg:p-14 flex flex-col gap-8">
                <p className="text-brandPrimary text-base lg:text-lg leading-[1.9] font-medium opacity-80">
                  Welcome to MyanPace. These Terms & Conditions govern your
                  access to and use of the MyanPace website, mobile
                  applications, backend management dashboards, and all related
                  services.
                </p>
                <p className="text-brandPrimary text-base lg:text-lg leading-[1.9] font-medium opacity-80">
                  By registering an account, obtaining a digital queue token, or
                  interacting with the Platform in any capacity, you acknowledge
                  that you have read, understood, and agreed to be
                  unconditionally bound by these Terms. If you do not agree to
                  these Terms, you must immediately cease all use of the
                  Platform.
                </p>
              </div>
            </div>

            {/* Clause 2 */}
            <div
              className="mb-16 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="flex items-center gap-4 mb-8 ml-2 lg:ml-6">
                <div className="w-12 h-12 rounded-full bg-white/80 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-spell-check text-brandPrimary text-lg"></i>
                </div>
                <h2 className="text-3xl font-bold text-brandPrimary tracking-tight">
                  2. Definitions
                </h2>
              </div>

              <div className="glass-card p-8 lg:p-14 flex flex-col gap-8">
                <ul className="space-y-10">
                  <li className="flex gap-6">
                    <i className="fa-solid fa-caret-right text-brandPrimary/30 mt-2 text-lg"></i>
                    <div>
                      <span className="text-xl font-bold text-brandPrimary block mb-2">
                        "User" or "Diner"
                      </span>
                      <p className="text-textMuted text-base lg:text-lg leading-[1.8] font-medium">
                        Refers to any individual who utilizes the Platform to
                        secure a queue position, make a reservation, or view
                        restaurant information.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6">
                    <i className="fa-solid fa-caret-right text-brandPrimary/30 mt-2 text-lg"></i>
                    <div>
                      <span className="text-xl font-bold text-brandPrimary block mb-2">
                        "Restaurant Partner"
                      </span>
                      <p className="text-textMuted text-base lg:text-lg leading-[1.8] font-medium">
                        Refers to food and beverage establishments, cafes, and
                        hospitality businesses that utilize MyanPace to manage
                        their physical and digital queues.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6">
                    <i className="fa-solid fa-caret-right text-brandPrimary/30 mt-2 text-lg"></i>
                    <div>
                      <span className="text-xl font-bold text-brandPrimary block mb-2">
                        "Digital Token"
                      </span>
                      <p className="text-textMuted text-base lg:text-lg leading-[1.8] font-medium">
                        Refers to the electronic queuing ticket generated by the
                        Platform, representing a User's temporary placeholder in
                        a Restaurant Partner's queue.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Clause 3 */}
            <div
              className="mb-16 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center gap-4 mb-8 ml-2 lg:ml-6">
                <div className="w-12 h-12 rounded-full bg-white/80 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-user-shield text-brandPrimary text-lg"></i>
                </div>
                <h2 className="text-3xl font-bold text-brandPrimary tracking-tight">
                  3. Account Registration & Security
                </h2>
              </div>

              <div className="glass-card p-8 lg:p-14 flex flex-col gap-12">
                <div className="flex items-start gap-6 lg:gap-8">
                  <div className="w-14 h-14 rounded-2xl clause-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-lg border border-white">
                    3.1
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-bold text-brandPrimary mb-3 leading-tight">
                      Eligibility
                    </h3>
                    <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.8] font-medium">
                      You must be at least 13 years of age to create an account.
                      Users under the age of 18 must have the consent of a
                      parent or legal guardian to utilize the Platform's booking
                      features.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-6 lg:gap-8">
                  <div className="w-14 h-14 rounded-2xl clause-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-lg border border-white">
                    3.2
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-bold text-brandPrimary mb-3 leading-tight">
                      Account Confidentiality
                    </h3>
                    <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.8] font-medium">
                      You are solely responsible for maintaining the
                      confidentiality of your account credentials, including
                      One-Time Passwords (OTPs) sent to your mobile device.
                      MyanPace holds no liability for unauthorized access
                      resulting from user negligence.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-6 lg:gap-8">
                  <div className="w-14 h-14 rounded-2xl clause-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-lg border border-white">
                    3.3
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-bold text-brandPrimary mb-3 leading-tight">
                      Data Accuracy
                    </h3>
                    <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.8] font-medium">
                      You agree to provide current, complete, and accurate
                      information during registration. MyanPace reserves the
                      right to suspend or terminate accounts found utilizing
                      fabricated identities or burner phone numbers.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clause 4 */}
            <div
              className="mb-16 animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center gap-4 mb-8 ml-2 lg:ml-6">
                <div className="w-12 h-12 rounded-full bg-white/80 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-server text-brandPrimary text-lg"></i>
                </div>
                <h2 className="text-3xl font-bold text-brandPrimary tracking-tight">
                  4. Platform Services & Limitations
                </h2>
              </div>

              <div className="glass-card p-8 lg:p-14 flex flex-col gap-8">
                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  <span className="font-bold text-brandPrimary">
                    Nature of Service:
                  </span>{" "}
                  MyanPace is strictly a technology provider that facilitates
                  digital queue management and reservations. We do not prepare,
                  handle, sell, or deliver food and beverages. The contract for
                  the supply and purchase of food is directly between the User
                  and the Restaurant Partner.
                </p>
                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  <span className="font-bold text-brandPrimary">
                    Estimations:
                  </span>{" "}
                  Any wait times, queue predictions, or table readiness
                  indicators provided by PaceAI or the general Platform are{" "}
                  <span className="italic text-textMuted">
                    estimations only
                  </span>
                  . Real-world dining durations fluctuate, and MyanPace is not
                  legally liable for delays, extended wait times, or instances
                  where a Restaurant Partner deviates from the estimated
                  schedule.
                </p>
                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  <span className="font-bold text-brandPrimary">
                    Third-Party Venues:
                  </span>{" "}
                  MyanPace cannot guarantee the quality, safety, or legality of
                  the services provided by our Restaurant Partners. Any disputes
                  regarding food quality, venue hygiene, or physical
                  altercations must be resolved directly with the venue
                  management.
                </p>
              </div>
            </div>

            {/* Clause 5 */}
            <div
              className="mb-16 animate-slide-up"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="flex items-center gap-4 mb-8 ml-2 lg:ml-6">
                <div className="w-12 h-12 rounded-full bg-white/80 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-gavel text-brandPrimary text-lg"></i>
                </div>
                <h2 className="text-3xl font-bold text-brandPrimary tracking-tight">
                  5. Token & Queue Integrity
                </h2>
              </div>

              <div className="glass-card p-8 lg:p-14 flex flex-col gap-12">
                <div className="flex items-start gap-6 lg:gap-8">
                  <div className="w-14 h-14 rounded-2xl clause-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-lg border border-white">
                    5.1
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-bold text-brandPrimary mb-3 leading-tight">
                      Non-Transferability
                    </h3>
                    <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.8] font-medium">
                      Digital Tokens possess no monetary value. Users are
                      expressly prohibited from selling, auctioning, trading, or
                      transferring their digital queue spot to any third party.
                      Automated systems detecting token transfers will
                      immediately void the reservation.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-6 lg:gap-8">
                  <div className="w-14 h-14 rounded-2xl clause-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-lg border border-white">
                    5.2
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-bold text-brandPrimary mb-3 leading-tight">
                      Grace Periods & Forfeiture
                    </h3>
                    <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.8] font-medium">
                      When a table becomes available, the Platform will notify
                      the User. The Restaurant Partner dictates the specific
                      grace period (e.g., 5 to 10 minutes). Failure to check in
                      physically at the host stand before the grace period
                      expires results in the automatic forfeiture of the token,
                      without recourse.
                    </p>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-brandPrimary/10 to-transparent"></div>

                <div className="flex items-start gap-6 lg:gap-8">
                  <div className="w-14 h-14 rounded-2xl clause-number flex items-center justify-center shrink-0 font-bold text-brandPrimary text-lg border border-white">
                    5.3
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-bold text-brandPrimary mb-3 leading-tight">
                      No-Show Policies
                    </h3>
                    <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.8] font-medium">
                      Repeatedly pulling Digital Tokens and failing to show up
                      (No-Shows) negatively impacts Restaurant Partners.
                      MyanPace algorithms track User attendance reliability.
                      Accounts exhibiting excessive No-Shows will be temporarily
                      shadow-banned or permanently restricted from joining
                      remote queues.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clause 6 */}
            <div
              className="mb-16 animate-slide-up"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="flex items-center gap-4 mb-8 ml-2 lg:ml-6">
                <div className="w-12 h-12 rounded-full bg-white/80 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-copyright text-brandPrimary text-lg"></i>
                </div>
                <h2 className="text-3xl font-bold text-brandPrimary tracking-tight">
                  6. Intellectual Property Rights
                </h2>
              </div>

              <div className="glass-card p-8 lg:p-14 flex flex-col gap-8">
                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  All content, source code, logos, UI/UX designs, algorithms, AI
                  logic (PaceAI), and trademarks displayed on the Platform are
                  the exclusive property of MyanPace and are protected by
                  Myanmar and international copyright laws.
                </p>
                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  You are granted a limited, non-exclusive, non-transferable
                  license to utilize the Platform solely for its intended
                  personal or business purposes. You may not reverse-engineer,
                  decompile, scrape, or create derivative works from our
                  software.
                </p>
                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  <span className="font-bold text-brandPrimary">
                    User-Generated Content:
                  </span>{" "}
                  By posting reviews, photos, or comments in the Community
                  section, you grant MyanPace a perpetual, royalty-free,
                  worldwide license to use, display, and distribute said content
                  for promotional and operational purposes.
                </p>
              </div>
            </div>

            {/* Clause 7 */}
            <div
              className="mb-16 animate-slide-up"
              style={{ animationDelay: "0.7s" }}
            >
              <div className="flex items-center gap-4 mb-8 ml-2 lg:ml-6">
                <div className="w-12 h-12 rounded-full bg-white/80 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-triangle-exclamation text-brandPrimary text-lg"></i>
                </div>
                <h2 className="text-3xl font-bold text-brandPrimary tracking-tight">
                  7. Limitation of Liability
                </h2>
              </div>

              <div className="glass-card p-8 lg:p-14 flex flex-col gap-8">
                <p className="text-brandPrimary font-bold text-sm tracking-widest uppercase opacity-60 mb-2 border-b border-brandPrimary/10 pb-6">
                  Please read this section carefully as it limits our legal
                  liability.
                </p>

                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  To the maximum extent permitted by applicable law, MyanPace,
                  its founders, directors, and employees shall not be liable for
                  any indirect, incidental, special, consequential, or punitive
                  damages, including but not loss of profits, data, or goodwill,
                  arising from:
                </p>

                <ul className="space-y-4 list-disc list-inside text-textMuted text-base lg:text-lg leading-[1.8] font-medium pl-2 lg:pl-6">
                  <li>
                    Your use or inability to use the Platform due to network
                    outages, maintenance, or bugs.
                  </li>
                  <li>
                    The actions, omissions, or conduct of any Restaurant Partner
                    or third party.
                  </li>
                  <li>
                    Any physical injuries, illnesses (including foodborne
                    illnesses), or property damage sustained at a Restaurant
                    Partner's venue.
                  </li>
                  <li>
                    Unauthorized access to or alteration of your secure
                    transmissions or data.
                  </li>
                </ul>

                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium mt-4">
                  In no event shall MyanPace's aggregate liability for all
                  claims related to the services exceed the amount paid by you,
                  if any, to MyanPace for the specific service in dispute over
                  the past six (6) months.
                </p>
              </div>
            </div>

            {/* Clause 8 */}
            <div
              className="mb-16 animate-slide-up"
              style={{ animationDelay: "0.8s" }}
            >
              <div className="flex items-center gap-4 mb-8 ml-2 lg:ml-6">
                <div className="w-12 h-12 rounded-full bg-white/80 border border-white flex items-center justify-center shadow-sm shrink-0">
                  <i className="fa-solid fa-scale-balanced text-brandPrimary text-lg"></i>
                </div>
                <h2 className="text-3xl font-bold text-brandPrimary tracking-tight">
                  8. Governing Law & Dispute Resolution
                </h2>
              </div>

              <div className="glass-card p-8 lg:p-14 flex flex-col gap-8">
                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  These Terms and any disputes arising out of or related to your
                  use of the Platform shall be governed by and construed in
                  accordance with the laws of the Republic of the Union of
                  Myanmar.
                </p>
                <p className="text-brandPrimary/80 text-base lg:text-lg leading-[1.9] font-medium">
                  Any legal action or proceeding related to these Terms shall be
                  brought exclusively in the competent courts located in Yangon,
                  Myanmar. We retain the right to seek injunctive or other
                  equitable relief in a court of competent jurisdiction to
                  prevent the actual or threatened infringement,
                  misappropriation, or violation of our intellectual property
                  rights or system security.
                </p>
              </div>
            </div>

            {/* CTA Footnote */}
            <div
              className="text-center mt-24 animate-slide-up"
              style={{ animationDelay: "0.9s" }}
            >
              <p className="text-textMuted font-bold text-sm uppercase tracking-widest mb-6">
                Questions regarding these terms?
              </p>
              <div className="inline-flex flex-col sm:flex-row items-center gap-5">
                <a
                  href="mailto:legal@myancode.com"
                  className="px-8 py-4 rounded-2xl bg-brandPrimary text-bgMain font-bold shadow-lg hover:bg-opacity-90 transition-all text-base flex items-center gap-3"
                >
                  <i className="fa-solid fa-envelope text-lg"></i> Contact Legal
                  Team
                </a>
                <a
                  href="mailto:support@myancode.com"
                  className="px-8 py-4 rounded-2xl bg-white/80 backdrop-blur border border-bgSurface text-brandPrimary font-bold shadow-sm hover:bg-white transition-all text-base flex items-center gap-3"
                >
                  <i className="fa-solid fa-headset text-lg"></i> Support Center
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
