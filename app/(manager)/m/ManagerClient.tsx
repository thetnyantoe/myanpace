"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

type QueueStatus = "PENDING" | "NOTIFIED" | "SERVING";

interface Ticket {
  id: string;
  ticketNo: number;
  status: QueueStatus;
  createdAt: string;
  notifiedAt: string | null;
  servedAt: string | null;
  customerId: string | null;
  shopId: string;
  personCount: number;
  subscription: any | null;
}

interface Shop {
  id: string;
  name: string;
  brandId: string;
  location: string;
  is_available: boolean;
  password: string | null;
  description: string | null;
  categoryId: number | null;
  distance: number | null;
  price: number | null;
  menu: string | null;
  image: string | null;
}

interface ManagerPageProps {
  shopId?: string;
}

const STATUSES: QueueStatus[] = ["PENDING", "NOTIFIED", "SERVING"];

const STATUS_ICONS: Record<QueueStatus, string> = {
  PENDING: "fa-clock",
  NOTIFIED: "fa-bullhorn",
  SERVING: "fa-chair",
};

const STATUS_CONFIG: Record<
  QueueStatus,
  { badgeClass: string; dotClass: string }
> = {
  PENDING: {
    badgeClass: "bg-yellow-50 border border-yellow-100 text-yellow-700",
    dotClass: "bg-yellow-500",
  },
  NOTIFIED: {
    badgeClass: "bg-blue-50 border border-blue-100 text-blue-600",
    dotClass: "bg-blue-500 animate-pulse",
  },
  SERVING: {
    badgeClass: "bg-green-50 border border-green-100 text-green-700",
    dotClass: "bg-green-500",
  },
};

function timeAgo(dateString: string): string {
  const minAgo = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 60000,
  );
  return minAgo <= 0 ? "Just now" : `${minAgo}m ago`;
}

