"use client";

import React from 'react';
import { Building, Cpu, ShieldCheck, Network } from 'lucide-react';

export default function AboutPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --brand-primary: #1d2846;
          --bg-main: #f3f4f5;
          --bg-surface: #d6d6d5;
          --text-muted: #949492;
        }

        body {
          background-color: var(--bg-main);
          color: var(--brand-primary);
          font-family: 'Jost', 'Helvetica', sans-serif;
          -webkit-tap-highlight-color: transparent;
          scroll-behavior: smooth;
          overflow-x: hidden;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 12px 40px -12px rgba(29, 40, 70, 0.08);
          border-radius: 2rem;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.6);
          transform: translateY(-4px);
          box-shadow: 0 20px 50px -10px rgba(29, 40, 70, 0.12);
          border: 1px solid rgba(255, 255, 255, 1);
        }

        .ambient-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          overflow: hidden;
          background: var(--bg-main);
        }
        
        .ambient-blob {
          position: absolute;
          filter: blur(120px);
          opacity: 0.4;
          border-radius: 50%;
        }
        
        .blob-1 { top: -10%; left: -10%; width: 55vw; height: 55vw; background: #e0e7ff; animation: blob 20s infinite alternate; }
        .blob-2 { top: 30%; right: -20%; width: 65vw; height: 65vw; background: #e2e8f0; animation: blob-reverse 25s infinite alternate; }
        .blob-3 { bottom: -20%; left: 10%; width: 60vw; height: 60vw; background: #f1f5f9; animation: blob 22s infinite alternate; }

        .text-gradient {
          background: linear-gradient(135deg, #1d2846 0%, #4a5568 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @keyframes slideUp {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(50px, -70px) scale(1.1); }
          66% { transform: translate(-40px, 40px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        @keyframes blob-reverse {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-50px, 60px) scale(1.05); }
          66% { transform: translate(40px, -40px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up-delayed { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
        .animate-slide-up-slow { animation: slideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; }
      `}} />

      <div className="antialiased flex flex-col min-h-screen relative text-[#1d2846]">
        {/* Ambient Background */}
        <div className="ambient-bg pointer-events-none">
          <div className="ambient-blob blob-1"></div>
          <div className="ambient-blob blob-2"></div>
          <div className="ambient-blob blob-3"></div>
        </div>

        <main className="flex-1 flex flex-col w-full relative z-10 pt-20 lg:pt-32 pb-32">
          
          {/* Hero Section */}
          <section className="px-6 max-w-[1200px] mx-auto w-full flex flex-col items-center text-center mb-32 opacity-0 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/60 mb-8 shadow-sm bg-white/40 backdrop-blur-md">
              <Building className="w-3 h-3 text-[#1d2846]" />
              <span className="text-[10px] font-bold text-[#1d2846] uppercase tracking-[0.2em]">Enterprise Vision</span>
            </div>
            
            <h1 className="text-6xl lg:text-[6.5rem] leading-[1.05] font-bold tracking-tight mb-8">
              <span className="text-gradient">Redefining Time.</span><br />
              <span className="text-[#1d2846]">Elevating Hospitality.</span>
            </h1>
            
            <p className="text-[#949492] text-xl lg:text-2xl max-w-[800px] leading-[1.7] font-medium mb-12">
              MyanPace is Myanmar's premier digital infrastructure for waitlist optimization and queue management. We eradicate the friction of waiting, restoring dignity to the dining experience while driving merchant revenue.
            </p>
          </section>

          {/* Mission Image Section */}
          <section className="max-w-[1300px] mx-auto w-full px-6 mb-40 opacity-0 animate-slide-up-delayed">
            <div className="glass-card overflow-hidden border-0 bg-white/30 p-2 lg:p-4 rounded-[2.5rem]">
              <div className="relative w-full h-[500px] lg:h-[700px] rounded-[2rem] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=2000&auto=format&fit=crop&q=80" 
                  alt="Premium Dining Experience" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-[#1d2846]/20 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1d2846]/80 via-transparent to-transparent"></div>
                
                <div className="absolute bottom-10 left-10 lg:bottom-16 lg:left-16 right-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                  <div>
                    <p className="text-white/80 font-bold uppercase tracking-[0.2em] text-xs mb-3">Our Mission</p>
                    <h2 className="text-3xl lg:text-5xl font-bold text-white leading-tight max-w-[600px]">
                      To seamlessly bridge the gap between demand and capacity.
                    </h2>
                  </div>
                  <div className="glass-card !bg-white/10 !border-white/20 !backdrop-blur-xl px-8 py-6 rounded-3xl shrink-0 text-white">
                    <p className="text-4xl font-bold mb-1">2.4M+</p>
                    <p className="text-sm uppercase tracking-wider opacity-80 font-medium">Hours Saved Annually</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Split Content Section */}
          <section className="max-w-[1200px] mx-auto w-full px-6 mb-40 opacity-0 animate-slide-up-slow">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div className="order-2 lg:order-1">
                <div className="relative w-full h-[600px] rounded-[2.5rem] overflow-hidden border border-white/60 shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&auto=format&fit=crop&q=80" 
                    alt="Restaurant Management Dashboard" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                  
                  {/* Floating Dashboard Widget */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] bg-white/90 backdrop-blur-2xl p-6 rounded-3xl shadow-[0_20px_60px_rgba(29,40,70,0.15)] border border-white">
                    <div className="flex justify-between items-center border-b border-[#d6d6d5] pb-4 mb-4">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest font-bold text-[#949492] mb-1">Live Status</p>
                        <p className="text-[#1d2846] font-bold text-lg">System Optimization</p>
                      </div>
                      <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-[#949492] font-bold uppercase tracking-wider mb-1">Table Throughput</p>
                        <div className="w-full bg-[#f3f4f5] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#1d2846] w-[94%] h-full"></div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#949492] font-bold uppercase tracking-wider mb-1">Guest Retention</p>
                        <div className="w-full bg-[#f3f4f5] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#1d2846] w-[98%] h-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-1 lg:order-2 flex flex-col items-start">
                <h2 className="text-4xl lg:text-5xl font-bold text-[#1d2846] leading-[1.1] mb-8 tracking-tight">
                  The End of <br /><span className="text-[#949492] italic font-light">Physical Waiting.</span>
                </h2>
                <p className="text-[#1d2846]/80 text-lg leading-relaxed font-medium mb-6">
                  Before MyanPace, dining at premium venues meant unpredictability, crowded entrances, and frustrated patrons. The traditional walk-in model was fundamentally broken, causing restaurants to lose revenue and diners to lose their most precious resource: time.
                </p>
                <p className="text-[#1d2846]/80 text-lg leading-relaxed font-medium mb-12">
                  We architected a unified commercial ecosystem. By shifting the physical queue into a smart, predictive digital environment, we empower patrons to wait on their own terms while providing merchants with granular data to optimize table turnover and capture lost sales.
                </p>
                
                <div className="grid grid-cols-2 gap-8 w-full">
                  <div>
                    <p className="text-5xl font-bold text-[#1d2846] mb-2">98%</p>
                    <p className="text-xs uppercase tracking-widest font-bold text-[#949492]">Reduction in Walkaways</p>
                  </div>
                  <div>
                    <p className="text-5xl font-bold text-[#1d2846] mb-2">300+</p>
                    <p className="text-xs uppercase tracking-widest font-bold text-[#949492]">Active Enterprise Partners</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="max-w-[1300px] mx-auto w-full px-6 mb-32 opacity-0 animate-slide-up-slow">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#1d2846] mb-4 tracking-tight">Architected for Scale</h2>
              <p className="text-[#949492] text-lg font-medium max-w-[600px] mx-auto">The foundational pillars that make MyanPace the industry standard for commercial hospitality management.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-card p-10 lg:p-12 flex flex-col group">
                <div className="w-16 h-16 rounded-2xl bg-white/60 flex items-center justify-center text-[#1d2846] mb-8 shadow-sm border border-white group-hover:scale-110 transition-transform duration-500">
                  <Cpu className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-[#1d2846] mb-4">PaceAI Infrastructure</h3>
                <p className="text-[#1d2846]/70 font-medium leading-relaxed">
                  Our proprietary machine learning algorithms analyze historical seating data, group sizes, and live dining durations to predict wait times with unprecedented accuracy.
                </p>
              </div>

              <div className="glass-card p-10 lg:p-12 flex flex-col group">
                <div className="w-16 h-16 rounded-2xl bg-white/60 flex items-center justify-center text-[#1d2846] mb-8 shadow-sm border border-white group-hover:scale-110 transition-transform duration-500">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-[#1d2846] mb-4">Enterprise Security</h3>
                <p className="text-[#1d2846]/70 font-medium leading-relaxed">
                  Built on a zero-trust architecture. We protect venue operational data and consumer privacy with military-grade encryption and secure token verification.
                </p>
              </div>

              <div className="glass-card p-10 lg:p-12 flex flex-col group">
                <div className="w-16 h-16 rounded-2xl bg-white/60 flex items-center justify-center text-[#1d2846] mb-8 shadow-sm border border-white group-hover:scale-110 transition-transform duration-500">
                  <Network className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-[#1d2846] mb-4">Seamless Integration</h3>
                <p className="text-[#1d2846]/70 font-medium leading-relaxed">
                  A frictionless ecosystem that connects diners, front-of-house staff, and corporate management across multiple branches through a single, unified interface.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="max-w-[1200px] mx-auto w-full px-6 opacity-0 animate-slide-up-slow">
            <div className="glass-card p-12 lg:p-20 text-center relative overflow-hidden bg-white/40">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1600&auto=format&fit=crop&q=80')] opacity-[0.03] bg-cover bg-center"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-[#1d2846] rounded-2xl flex items-center justify-center text-[#f3f4f5] shadow-xl font-bold text-2xl mb-8">
                  MP
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-[#1d2846] mb-6 tracking-tight">Join the Ecosystem.</h2>
                <p className="text-[#1d2846]/70 text-lg lg:text-xl max-w-[600px] mx-auto mb-12 font-medium">
                  Whether you are a diner looking to reclaim your time or an enterprise ready to optimize operations, the future of hospitality is here.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <a href="/shops" className="px-10 py-5 rounded-2xl bg-[#1d2846] text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center">
                    Explore Venues
                  </a>
                  <button className="px-10 py-5 rounded-2xl bg-white/80 backdrop-blur-md border border-white text-[#1d2846] font-bold text-lg shadow-sm hover:bg-white transition-all">
                    Partner With Us
                  </button>
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}