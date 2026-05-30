"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChartPie,
  ChevronLeft,
  ChevronRight,
  Plus,
  Store,
  LogOut,
} from "lucide-react";
import ShopTable from "./shoptable";
import AddShop from "./addshop";
import Image from "next/image";
import logo from "@/public/logo.jpg";

export default function Owner() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isDragging, setIsDragging] = useState(false);

  const [activePage, setActivePage] = useState("Overview");

  const sidebarRef = useRef<HTMLDivElement>(null);

  const pages = [
    {
      name: "Overview",
      icon: <ChartPie size={22} />,
    },
    {
      name: "Shops",
      icon: <Store size={22} />,
    },
    {
      name: "Add Shop",
      icon: <Plus size={22} />,
    },
  ];

  const toggleSidebar = () => {
    if (isCollapsed) {
      setSidebarWidth(280);
      setIsCollapsed(false);
    } else {
      setSidebarWidth(90);
      setIsCollapsed(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      let newWidth = e.clientX;

      if (newWidth < 90) newWidth = 90;
      if (newWidth > 400) newWidth = 400;

      setSidebarWidth(newWidth);

      if (newWidth <= 120) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      setIsDragging(false);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (sidebarWidth <= 120) {
        setSidebarWidth(90);
        setIsCollapsed(true);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, sidebarWidth]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f3f4f5] text-[#1d2846]">
      {/* SIDEBAR */}
      <aside
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className={`relative flex h-full shrink-0 flex-col border-r border-white/10 bg-[#1d2846] text-white shadow-2xl transition-all duration-300 ${
          isDragging ? "select-none" : ""
        }`}
      >
        {/* LOGO */}
        <div className="flex h-20 items-center border-b border-white/10 px-5">
          <div className="flex w-full items-center gap-3 overflow-hidden">
            <Image
              src={logo}
              width={50}
              height={50}
              className="size-10 rounded-md"
              alt="logo"
            />

            {!isCollapsed && (
              <span className="truncate text-lg font-extrabold tracking-tight jost">
                MyanPace
              </span>
            )}
          </div>
        </div>

        {/* RESIZER */}
        <div
          onMouseDown={() => {
            setIsDragging(true);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="absolute right-0 top-0 z-50 h-full w-[6px] cursor-col-resize hover:bg-white/10"
        />

        {/* TOGGLE */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-4 top-1/2 z-[60] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#d6d6d5] bg-white text-[#1d2846] shadow-md transition hover:bg-[#d6d6d5]"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* NAV */}
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-6">
          {!isCollapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              Main Menu
            </p>
          )}

          {pages.map((page) => {
            const isActive = activePage === page.name;

            return (
              <button
                key={page.name}
                onClick={() => setActivePage(page.name)}
                className={`group flex w-full items-center rounded-xl px-4 py-3.5 text-left transition-all ${
                  isActive ? "bg-white/15" : "hover:bg-white/5"
                }`}
              >
                <div className="flex w-7 shrink-0 justify-center text-white/80 transition group-hover:text-white">
                  {page.icon}
                </div>

                {!isCollapsed && (
                  <span className="ml-4 truncate text-sm font-medium text-white/90 group-hover:text-white">
                    {page.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="shrink-0 border-t border-white/10 bg-black/10 p-4">
          <div className="mb-4 flex items-center gap-3 overflow-hidden px-2">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white/20 shadow-sm">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSnMSq7jDv3F9bo02ZHgtC6LdSuR4cKyNFPUw&s"
                alt="Admin"
                className="h-full w-full object-cover"
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">
                  System Admin
                </p>

                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-white/60">
                  Super Admin
                </p>

                <p className="mt-0.5 truncate text-[11px] text-white/40">
                  admin@myanpace.com
                </p>
              </div>
            )}
          </div>

          <button className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white/10 py-3.5 text-white transition hover:bg-red-500/80">
            <LogOut
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />

            {!isCollapsed && (
              <span className="text-sm font-bold">Sign Out</span>
            )}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#f3f4f5]">
        {/* HEADER */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#d6d6d5] bg-white/50 px-8 backdrop-blur-md">
          <h1 className="text-2xl font-bold tracking-tight text-[#1d2846]">
            {activePage}
          </h1>

          <div className="flex items-center gap-4">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#d6d6d5] bg-white text-[#949492] shadow-sm transition hover:text-[#1d2846]">
              <Bell size={18} />

              <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full border border-white bg-red-500" />
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-[#1d2846]">May 29, 2026</p>

              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#949492]">
                Yangon Time
              </p>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          {activePage === "Shops" ? (
            <ShopTable />
          ) : activePage === "Add Shop" ? (
            <AddShop />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#d6d6d5] bg-white/40 p-8 text-center">
              <h2 className="mb-2 text-xl font-bold text-[#1d2846]">
                {activePage} Area
              </h2>
              <p className="max-w-sm text-sm text-[#949492]">
                This workspace is ready for your admin dashboard content.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