function ShopAvatar({
  shop,
  size = "md",
}: {
  shop: Shop;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg" ? "w-24 h-24" : size === "md" ? "w-10 h-10" : "w-8 h-8";
  const text = size === "lg" ? "text-3xl" : "text-base";
  const initials = shop.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (shop.image) {
    return (
      <img
        src={shop.image}
        alt={shop.name}
        className={`${dim} rounded-full object-cover border-2 border-white shadow-sm bg-gray-100 p-0.5`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-[#0f172a] flex items-center justify-center text-white font-bold ${text} border-2 border-white shadow-sm`}
    >
      {initials}
    </div>
  );
}

export default function App({ shopId: propShopId }: ManagerPageProps) {
  const [shopId, setShopId] = useState<string | null>(propShopId ?? null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const [activeStatus, setActiveStatus] = useState<QueueStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ message: "", visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!propShopId) {
      setShopLoading(false);
      setShopError("No shop session found. Please log in.");
    }
  }, [propShopId]);

  useEffect(() => {
    if (!shopId) return;

    const fetchShop = async () => {
      setShopLoading(true);
      setShopError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("Shop")
        .select(
          "id, name, brandId, location, is_available, password, description, categoryId, distance, price, menu, image",
        )
        .eq("id", shopId)
        .single();

      if (error || !data) {
        setShopError(error?.message ?? "Shop not found.");
        setShop(null);
      } else {
        setShop(data as Shop);
      }
      setShopLoading(false);
    };

    fetchShop();
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;

    const fetchTickets = async () => {
      setTicketsLoading(true);
      setTicketsError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("Ticket")
        .select(
          "id, ticketNo, status, createdAt, notifiedAt, servedAt, customerId, shopId, personCount, subscription",
        )
        .eq("shopId", shopId)
        .order("createdAt", { ascending: false });

      if (error) {
        setTicketsError(error.message);
        setTickets([]);
      } else {
        setTickets((data ?? []) as Ticket[]);
      }
      setTicketsLoading(false);
    };

    fetchTickets();
  }, [shopId]);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = setTimeout(
      () => setToast((p) => ({ ...p, visible: false })),
      3500,
    );
  }, []);

  const changeStatus = useCallback(
    async (id: string, ticketNo: number, newStatus: QueueStatus) => {
      const now = new Date().toISOString();

      setTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: newStatus,
                notifiedAt: newStatus === "NOTIFIED" ? now : t.notifiedAt,
                servedAt: newStatus === "SERVING" ? now : t.servedAt,
              }
            : t,
        ),
      );

      const supabase = createClient();
      const patch: Partial<Ticket> = { status: newStatus };
      if (newStatus === "NOTIFIED") patch.notifiedAt = now;
      if (newStatus === "SERVING") patch.servedAt = now;

      const { error } = await supabase
        .from("Ticket")
        .update(patch)
        .eq("id", id);

      if (error) {
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: t.status } : t)),
        );
        showToast(`Failed to update ticket #${ticketNo}: ${error.message}`);
        return;
      }

      const icons: Record<QueueStatus, string> = {
        NOTIFIED: '<i class="fa-solid fa-bullhorn" style="color:#60a5fa"></i>',
        SERVING: '<i class="fa-solid fa-chair" style="color:#4ade80"></i>',
        PENDING: '<i class="fa-solid fa-clock" style="color:#facc15"></i>',
      };
      showToast(
        `${icons[newStatus]} Ticket <span style="font-family:monospace;color:#60a5fa;margin-left:4px">#${ticketNo}</span> moved to ${newStatus}`,
      );
    },
    [showToast],
  );

  const deleteTicket = useCallback(
    async (id: string, ticketNo: number) => {
      setTickets((prev) => prev.filter((t) => t.id !== id));

      const supabase = createClient();
      const { error } = await supabase.from("Ticket").delete().eq("id", id);

      if (error) {
        showToast(`Failed to cancel ticket #${ticketNo}: ${error.message}`);
        return;
      }

      showToast(
        `<i class="fa-solid fa-trash-can" style="color:#f87171"></i> Ticket <span style="font-family:monospace;color:#60a5fa;margin-left:4px">#${ticketNo}</span> cancelled`,
      );
    },
    [showToast],
  );

  const handleSignOut = useCallback(() => {
    showToast("Securely logging out...");
    document.cookie =
      "backendtestui_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
  }, [showToast]);

  const countByStatus = (s: QueueStatus) =>
    tickets.filter((t) => t.status === s).length;

  const filtered = tickets.filter(
    (t) =>
      t.status === activeStatus &&
      (t.ticketNo.toString().includes(search) ||
        t.id.toLowerCase().includes(search.toLowerCase())),
  );

  if (!shopId && !shopLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8fafc]">
        <div className="text-center">
          <p className="text-gray-500 font-medium mb-4">{shopError}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-[#0f172a] text-white rounded-xl font-bold text-sm"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />

      <style>{`
        .glass-dock {
          background: rgba(255,255,255,0.50);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 20px 40px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .glass-card {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,1);
        }
        @keyframes blob {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(30px,-50px) scale(1.1); }
          66%  { transform: translate(-20px,20px) scale(0.9); }
          100% { transform: translate(0,0) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes slideUp {
          from { transform:translateY(30px); opacity:0 }
          to   { transform:translateY(0);    opacity:1 }
        }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes shimmer {
          0%   { background-position: -400px 0 }
          100% { background-position:  400px 0 }
        }
        .skeleton {
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 999px;
        }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
      `}</style>

      <section className="flex flex-col h-screen overflow-hidden relative animate-slide-up bg-[#f8fafc]">
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-white/80 to-transparent pointer-events-none z-40" />
        <div className="absolute bottom-10 left-1/4 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob pointer-events-none z-0" />

        <header className="z-30 shrink-0 bg-[#f8fafc]/90 backdrop-blur-md sticky top-0 border-b border-gray-200/50">
          <div className="flex items-center justify-between px-4 sm:px-8 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                {shopLoading ? (
                  <div className="skeleton w-10 h-10 rounded-full" />
                ) : shop ? (
                  <ShopAvatar shop={shop} size="sm" />
                ) : null}

                <div className="flex flex-col">
                  {shopLoading ? (
                    <div className="skeleton h-4 w-24" />
                  ) : shopError ? (
                    <span className="text-sm font-bold text-red-500">
                      {shopError}
                    </span>
                  ) : (
                    <h1 className="font-bold text-lg sm:text-xl text-[#0f172a] leading-none tracking-tight">
                      {shop!.name}
                    </h1>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        shop?.is_available !== false
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-400"
                      }`}
                    />
                    {shop && !shop.is_available && (
                      <span className="text-[10px] font-semibold text-red-400">
                        Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {shop?.location && (
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">
                    Location
                  </span>
                  <span className="text-sm font-bold text-[#0f172a] leading-none">
                    {shop.location}
                  </span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden relative hover:bg-gray-50 transition-all active:scale-95"
                title="Sign out"
              >
                <i className="fa-solid fa-right-from-bracket text-gray-400 text-lg" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-8 py-5 flex flex-col gap-3 shrink-0 z-20 relative">
          <div className="relative w-full max-w-3xl mx-auto">
            <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Ticket No..."
              className="w-full bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-full pl-14 pr-6 py-4 text-sm sm:text-base font-medium text-[#0f172a] placeholder:text-gray-400 focus:outline-none focus:border-[#3b82f6] focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="flex items-center max-w-3xl mx-auto w-full px-4 gap-3">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
              {filtered.length} Ticket{filtered.length !== 1 ? "s" : ""}
            </span>
            {ticketsLoading && (
              <span className="text-xs text-blue-500 font-medium flex items-center gap-1.5">
                <i className="fa-solid fa-circle-notch fa-spin" /> Loading...
              </span>
            )}
            {ticketsError && (
              <span className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation" />{" "}
                {ticketsError}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-40 z-10 relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="max-w-[1600px] mx-auto w-full">
            {ticketsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 pb-10">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[32px] p-5 border border-gray-200 h-72 flex flex-col gap-4"
                  >
                    <div className="skeleton h-5 w-24 rounded-full" />
                    <div className="skeleton h-12 w-20 mx-auto rounded-xl" />
                    <div className="skeleton h-28 w-28 mx-auto rounded-2xl" />
                    <div className="skeleton h-10 w-full rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-gray-100">
                  <i className="fa-solid fa-inbox text-5xl text-gray-300" />
                </div>
                <h3 className="font-bold text-[#0f172a] text-xl sm:text-2xl mb-2 tracking-tight">
                  No Tickets Found
                </h3>
                <p className="text-sm sm:text-base text-gray-500 font-medium max-w-xs mx-auto">
                  No tickets match this status or search criteria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 pb-10">
                {filtered.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onChangeStatus={changeStatus}
                    onDelete={deleteTicket}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <nav className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[95%] sm:w-auto max-w-3xl glass-dock rounded-full px-3 py-3 flex items-center justify-between shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)]">
          <div className="flex w-full sm:w-auto gap-2">
            {STATUSES.map((s) => {
              const count = countByStatus(s);
              const isActive = activeStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setActiveStatus(s)}
                  className={`relative flex-1 sm:flex-none sm:w-28 flex flex-col items-center justify-center py-3 sm:py-3.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[#0f172a] text-white shadow-lg"
                      : "text-gray-500 hover:text-[#0f172a] hover:bg-gray-100/60 scale-95 hover:scale-100"
                  }`}
                >
                  <div className="relative mb-1">
                    <i
                      className={`fa-solid ${STATUS_ICONS[s]} text-[22px] sm:text-[24px] ${
                        isActive && s === "NOTIFIED"
                          ? "text-blue-300 animate-bounce"
                          : ""
                      } ${isActive && s === "SERVING" ? "text-green-300" : ""}`}
                    />
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-3 min-w-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md border border-white">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold capitalize tracking-wide ${isActive ? "opacity-100" : "opacity-80"}`}
                  >
                    {s.toLowerCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className={`fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${
            toast.visible
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div
            className="bg-[#0f172a] text-white px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl border border-white/10 flex items-center gap-2 whitespace-nowrap"
            dangerouslySetInnerHTML={{ __html: toast.message }}
          />
        </div>
      </section>
    </>
  );
}

function TicketCard({
  ticket,
  onChangeStatus,
  onDelete,
}: {
  ticket: Ticket;
  onChangeStatus: (id: string, ticketNo: number, s: QueueStatus) => void;
  onDelete: (id: string, ticketNo: number) => void;
}) {
  const { badgeClass, dotClass } = STATUS_CONFIG[ticket.status];
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticket.id}&color=0f172a&bgcolor=ffffff&margin=1`;

  return (
    <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center animate-fade-in group h-full">
      <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-gray-100/80">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${badgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none pt-0.5">
            {ticket.status}
          </span>
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
          <i className="fa-regular fa-clock" /> {timeAgo(ticket.createdAt)}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full py-2">
        <div className="flex items-center gap-3 mb-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">
            Ticket No.
          </p>
          <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <i className="fa-solid fa-user" /> x {ticket.personCount}
          </span>
        </div>
        <h3 className="text-[2.25rem] sm:text-[2.75rem] font-bold text-[#0f172a] tracking-widest select-all leading-none font-mono mb-4">
          #{ticket.ticketNo}
        </h3>
        <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white rounded-2xl border-2 border-dashed border-gray-200 p-2.5 group-hover:border-blue-400/40 transition-colors mb-2 flex items-center justify-center">
          <img
            src={qrUrl}
            alt={`QR for Ticket ${ticket.id}`}
            className="w-full h-full object-contain mix-blend-multiply"
            loading="lazy"
          />
        </div>
      </div>

      {ticket.status === "PENDING" && (
        <div className="flex gap-2 w-full mt-3 pt-4 border-t border-dashed border-gray-100">
          <button
            onClick={() =>
              onChangeStatus(ticket.id, ticket.ticketNo, "NOTIFIED")
            }
            className="flex-1 py-3 bg-[#0f172a] text-white text-sm font-bold rounded-2xl hover:bg-[#3b82f6] transition-colors shadow-sm active:scale-95"
          >
            Call Ticket
          </button>
          <button
            onClick={() => onDelete(ticket.id, ticket.ticketNo)}
            className="w-12 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center shrink-0 active:scale-95"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
      {ticket.status === "NOTIFIED" && (
        <div className="flex gap-2 w-full mt-3 pt-4 border-t border-dashed border-gray-100">
          <button
            onClick={() =>
              onChangeStatus(ticket.id, ticket.ticketNo, "SERVING")
            }
            className="flex-1 py-3 bg-green-500 text-white text-sm font-bold rounded-2xl hover:bg-green-600 transition-colors shadow-sm active:scale-95"
          >
            Reserve
          </button>
          <button
            onClick={() =>
              onChangeStatus(ticket.id, ticket.ticketNo, "PENDING")
            }
            className="w-12 bg-gray-50 text-gray-500 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-all flex items-center justify-center shrink-0 active:scale-95"
          >
            <i className="fa-solid fa-rotate-left" />
          </button>
        </div>
      )}
      {ticket.status === "SERVING" && (
        <div className="w-full mt-3 pt-4 border-t border-dashed border-gray-100 py-3 bg-gray-50 text-[#0f172a] text-sm font-bold rounded-2xl text-center flex items-center justify-center gap-2">
          <i className="fa-solid fa-chair text-green-500" /> SERVING
        </div>
      )}
    </div>
  );
}
