"use client";

import React, { useState } from "react";

export default function FAQPage() {
  // Track open item index string identifier (e.g., "q-1")
  const [activeId, setActiveId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setActiveId(activeId === id ? null : id);
  };

  const faqData = [
    {
      category: "For Diners & Customers",
      items: [
        {
          id: "q-1",
          question: "1. How do I join the queue?",
          answer:
            "Scan the MyanPace QR code at the restaurant entrance or join via our mobile app/website.",
        },
        {
          id: "q-2",
          question: "2. Do I need to download an app?",
          answer:
            "No. You can join the queue and track your status directly through your phone's web browser.",
        },
        {
          id: "q-3",
          question: "3. How will I know when my table is ready?",
          answer: "You will receive an notification when it is your turn.",
        },
        {
          id: "q-4",
          question: "4. Can I leave the waiting area?",
          answer:
            "Yes. You can monitor your live position in the queue remotely from your phone.",
        },
        {
          id: "q-5",
          question: "5. What happens if I miss my turn?",
          answer:
            "The system holds your spot for a grace period (e.g., 5 minutes) before moving to the next group.",
        },
        {
          id: "q-6",
          question: "6. Can customers pre-order food while waiting?",
          answer:
            "Yes. Restaurants can link their digital menu, allowing diners to browse and pre-order to speed up table turnover.",
        },
      ],
    },
    {
      category: "For Businesses & Restaurants",
      items: [
        {
          id: "q-7",
          question: "7. How does MyanPace reduce walkaways?",
          answer:
            "Real-time wait updates keep customers engaged, allowing them to shop nearby instead of leaving the line.",
        },
        {
          id: "q-8",
          question: "8. Can we manage walk-ins and reservations together?",
          answer:
            "Yes. The dashboard unifies advanced bookings and live walk-in queues in one screen.",
        },
        {
          id: "q-9",
          question: "9. Can we track peak hours and staff performance?",
          answer:
            "Yes. The analytics dashboard generates reports on average wait times, walkaway rates, and seating efficiency.",
        },
        {
          id: "q-10",
          question: "10. How does the system handle different table sizes?",
          answer:
            "MyanPace automatically categorizes guests by group size (e.g., 2-seater, 4-seater, VIP room) and assigns them to the correct table zone.",
        },
        {
          id: "q-11",
          question: "11. Can we customize the look of the customer interface?",
          answer:
            "Yes. Restaurants can add their logo, brand colors, and custom greeting messages to the QR landing page.",
        },
        {
          id: "q-12",
          question: "12. Can large restaurant chains manage multiple branches?",
          answer:
            "Yes. The centralized admin panel allows managers to switch between branches and view aggregated analytics.",
        },
      ],
    },
    {
      category: "Technical & Security",
      items: [
        {
          id: "q-13",
          question: "13. Does it support multiple languages?",
          answer:
            "Yes. The interface supports both Myanmar (Unicode) and English for staff and customers.",
        },
        {
          id: "q-14",
          question: "14. What hardware do we need?",
          answer:
            "Any internet-connected device. The system runs on existing tablets, iPads, smartphones, or computers.",
        },
        {
          id: "q-15",
          question: "15. What happens if the restaurant loses connectivity?",
          answer:
            "The system caches local data on your tablet, allowing staff to manage the current queue offline until the connection returns.",
        },
        {
          id: "q-16",
          question: "16. Is customer data safe and private?",
          answer:
            "Yes. We only collect minimal operational data (like phone numbers for SMS alerts) and encrypt all data to comply with privacy standards.",
        },
        {
          id: "q-17",
          question: "17. How does the system prevent queue jumping?",
          answer:
            "The platform uses secure verification tokens and strictly tracks the timestamp of when each party joined.",
        },
      ],
    },
  ];

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
        .border-bgSurface\\/60 { border-color: rgba(214, 214, 213, 0.6); }
        .border-brandPrimary\\/5 { border-color: rgba(29, 40, 70, 0.05); }

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

        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          opacity: 0;
        }
        
        .faq-answer.open {
          max-height: 200px;
          opacity: 1;
        }

        .faq-icon {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .faq-button:hover .faq-icon-wrapper {
          background-color: #1d2846;
          color: #f3f4f5;
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
        {/* Background Blobs */}
        <div className="ambient-bg pointer-events-none">
          <div className="ambient-blob blob-1"></div>
          <div className="ambient-blob blob-2"></div>
          <div className="ambient-blob blob-3"></div>
        </div>

        {/* Content Body */}
        <main className="flex-1 flex flex-col w-full relative z-10 pt-12 lg:pt-20 pb-24">
          <section className="px-6 max-w-[900px] mx-auto w-full text-center animate-slide-up mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-bgSurface/60 mb-6 shadow-sm bg-white/40 backdrop-blur-md">
              <i className="fa-solid fa-circle-question text-brandPrimary text-[10px]"></i>
              <span className="text-[9px] font-bold text-brandPrimary uppercase tracking-wider">
                Help Center
              </span>
            </div>
            <h1 className="text-4xl lg:text-6xl text-brandPrimary mb-6 leading-[1.05] font-bold tracking-tight">
              Frequently Asked{" "}
              <span className="text-textMuted italic font-light">
                Questions
              </span>
            </h1>
            <p className="text-textMuted text-lg max-w-[600px] mx-auto leading-relaxed font-medium">
              Find quick answers to common questions about securing digital
              tokens, managing your account, and using MyanPace.
            </p>
          </section>

          <section
            className="max-w-[800px] mx-auto px-6 w-full animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            {faqData.map((section, sectionIdx) => (
              <div className="mb-10" key={sectionIdx}>
                <h2 className="text-xl font-bold text-brandPrimary mb-4 ml-4">
                  {section.category}
                </h2>
                <div className="glass-card overflow-hidden">
                  {section.items.map((item) => {
                    const isOpen = activeId === item.id;
                    return (
                      <div
                        className="faq-item border-b border-white/40 last:border-0"
                        key={item.id}
                      >
                        <button
                          onClick={() => toggleAccordion(item.id)}
                          className={`faq-button w-full flex items-center justify-between p-6 text-left group transition-colors ${isOpen ? "active" : ""}`}
                        >
                          <span className="font-bold text-lg text-brandPrimary pr-4">
                            {item.question}
                          </span>
                          <div className="faq-icon-wrapper w-8 h-8 rounded-full bg-white flex items-center justify-center text-brandPrimary shadow-sm border border-white transition-colors shrink-0">
                            <i
                              className="fa-solid fa-chevron-down faq-icon text-sm"
                              style={{
                                transform: isOpen
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                              }}
                            ></i>
                          </div>
                        </button>
                        <div
                          className={`faq-answer px-6 pb-0 ${isOpen ? "open" : ""}`}
                        >
                          <p className="text-textMuted font-medium leading-relaxed pb-6 text-sm lg:text-base border-t border-brandPrimary/5 pt-4">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
    </>
  );
}
