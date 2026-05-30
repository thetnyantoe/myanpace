"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { computeTimerState, formatCountdown } from "@/lib/queue/timer";
import type { QueueTicket, StaffFilter, TicketStatus } from "@/lib/queue/types";
import {
  ACTIVE_QUEUE_STATUSES,
  isTerminalStatus,
  STATUS_LABELS,
} from "@/lib/queue/types";
import {
  fetchShopTickets,
  updateQueueTicketStatus,
} from "@/backend/queue";

interface Shop {
  id: string;
  name: string;
  location: string | null;
  is_available: boolean;
  image: string | null;
}

interface ManagerPageProps {
  shopId?: string;
}

type DashboardFilter = StaffFilter | "active";

const FILTER_TABS: { key: DashboardFilter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "PENDING", label: "Waiting" },
  { key: "NOTIFIED", label: "Called" },
  { key: "SERVING", label: "Serving" },
  { key: "COMPLETED", label: "Completed" },
  { key: "NOSHOW", label: "No Show" },
  { key: "all", label: "All" },
];

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function ShopAvatar({ shop, size = "md" }: { shop: Shop; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-10 h-10" : "w-8 h-8";
  const initials = shop.name.charAt(0).toUpperCase();

  if (shop.image) {
    return (
      <img
        src={shop.image}
        alt={shop.name}
        className={`${dim} rounded-full object-cover border-2 border-white shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow-sm`}
    >
      {initials}
    </div>
  );
}

export default function ManagerClient({ shopId: propShopId }: ManagerPageProps) {
  const [shopId] = useState<string | null>(propShopId ?? null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);

  const [tokens, setTokens] = useState<QueueTicket[]>([]);
  const [staffFilter, setStaffFilter] = useState<DashboardFilter>("active");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [toast, setToast] = useState({ message: "", visible: false, type: "info" as "success" | "error" | "info" });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const notifiedWarningRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!propShopId) {
      setShopLoading(false);
      setShopError("No shop session found. Please log in.");
    }
  }, [propShopId]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ message, visible: true, type });
      toastTimer.current = setTimeout(
        () => setToast((p) => ({ ...p, visible: false })),
        3500,
      );
    },
    [],
  );

  const initShopData = useCallback(async () => {
    if (!shopId) return;

    notifiedWarningRef.current.clear();
    const result = await fetchShopTickets(shopId);

    if (!result.ok) {
      console.error("Load error:", result.error);
      showToast(result.error || "Failed to load queue", "error");
      return;
    }

    setTokens((result.data ?? []) as QueueTicket[]);
  }, [shopId, showToast]);

  useEffect(() => {
    if (!shopId) return;

    const fetchShop = async () => {
      setShopLoading(true);
      setShopError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("Shop")
        .select("id, name, location, is_available, image")
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
    initShopData();
  }, [shopId, initShopData]);

  useEffect(() => {
    if (!shopId) return;

    const poll = setInterval(() => {
      initShopData();
    }, 4000);

    const supabase = createClient();
    const channel = supabase
      .channel(`queue_${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Ticket",
          filter: `shopId=eq.${shopId}`,
        },
        () => {
          initShopData();
        },
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [shopId, initShopData]);

  const updateStatus = useCallback(
    async (tokenId: string, newStatus: TicketStatus) => {
      const token = tokens.find((t) => t.id === tokenId);
      const nowIso = new Date().toISOString();

      setTokens((prev) =>
        prev.map((t) => {
          if (t.id !== tokenId) return t;
          return {
            ...t,
            status: newStatus,
            notifiedAt: newStatus === "NOTIFIED" ? nowIso : t.notifiedAt,
            servedAt: newStatus === "COMPLETED" ? nowIso : t.servedAt,
          };
        }),
      );

      const result = await updateQueueTicketStatus(tokenId, newStatus);

      if (!result.ok) {
        showToast(result.error || "Update failed", "error");
        await initShopData();
        return;
      }

      showToast(
        `Ticket #${token?.ticketNo ?? "?"} → ${STATUS_LABELS[newStatus]}`,
        newStatus === "NOSHOW" ? "info" : "success",
      );

      // Notifications (#3 your turn, #5 cancel, #6 finish) fire server-side
      // from updateQueueTicketStatus so they work even when no browser tab is
      // open. Manager just sees the local toast above.

      if (newStatus === "COMPLETED" || newStatus === "NOSHOW") {
        notifiedWarningRef.current.delete(tokenId);
        notifiedWarningRef.current.delete(`${tokenId}_canceled`);
      }
    },
    [tokens, shop?.name, showToast, initShopData],
  );

  // The 3-minute warning (#4) and 4-minute auto-cancel (#5a) are driven by
  // the Supabase queue-tick edge function on a pg_cron schedule — they run
  // even when no browser tab is open. The dashboard just observes the
  // resulting status/warnedAt change via realtime.

  const closeScanner = useCallback(async () => {
    setIsScannerOpen(false);
    setScannerReady(false);
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
      } catch {
        // scanner may already be cleared
      }
      scannerRef.current = null;
    }
  }, []);

  const openScanner = useCallback(async () => {
    setIsScannerOpen(true);
    setScannerReady(false);

    const { Html5QrcodeScanner } = await import("html5-qrcode");
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: 220, aspectRatio: 1 },
        false,
      );
      scannerRef.current = scanner;
      scanner.render(
        (text) => {
          void closeScanner();
          const token = tokens.find((t) => t.id === text);
          if (!token) {
            showToast("Ticket not found for this shop!", "error");
            return;
          }
          if (isTerminalStatus(token.status)) {
            showToast(
              `Ticket #${token.ticketNo} already ${STATUS_LABELS[token.status].toLowerCase()}`,
              "error",
            );
            return;
          }
          updateStatus(token.id, "COMPLETED");
        },
        () => {},
      );
      setScannerReady(true);
    }, 100);
  }, [tokens, showToast, updateStatus, closeScanner]);

  const counts = useMemo(() => {
    const c = {
      PENDING: 0,
      NOTIFIED: 0,
      SERVING: 0,
      COMPLETED: 0,
      NOSHOW: 0,
      active: 0,
      all: tokens.length,
      servedToday: 0,
      noshowToday: 0,
    };
    for (const t of tokens) {
      c[t.status]++;
      if (ACTIVE_QUEUE_STATUSES.includes(t.status)) c.active++;
      if (t.status === "COMPLETED" && t.servedAt && isToday(t.servedAt))
        c.servedToday++;
      // Prefer noshowAt (the moment the ticket was marked NOSHOW). Fall back
      // to createdAt only for legacy rows that pre-date the noshowAt column.
      if (
        t.status === "NOSHOW" &&
        isToday(t.noshowAt ?? t.createdAt)
      )
        c.noshowToday++;
    }
    return c;
  }, [tokens]);

  const completionRate = useMemo(() => {
    const total = counts.servedToday + counts.noshowToday;
    if (total === 0) return null;
    return Math.round((counts.servedToday / total) * 100);
  }, [counts.servedToday, counts.noshowToday]);

  const filteredTokens = useMemo(() => {
    const sorted = [...tokens].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    if (staffFilter === "all") return sorted;
    if (staffFilter === "active")
      return sorted.filter((t) => ACTIVE_QUEUE_STATUSES.includes(t.status));
    return sorted.filter((t) => t.status === staffFilter);
  }, [tokens, staffFilter]);

  const showCompactCards =
    staffFilter === "COMPLETED" || staffFilter === "NOSHOW";

  const handleSignOut = useCallback(() => {
    showToast("Logged out successfully", "info");
    document.cookie =
      "backendtestui_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  }, [showToast]);

  if (!shopId && !shopLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-medium mb-4">{shopError}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        #qr-reader { border: none !important; background: #0f172a; border-radius: 0.75rem; overflow: hidden; }
        #qr-reader video { object-fit: cover; border-radius: 0.75rem; }
        #qr-reader button { background: #059669 !important; color: #fff !important; padding: 8px 16px !important; border-radius: 0.5rem !important; border: none !important; margin: 6px 4px !important; font-weight: 600 !important; cursor: pointer; }
        #qr-reader select { padding: 8px !important; border-radius: 0.5rem !important; border: 1px solid #cbd5e1 !important; margin-bottom: 10px !important; width: 100%; }
        #qr-reader a { display: none !important; }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.35); }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
        }
        .ring-pulse { animation: pulse-ring 2s infinite; }
      `}</style>

      <section className="min-h-screen bg-slate-50 flex flex-col p-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {shopLoading ? (
                <div className="h-12 w-12 bg-slate-200 rounded-full animate-pulse" />
              ) : shop ? (
                <ShopAvatar shop={shop} />
              ) : null}
              <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">
                  {shop?.name ?? "Queue Dashboard"}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {shop?.location || "Manage today's queue and customer flow"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openScanner}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-sm text-sm"
              >
                📷 Scan QR
              </button>
              <button
                onClick={handleSignOut}
                className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 px-3 py-2.5 rounded-xl font-semibold transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
            <StatCard
              label="Waiting"
              value={counts.PENDING}
              accent="amber"
              hint="In queue"
            />
            <StatCard
              label="Called"
              value={counts.NOTIFIED}
              accent="blue"
              hint="Heading in"
              pulse={counts.NOTIFIED > 0}
            />
            <StatCard
              label="Serving"
              value={counts.SERVING}
              accent="indigo"
              hint="At counter"
            />
            <StatCard
              label="Served Today"
              value={counts.servedToday}
              accent="emerald"
              hint={
                completionRate !== null
                  ? `${completionRate}% completion`
                  : "No data yet"
              }
            />
            <StatCard
              label="No-shows Today"
              value={counts.noshowToday}
              accent="rose"
              hint={
                counts.noshowToday > 0 ? "Review timing" : "Clean record"
              }
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTER_TABS.map(({ key, label }) => {
            const active = staffFilter === key;
            const count =
              key === "all"
                ? counts.all
                : key === "active"
                  ? counts.active
                  : counts[key as TicketStatus];
            return (
              <button
                key={key}
                onClick={() => setStaffFilter(key)}
                className={`shrink-0 px-3.5 py-2 rounded-xl font-bold text-sm border transition-all flex items-center gap-2 ${
                  active
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {filteredTokens.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-5xl mb-3">☕</p>
            <p className="font-bold text-slate-600">
              {staffFilter === "active"
                ? "No active tickets"
                : staffFilter === "all"
                  ? "No tickets yet"
                  : `No ${STATUS_LABELS[staffFilter as TicketStatus]?.toLowerCase() ?? ""} tickets`}
            </p>
            <p className="text-sm mt-0.5">
              {staffFilter === "active"
                ? "Queue is clear — ready for the next customer."
                : "Check back as new tickets come in."}
            </p>
          </div>
        ) : showCompactCards ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {filteredTokens.map((token, i) => (
              <CompactTokenRow
                key={token.id}
                token={token}
                isLast={i === filteredTokens.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTokens
              .filter((t) => ACTIVE_QUEUE_STATUSES.includes(t.status))
              .map((token) => (
                <StaffTokenCard
                  key={token.id}
                  token={token}
                  currentTime={currentTime}
                  onUpdateStatus={updateStatus}
                />
              ))}
            {filteredTokens.some((t) => isTerminalStatus(t.status)) && (
              <div className="col-span-full mt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Closed
                </p>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {filteredTokens
                    .filter((t) => isTerminalStatus(t.status))
                    .map((token, i, arr) => (
                      <CompactTokenRow
                        key={token.id}
                        token={token}
                        isLast={i === arr.length - 1}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Scan QR Code</h3>
              <button
                onClick={closeScanner}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-100">
              <div id="qr-reader" className="w-full min-h-[240px]" />
              {!scannerReady && (
                <p className="text-center text-sm text-slate-500 mt-3">
                  Starting camera...
                </p>
              )}
              <p className="text-center text-sm text-slate-500 mt-3">
                Point camera at customer&apos;s QR code
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed bottom-5 right-5 z-[200] transition-all duration-300 ${
          toast.visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div
          className={`text-white px-4 py-3 rounded-xl shadow-xl font-medium text-sm max-w-xs ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
                ? "bg-red-600"
                : "bg-indigo-600"
          }`}
        >
          {toast.message}
        </div>
      </div>
    </>
  );
}

const ACCENT_CLASSES: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-100" },
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    ring: "ring-indigo-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-100",
  },
  rose: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-100" },
};

function StatCard({
  label,
  value,
  hint,
  accent,
  pulse = false,
}: {
  label: string;
  value: number;
  hint?: string;
  accent: keyof typeof ACCENT_CLASSES;
  pulse?: boolean;
}) {
  const a = ACCENT_CLASSES[accent];
  return (
    <div
      className={`relative ${a.bg} rounded-xl px-4 py-3 ring-1 ${a.ring} overflow-hidden`}
    >
      {pulse && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      <p
        className={`text-[11px] font-bold uppercase tracking-wider ${a.text} opacity-80`}
      >
        {label}
      </p>
      <p className="text-3xl font-black text-slate-900 leading-tight mt-0.5">
        {value}
      </p>
      {hint && (
        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{hint}</p>
      )}
    </div>
  );
}

function CompactTokenRow({
  token,
  isLast,
}: {
  token: QueueTicket;
  isLast: boolean;
}) {
  const time = new Date(token.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isCompleted = token.status === "COMPLETED";
  const formattedId = `#${String(token.ticketNo).padStart(3, "0")}`;

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        isLast ? "" : "border-b border-slate-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-1 h-8 rounded-full ${
            isCompleted ? "bg-emerald-400" : "bg-rose-400"
          }`}
        />
        <span className="font-black text-slate-800 text-lg tracking-tight">
          {formattedId}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            isCompleted
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {isCompleted ? "DONE" : "NO SHOW"}
        </span>
      </div>
      <span className="text-xs text-slate-400 font-medium">{time}</span>
    </div>
  );
}

function StaffTokenCard({
  token,
  currentTime,
  onUpdateStatus,
}: {
  token: QueueTicket;
  currentTime: number;
  onUpdateStatus: (id: string, status: TicketStatus) => void;
}) {
  const statusCfg = {
    PENDING: {
      bar: "bg-amber-400",
      badge: "bg-amber-50 text-amber-700",
      label: "WAITING",
    },
    NOTIFIED: {
      bar: "bg-blue-500",
      badge: "bg-blue-50 text-blue-700",
      label: "CALLED",
    },
    SERVING: {
      bar: "bg-indigo-500",
      badge: "bg-indigo-50 text-indigo-700",
      label: "SERVING",
    },
    COMPLETED: {
      bar: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700",
      label: "DONE",
    },
    NOSHOW: {
      bar: "bg-red-400",
      badge: "bg-red-50 text-red-600",
      label: "NO SHOW",
    },
  }[token.status];

  const time = new Date(token.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedId = `#${String(token.ticketNo).padStart(3, "0")}`;

  const timerState =
    token.status === "NOTIFIED" && token.notifiedAt
      ? computeTimerState(token.notifiedAt, currentTime)
      : null;

  let buttons: React.ReactNode = null;

  if (token.status === "PENDING") {
    buttons = (
      <>
        <button
          onClick={() => onUpdateStatus(token.id, "NOTIFIED")}
          className="flex-1 bg-blue-50 hover:bg-blue-500 text-blue-700 hover:text-white py-2.5 rounded-xl font-bold text-sm transition border border-blue-100"
        >
          Call
        </button>
        <button
          onClick={() => onUpdateStatus(token.id, "NOSHOW")}
          className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white py-2.5 px-3.5 rounded-xl font-bold transition border border-red-100"
        >
          ✕
        </button>
      </>
    );
  } else if (token.status === "NOTIFIED") {
    buttons = (
      <>
        <button
          onClick={() => onUpdateStatus(token.id, "SERVING")}
          className="flex-1 bg-indigo-50 hover:bg-indigo-500 text-indigo-700 hover:text-white py-2.5 rounded-xl font-bold text-sm transition border border-indigo-100"
        >
          Seat
        </button>
        <button
          onClick={() => onUpdateStatus(token.id, "COMPLETED")}
          className="flex-1 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white py-2.5 rounded-xl font-bold text-sm transition border border-emerald-100"
        >
          Complete
        </button>
        <button
          onClick={() => onUpdateStatus(token.id, "NOSHOW")}
          className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white py-2.5 px-3.5 rounded-xl font-bold transition border border-red-100"
        >
          ✕
        </button>
      </>
    );
  } else if (token.status === "SERVING") {
    buttons = (
      <>
        <button
          onClick={() => onUpdateStatus(token.id, "COMPLETED")}
          className="flex-1 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white py-2.5 rounded-xl font-bold text-sm transition border border-emerald-100"
        >
          Complete
        </button>
        <button
          onClick={() => onUpdateStatus(token.id, "NOSHOW")}
          className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white py-2.5 px-3.5 rounded-xl font-bold transition border border-red-100"
        >
          ✕
        </button>
      </>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${
        token.status === "NOTIFIED" ? "ring-2 ring-blue-300 ring-pulse" : ""
      }`}
    >
      <div className={`h-1.5 ${statusCfg.bar}`} />
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg ${statusCfg.badge}`}
          >
            {statusCfg.label}
          </span>
          <div className="flex items-center gap-2">
            {timerState && (
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                    timerState.inWarning || timerState.isUrgent
                      ? "bg-red-50 text-red-600"
                      : "bg-orange-50 text-orange-600"
                  }`}
                >
                  ⏱ {formatCountdown(timerState.displayMs)}
                </span>
                <span className="text-xs text-slate-400">
                  {timerState.inWarning ? "auto-cancel window" : "3-min window"}
                </span>
              </div>
            )}
            <span className="text-xs text-slate-400 font-medium">{time}</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 font-semibold tracking-widest uppercase mb-0.5">
          Ticket
        </p>
        <p className="text-5xl font-black tracking-tight text-slate-800 mb-1">
          {formattedId}
        </p>

        {timerState && (
          <p
            className={`text-xs font-semibold mt-2 ${
              timerState.inWarning
                ? "text-red-500"
                : timerState.isUrgent
                  ? "text-orange-500"
                  : "text-slate-400"
            }`}
          >
            {timerState.inWarning
              ? "⚠️ Auto-cancel window active"
              : timerState.isUrgent
                ? "⏳ Under 1 min left"
                : `Has ${formatCountdown(timerState.warnRemain)} to reach counter`}
          </p>
        )}

        <div className="flex gap-2 mt-4">{buttons}</div>
      </div>
    </div>
  );
}
