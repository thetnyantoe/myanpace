"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import HeartIcon from "@/public/icons/heart";
import ClockIcon from "@/public/icons/clock";
import UsersIcon from "@/public/icons/users";
import TicketIcon from "@/public/icons/ticket";
import LocationIcon from "@/public/icons/location";
import QrIcon from "@/public/icons/qr";
import SlidersIcon from "@/public/icons/sliders";
import FilterIcon from "@/public/icons/filter";
import CrossIcon from "@/public/icons/cross";

const CALL_WINDOW_MS = 3 * 60 * 1000; // 3 minutes before warning
const TOTAL_WINDOW_MS = 4 * 60 * 1000; // 4 minutes total before auto-cancel

interface ShopItem {
  id: number | string;
  name: string;
  categoryId: number | string | null;
  category: string;
  queue: number;
  wait: number;
  price: number;
  distance: number;
  isOpen: boolean;
  image: string;
  menuImage: string;
  desc: string;
}

interface ShopBrowserProps {
  initialShops: any[];
  userId: string | null | undefined;
}

export default function ShopBrowser({
  initialShops,
  userId,
}: ShopBrowserProps) {
  // Filters & UI states
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterOpenNow, setFilterOpenNow] = useState<boolean>(false);
  const [categories, setCategories] = useState<
    { id: number; category_name: string }[]
  >([]);
  const [filterNearBy, setFilterNearBy] = useState<boolean>(false);
  const [filterFavorite, setFilterFavorite] = useState<boolean>(false);
  const [sort, setSort] = useState<string>("a-z");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentDetailId, setCurrentDetailId] = useState<
    number | string | null
  >(null);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number | string>>(
    new Set(),
  );
  const [togglingIds, setTogglingIds] = useState<Set<number | string>>(
    new Set(),
  );
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const supabase = createClient();

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("Category")
        .select("id, category_name")
        .order("category_name", { ascending: true });

      if (!error && data) {
        setCategories(data);
      }
    };

    fetchCategories();
  }, []);
  // ── REAL-TIME QUEUE STATES ────────────────────────────────────────────────
  const [tickets, setTickets] = useState<any[]>([]);
  const [myTokenIds, setMyTokenIds] = useState<string[]>([]);
  const [dismissedTokenIds, setDismissedTokenIds] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Modals & triggers
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedTicketForQR, setSelectedTicketForQR] = useState<any | null>(
    null,
  );
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [expiredTokenId, setExpiredTokenId] = useState<string | null>(null);

  // Tracks previous status of user's active tickets to play state change beeps
  const prevStatusesRef = useRef<Record<string, string>>({});

  // Push notification keys (from index.html/sw.js setup)
  const VAPID_PUBLIC_KEY =
    "BNbXwdqvTUVwovlL4C53Je40k2lZFt93ORZPRcq4Am_ETlapaJ6X-Wt3Pk-hOaANb7YL-flD_ji9VvTvHokm7Sc";
  const PUSH_URL = `https://apjvnlxeqjvsmxvqtqqk.supabase.co/functions/v1/send-push`;
  const SUPABASE_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwanZubHhlcWp2c214dnF0cXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODMxNDcsImV4cCI6MjA5NTM1OTE0N30.N0s2R_zhrzmiJ-3UGBiUnO6tzS6cgGJwEVklZeJWu8g";

  // Audio cue synthesizer
  const playSound = (notifType: string) => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const isYourTurn =
        notifType === "called" || notifType === "immediate_call";
      const isWarning = notifType === "warning";
      const isCanceled = notifType === "canceled";

      const beep = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (isYourTurn) {
        beep(880, ctx.currentTime, 0.35);
        beep(1100, ctx.currentTime + 0.42, 0.45);
      } else if (isWarning) {
        beep(400, ctx.currentTime, 0.4);
        beep(400, ctx.currentTime + 0.5, 0.4);
      } else if (isCanceled) {
        beep(250, ctx.currentTime, 0.6);
      } else {
        beep(660, ctx.currentTime, 0.5);
      }
    } catch (e) {
      console.warn(
        "AudioContext playback prevented by browser security standard.",
        e,
      );
    }
  };

  // Keep internal timer ticking for real-time ticket countdown elements
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load user data & saved tokens from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTokens = localStorage.getItem("qm_my_tokens");
      const storedDismissed = localStorage.getItem("qm_dismissed_tokens");
      if (storedTokens) {
        try {
          setMyTokenIds(JSON.parse(storedTokens));
        } catch (e) {}
      }
      if (storedDismissed) {
        try {
          setDismissedTokenIds(JSON.parse(storedDismissed));
        } catch (e) {}
      }
    }
  }, []);

  // ── REGISTER SERVICE WORKER ON MOUNT (mirrors index.html window load) ────
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((e) => console.warn("SW registration failed:", e));

    // Relay sound messages sent by the SW when a push arrives in background
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "PLAY_NOTIFICATION_SOUND") {
        playSound(e.data.notificationType);
      }
    };
    navigator.serviceWorker.addEventListener("message", onSwMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    };
  }, []);

  // Fetch real-time Supabase tickets and subscribe to changes
  useEffect(() => {
    const supabase = createClient();

    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from("Ticket")
        .select("*")
        .order("createdAt", { ascending: true });
      if (data) {
        setTickets(data);
      }
    };
    fetchTickets();

    const channel = supabase
      .channel("live-ticket-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Ticket" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTickets((prev) => {
              if (prev.some((t) => t.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === "UPDATE") {
            setTickets((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t)),
            );
          } else if (payload.eventType === "DELETE") {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Watch statuses of active customer tickets to play state sound alarms
  useEffect(() => {
    const myActive = tickets.filter((t) => myTokenIds.includes(t.id));
    myActive.forEach((t) => {
      const prev = prevStatusesRef.current[t.id];
      if (prev && prev !== t.status) {
        if (t.status === "CALLED") {
          playSound("called");
          showToast(
            `🔔 Ticket #${t.ticketNo} is called! Proceed to the counter.`,
          );
        } else if (t.status === "CANCELLED") {
          playSound("canceled");
          showToast(`❌ Ticket #${t.ticketNo} has been canceled.`);
        } else if (t.status === "SERVED") {
          playSound("success");
          showToast(`🎉 Ticket #${t.ticketNo} served! Thank you.`);
        }
      }
      prevStatusesRef.current[t.id] = t.status;
    });
  }, [tickets, myTokenIds]);

  // Client-side Auto-Cancel watch (if token remains in CALLED over 4 minutes)
  useEffect(() => {
    const expiredActive = tickets.filter(
      (t) =>
        myTokenIds.includes(t.id) &&
        t.status === "CALLED" &&
        t.notifiedAt &&
        TOTAL_WINDOW_MS - (currentTime - new Date(t.notifiedAt).getTime()) <= 0,
    );

    expiredActive.forEach(async (token) => {
      const supabase = createClient();
      await supabase
        .from("Ticket")
        .update({ status: "CANCELLED" })
        .eq("id", token.id);

      playSound("canceled");
      showToast(`Token #${token.ticketNo} auto-canceled due to inactivity.`);
      setExpiredTokenId(token.id);
      setIsExpiredModalOpen(true);
    });
  }, [currentTime, tickets, myTokenIds]);

  // Load favorites from Supabase on mount
  useEffect(() => {
    if (!userId) return;
    const loadFavorites = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("Favorite")
        .select("shopId")
        .eq("userId", userId);
      if (error) {
        showToast("Failed to load favorites.");
        return;
      }
      const ids = new Set<number | string>(
        (data ?? []).map((r: any) => r.shopId),
      );
      setFavoriteIds(ids);
    };
    loadFavorites();
  }, [userId]);

  // Transform shops from DB and join live ticket statuses
  const dbShops: ShopItem[] = useMemo(() => {
    return initialShops.map((s, index) => {
      const categoryName = Array.isArray(s.category)
        ? (s.category[0] as any)?.category_name
        : (s.category as any)?.category_name;

      const lowerCat = (categoryName ?? "").toLowerCase();
      let type = "restaurant";
      if (
        lowerCat.includes("cafe") ||
        lowerCat.includes("tea") ||
        lowerCat.includes("brew") ||
        lowerCat.includes("bakery")
      ) {
        type = "cafe";
      } else if (
        lowerCat.includes("fast") ||
        lowerCat.includes("burger") ||
        lowerCat.includes("food court")
      ) {
        type = "fastfood";
      }

      // Calculate REAL queue and wait from live Supabase tickets
      const shopTickets = tickets.filter((t) => t.shopId === s.id);
      const pendingCount = shopTickets.filter(
        (t) => t.status === "PENDING",
      ).length;
      const calculatedWait = pendingCount * 6; // ~6 minutes estimated per party

      const restaurantImages = [
        "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80",
      ];
      const cafeImages = [
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1493809842364-4c81cbac9ba0?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80",
      ];
      const fastfoodImages = [
        "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
      ];
      const menuImages = [
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1595858000854-3e99e236594d?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1544025162-8367f082e6c5?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80",
      ];

      const imageIndex = typeof s.id === "number" ? s.id : index + 1;
      const imageList =
        type === "cafe"
          ? cafeImages
          : type === "fastfood"
            ? fastfoodImages
            : restaurantImages;

      return {
        id: s.id,
        name: s.name || `Shop #${imageIndex}`,
        categoryId: s.categoryId,
        type,
        category:
          categoryName ||
          (type === "cafe"
            ? "Burmese Cafe"
            : type === "fastfood"
              ? "Fast Casual"
              : "Premium Dining"),
        reviews: 100 + ((imageIndex * 77) % 400),
        queue: pendingCount,
        wait: calculatedWait,
        price:
          typeof s.price === "number" && s.price >= 1 && s.price <= 5
            ? s.price
            : (imageIndex % 5) + 1,
        distance: parseFloat((((imageIndex * 0.7) % 4) + 0.2).toFixed(1)),
        isOpen: s.is_available ?? true,
        image: imageList[imageIndex % imageList.length],
        menuImage: menuImages[imageIndex % menuImages.length],
        desc:
          s.description ||
          "Fresh and exceptional culinary experiences served daily.",
      };
    });
  }, [initialShops, tickets]);

  const filteredAndSortedShops = useMemo(() => {
    let result = dbShops.filter((shop) => {
      if (filterFavorite && !favoriteIds.has(shop.id)) return false;
      if (
        filterCategory !== "all" &&
        String(shop.categoryId) !== filterCategory
      )
        return false;
      if (filterOpenNow && !shop.isOpen) return false;
      if (filterNearBy && shop.distance > 2.0) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !shop.name.toLowerCase().includes(query) &&
          !shop.category.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sort) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "a-z":
          return a.name.localeCompare(b.name);
        case "z-a":
          return b.name.localeCompare(a.name);
        case "distance-close":
          return a.distance - b.distance;
        case "distance-far":
          return b.distance - a.distance;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [
    dbShops,
    filterCategory,
    filterOpenNow,
    filterNearBy,
    filterFavorite,
    searchQuery,
    sort,
    favoriteIds,
  ]);

  // Compute actual active user tokens (excluding dismissed ones)
  const myActiveTickets = useMemo(() => {
    return tickets.filter(
      (t) =>
        myTokenIds.includes(t.id) && !dismissedTokenIds.includes(String(t.id)),
    );
  }, [tickets, myTokenIds, dismissedTokenIds]);

  const activeShopDetail = useMemo(() => {
    if (currentDetailId === null) return null;
    return dbShops.find((s) => s.id === currentDetailId) || null;
  }, [currentDetailId, dbShops]);

  // Live modal numbers
  const liveQueueCount = useMemo(() => {
    if (!activeShopDetail) return 0;
    return tickets.filter(
      (t) => t.shopId === activeShopDetail.id && t.status === "PENDING",
    ).length;
  }, [activeShopDetail, tickets]);

  const liveWaitMins = useMemo(() => {
    return liveQueueCount * 6;
  }, [liveQueueCount]);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    setIsToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => setIsToastVisible(false), 3000);
  };

  const handleToggleFavorite = async (
    id: number | string,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();

    if (!userId) {
      showToast("Please login to save favorites.");
      return;
    }

    if (togglingIds.has(id)) return;
    setTogglingIds((prev) => new Set(prev).add(id));

    const isFav = favoriteIds.has(id);
    const supabase = createClient();

    try {
      if (isFav) {
        const { error } = await supabase
          .from("Favorite")
          .delete()
          .match({ userId, shopId: id });
        if (error) throw error;
        setFavoriteIds((prev) => {
          const copy = new Set(prev);
          copy.delete(id);
          return copy;
        });
      } else {
        const { error } = await supabase
          .from("Favorite")
          .insert({ userId, shopId: id });
        if (error) throw error;
        setFavoriteIds((prev) => new Set(prev).add(id));
      }
    } catch {
      showToast("Failed to update favorite. Please try again.");
    } finally {
      setTogglingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
    }
  };

  // ── QUEUE TOKEN OPERATIONS ───────────────────────────────────────────────
  const saveToken = (id: string) => {
    setMyTokenIds((prev) => {
      const updated = [...prev, id];
      localStorage.setItem("qm_my_tokens", JSON.stringify(updated));
      return updated;
    });
  };

  const cancelTicket = async (tokenId: string | number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("Ticket")
      .update({ status: "CANCELLED" })
      .eq("id", tokenId);

    if (error) {
      showToast("Failed to cancel ticket.");
    } else {
      showToast("Ticket cancelled successfully.");
      playSound("canceled");
    }
  };

  const dismissTicket = (tokenId: string | number) => {
    setDismissedTokenIds((prev) => {
      const updated = [...prev, String(tokenId)];
      localStorage.setItem("qm_dismissed_tokens", JSON.stringify(updated));
      return updated;
    });
    showToast("Ticket archived.");
  };

  const rejoinQueue = async (
    oldTokenId: string | number,
    shopId: string | number,
  ) => {
    dismissTicket(oldTokenId);
    await handleIssueToken(shopId);
  };

  // ── REAL TOKEN GENERATION ──────────────────────────────────────────────────
  const handleIssueToken = async (shopId: number | string) => {
    if (!userId) {
      showToast("Please login or register to get a token.");
      setCurrentDetailId(null);
      return;
    }

    const targetShop = dbShops.find((s) => s.id === shopId);
    if (!targetShop) return;

    const supabase = createClient();

    // Fetch the shop's existing tickets to compute sequence ticketNo
    const shopTickets = tickets.filter((t) => t.shopId === shopId);
    const maxTicket = shopTickets.reduce(
      (max, t) => Math.max(max, t.ticketNo || 0),
      0,
    );
    const nextTicketNo = maxTicket + 1;

    const activeCount = shopTickets.filter(
      (t) => t.status === "PENDING" || t.status === "CALLED",
    ).length;
    const queuePosition = activeCount + 1;

    const { data, error } = await supabase
      .from("Ticket")
      .insert({
        shopId: shopId,
        status: "PENDING",
        ticketNo: nextTicketNo,
        personCount: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase ticket insertion error", error);
      showToast("Failed to generate token. Try again.");
      return;
    }

    saveToken(data.id);
    setCurrentDetailId(null);
    showToast(
      `Success! You got Ticket #${nextTicketNo} for ${targetShop.name}`,
    );

    // Call dynamic instant activation if there was no active queue
    if (queuePosition === 1) {
      const nowIso = new Date().toISOString();
      await supabase
        .from("Ticket")
        .update({ status: "CALLED", notifiedAt: nowIso })
        .eq("id", data.id);
    }

    // Trigger Native Push Notification subscribe flow
    await setupPush(data.id, nextTicketNo, queuePosition, shopId);
  };

  // ── NATIVE WEB PUSH ENABLER ───────────────────────────────────────────────
  const setupPush = async (
    tokenId: string,
    ticketNo: number,
    position: number,
    shopId: number | string,
  ) => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("PushManager" in window)) return;

    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    try {
      // Register the SW (idempotent — safe to call even if already registered)
      await navigator.serviceWorker.register("/sw.js");
      // Wait until the SW is fully active and controlling the page
      const reg = await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const supabase = createClient();
      await supabase
        .from("Ticket")
        .update({ subscription: sub.toJSON() })
        .eq("id", tokenId);

      const shopName = dbShops.find((s) => s.id === shopId)?.name || "the shop";

      if (position === 1) {
        await sendPush(
          sub.toJSON(),
          `🔔 ${shopName}: It's Your Turn!`,
          `Ticket #${ticketNo} — please come to the counter within 3 minutes!`,
          "immediate_call",
        );
      } else {
        const ahead = position - 1;
        const peopleStr = ahead === 1 ? "1 person is" : `${ahead} people are`;
        await sendPush(
          sub.toJSON(),
          `✅ ${shopName}: Token Confirmed`,
          `You got ticket #${ticketNo}. There ${peopleStr} ahead of you.`,
          "queued",
        );
      }
    } catch (e) {
      console.warn("Push subscription skipped or failed:", e);
    }
  };

  const sendPush = async (
    subscription: any,
    title: string,
    body: string,
    type = "generic",
  ) => {
    if (!subscription) return;
    try {
      const res = await fetch(PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({ subscription, title, body, type }),
      });
      if (!res.ok) console.error("Push failed:", await res.text());
    } catch (e) {
      console.warn("Push dispatch error", e);
    }
  };

  const urlB64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Helper to parse countdown strings
  const getTimerState = (notifiedAtStr: string) => {
    if (!notifiedAtStr) return null;
    const calledMs = new Date(notifiedAtStr).getTime();
    const elapsed = currentTime - calledMs;
    const warnRemain = CALL_WINDOW_MS - elapsed;
    const totalRemain = TOTAL_WINDOW_MS - elapsed;
    const inWarning = warnRemain <= 0 && totalRemain > 0;
    const displayMs = inWarning
      ? Math.max(0, totalRemain)
      : Math.max(0, warnRemain);
    const isUrgent = !inWarning && warnRemain < 60000;
    const isExpired = totalRemain <= 0;

    return {
      warnRemain,
      totalRemain,
      inWarning,
      displayMs,
      isUrgent,
      isExpired,
    };
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null)
        clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-bgMain py-10">
      <section
        id="venues"
        className="max-w-[1400px] mx-auto px-5 lg:px-8 relative z-20 flex-1 w-full pt-24 lg:pt-32"
      >
        <div
          className="text-center mb-8 lg:mb-10 hidden lg:block animate-slide-up"
          id="venuesHeader"
        >
          <h2 className="text-3xl lg:text-4xl text-brandPrimary font-bold mb-3">
            Popular Venues
          </h2>
          <p className="text-textMuted max-w-2xl mx-auto text-sm lg:text-base">
            A handpicked selection of our most loved spots — curated with
            precision and served with flavor.
          </p>
        </div>

        {/* ── REAL-TIME USER ACTIVE TOKENS DASHBOARD ───────────────────────────────── */}
        {myActiveTickets.length > 0 && (
          <div className="mb-10 p-6 bg-white border border-bgSurface rounded-3xl shadow-xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-bgSurface pb-4 mb-5">
              <div>
                <h3 className="text-xl font-extrabold text-brandPrimary tracking-tight flex items-center gap-2">
                  <TicketIcon className="size-6 text-brandPrimary" />
                  Your Active Tokens
                </h3>
                <p className="text-xs text-textMuted mt-0.5">
                  Live queue trackers & counter calling alerts
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-brandPrimary bg-bgMain px-3 py-1.5 rounded-full border border-bgSurface">
                {myActiveTickets.length} active{" "}
                {myActiveTickets.length === 1 ? "ticket" : "tickets"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myActiveTickets.map((token) => {
                const shop = dbShops.find((s) => s.id === token.shopId);
                if (!shop) return null;

                const shopTickets = tickets.filter(
                  (t) => t.shopId === token.shopId,
                );
                const pendingTickets = shopTickets
                  .filter((t) => t.status === "PENDING")
                  .sort(
                    (a, b) =>
                      new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime(),
                  );
                const position = pendingTickets.findIndex(
                  (t) => t.id === token.id,
                );

                const timerState =
                  token.status === "CALLED" && token.notifiedAt
                    ? getTimerState(token.notifiedAt)
                    : null;

                const isPending = token.status === "PENDING";
                const isCalled = token.status === "CALLED";
                const isServed = token.status === "SERVED";
                const isCancelled = token.status === "CANCELLED";

                return (
                  <div
                    key={token.id}
                    className={`relative flex flex-col justify-between border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
                      isCalled
                        ? timerState?.inWarning
                          ? "border-red-400 bg-red-50/30 ring-2 ring-red-400 animate-pulse"
                          : timerState?.isUrgent
                            ? "border-orange-400 bg-orange-50/30 ring-2 ring-orange-400"
                            : "border-blue-400 bg-blue-50/30 ring-2 ring-blue-400"
                        : "border-bgSurface bg-white hover:border-textMuted"
                    }`}
                  >
                    {/* Header Details */}
                    <div className="p-5 flex items-start gap-4">
                      <div className="bg-brandPrimary text-white w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                        {shop.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-textMuted uppercase tracking-wider leading-none mb-1">
                          {shop.name}
                        </p>
                        <p className="text-2xl font-black text-brandPrimary tracking-tight leading-none mb-2">
                          #{String(token.ticketNo).padStart(3, "0")}
                        </p>

                        {/* Live dynamic statuses */}
                        {isPending && (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-max">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                              Waiting in line
                            </span>
                            <p className="text-xs text-textMuted font-medium mt-1">
                              {position >= 0 ? (
                                <>
                                  There {position === 0 ? "is" : "are"}{" "}
                                  <span className="font-bold text-brandPrimary">
                                    {position === 0
                                      ? "no one"
                                      : `${position} ${position === 1 ? "person" : "people"}`}
                                  </span>{" "}
                                  ahead of you.
                                </>
                              ) : (
                                "Calculating line position..."
                              )}
                            </p>
                          </div>
                        )}

                        {isCalled && (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 w-max animate-bounce">
                              📢 Go to Counter!
                            </span>
                            {timerState && (
                              <div className="mt-2 p-2 rounded-lg bg-white/70 border border-bgSurface">
                                <div className="flex items-center justify-between gap-4 text-xs font-bold">
                                  <span className="text-textMuted">
                                    Time Remaining:
                                  </span>
                                  <span
                                    className={`text-sm font-black ${timerState.inWarning || timerState.isUrgent ? "text-red-600" : "text-blue-600"}`}
                                  >
                                    {Math.floor(
                                      timerState.displayMs / 1000 / 60,
                                    )}
                                    :
                                    {String(
                                      Math.ceil(timerState.displayMs / 1000) %
                                        60,
                                    ).padStart(2, "0")}
                                  </span>
                                </div>
                                <p
                                  className={`text-[10px] font-semibold mt-1 ${timerState.inWarning ? "text-red-500" : "text-textMuted"}`}
                                >
                                  {timerState.inWarning
                                    ? "⚠️ Auto-canceling soon — hurry up!"
                                    : timerState.isUrgent
                                      ? "🚨 Under 1 minute remaining!"
                                      : "📍 Please proceed to the service counter"}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {isServed && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 w-max">
                            ✓ Served
                          </span>
                        )}

                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 w-max">
                            ✕ Canceled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Interactive controls */}
                    <div className="px-5 py-4 bg-bgMain border-t border-bgSurface flex items-center justify-between gap-3">
                      <button
                        onClick={() => {
                          setSelectedTicketForQR(token);
                          setIsQRModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-brandPrimary hover:text-opacity-80 transition"
                      >
                        <QrIcon className="size-4" />
                        Show QR Code
                      </button>

                      {isPending && (
                        <button
                          onClick={() => cancelTicket(token.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 transition"
                        >
                          Cancel
                        </button>
                      )}

                      {isCalled && (
                        <button
                          onClick={() => cancelTicket(token.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 transition"
                        >
                          Give up turn
                        </button>
                      )}

                      {(isServed || isCancelled) && (
                        <div className="flex gap-2">
                          {isCancelled && (
                            <button
                              onClick={() =>
                                rejoinQueue(token.id, token.shopId)
                              }
                              className="text-xs font-bold text-brandPrimary hover:underline"
                            >
                              Rejoin End
                            </button>
                          )}
                          <button
                            onClick={() => dismissTicket(token.id)}
                            className="text-xs font-bold text-textMuted hover:text-brandPrimary transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SEARCH & FILTER CONTROLS ─────────────────────────────────────────────────── */}
        <div className="sticky-filters py-3 lg:py-4 mb-6 lg:mb-8 mx-0 sm:mx-2 lg:mx-0 px-4 lg:px-6 rounded-2xl flex flex-col gap-2 border border-bgSurface shadow-md transition-all duration-300">
          <div className="flex justify-between items-center w-full">
            <span className="font-bold text-sm text-brandPrimary flex items-center gap-2">
              <FilterIcon className="size-4" />
              Filter & Sort
            </span>
            <button
              onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
              className="w-9 h-9 rounded-xl bg-bgMain border border-bgSurface flex items-center justify-center text-brandPrimary hover:bg-bgSurface transition-colors shadow-sm"
            >
              <SlidersIcon className="size-4" />
            </button>
          </div>

          <div
            id="filterCollapsible"
            className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isFilterBarOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden min-h-0">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 mt-2 border-t border-bgSurface">
                <div
                  className="flex flex-wrap items-center gap-2 lg:gap-3 w-full lg:w-auto overflow-x-auto hide-scrollbar pb-2 lg:pb-0"
                  id="filterContainer"
                >
                  <select
                    id="categoryFilter"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white border border-bgSurface text-xs sm:text-sm font-bold text-brandPrimary outline-none cursor-pointer px-4 py-2.5 rounded-xl shadow-sm shrink-0"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setFilterOpenNow(!filterOpenNow)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border shadow-sm shrink-0 ${
                      filterOpenNow
                        ? "bg-brandPrimary text-bgMain border-brandPrimary"
                        : "bg-white text-brandPrimary border-bgSurface"
                    }`}
                  >
                    Open Now
                  </button>
                  <button
                    onClick={() => setFilterNearBy(!filterNearBy)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border shadow-sm shrink-0 ${
                      filterNearBy
                        ? "bg-brandPrimary text-bgMain border-brandPrimary"
                        : "bg-white text-brandPrimary border-bgSurface"
                    }`}
                  >
                    Near By (&lt; 2km)
                  </button>
                  <button
                    onClick={() => setFilterFavorite(!filterFavorite)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border shadow-sm shrink-0 ${
                      filterFavorite
                        ? "bg-brandPrimary text-bgMain border-brandPrimary"
                        : "bg-white text-brandPrimary border-bgSurface"
                    }`}
                  >
                    Favorites
                  </button>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto shrink-0 pb-2 lg:pb-0">
                  <input
                    type="search"
                    placeholder="Search venues"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border border-bgSurface text-xs sm:text-sm font-bold text-brandPrimary outline-none cursor-text px-4 py-2.5 rounded-xl shadow-sm flex-1 lg:flex-none"
                  />
                  <button className="hidden lg:flex w-10 h-10 rounded-xl bg-brandPrimary text-bgMain items-center justify-center shadow-sm hover:bg-opacity-90 transition-all shrink-0">
                    <QrIcon className="size-5 bg-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── VENUES GRID ────────────────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 lg:gap-8 pb-10"
          id="verticalGrid"
        >
          {filteredAndSortedShops.length > 0 ? (
            filteredAndSortedShops.map((shop) => {
              const isFav = favoriteIds.has(shop.id);
              const isToggling = togglingIds.has(shop.id);
              const hasActiveQueue = myActiveTickets.some(
                (t) =>
                  t.shopId === shop.id &&
                  (t.status === "PENDING" || t.status === "CALLED"),
              );

              return (
                <div
                  key={shop.id}
                  onClick={() => setCurrentDetailId(shop.id)}
                  className="w-full bg-white rounded-3xl p-3 flex flex-col items-center group cursor-pointer hover:shadow-xl transition-all duration-300 border border-bgSurface relative animate-fade-in"
                >
                  <div className="relative w-full h-44 sm:h-52 mb-3 rounded-2xl overflow-hidden bg-bgMain">
                    <img
                      src={shop.image}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <button
                      onClick={(e) => handleToggleFavorite(shop.id, e)}
                      disabled={isToggling}
                      className={`absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center transition-transform z-10 shadow-sm text-brandPrimary hover:bg-white ${
                        isToggling
                          ? "opacity-50 cursor-wait"
                          : "active:scale-90"
                      }`}
                    >
                      <HeartIcon isFav={isFav} className="size-5" />
                    </button>

                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {shop.isOpen ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>{" "}
                          Open
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>{" "}
                          Closed
                        </div>
                      )}

                      {hasActiveQueue && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                          🎟 Queued
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full px-2 flex flex-col items-start text-left pb-1 flex-1">
                    <div className="w-full flex justify-between items-start mb-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-textMuted truncate pr-2">
                        {shop.category}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-brandPrimary mb-2 line-clamp-1 w-full">
                      {shop.name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4 text-xs font-medium text-textMuted">
                      <span className="flex items-center gap-1">
                        <LocationIcon className="size-4" /> {shop.distance} km
                      </span>
                      <span className="flex items-center gap-1 text-green-600 font-bold">
                        {"$".repeat(shop.price)}
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersIcon className="size-4 inline" /> {shop.queue}{" "}
                        waiting
                      </span>
                    </div>

                    <button className="mt-auto bg-bgMain text-brandPrimary w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold group-hover:bg-brandPrimary group-hover:text-white transition-colors flex items-center justify-center gap-2 border border-bgSurface">
                      <TicketIcon className="size-4.5 inline" />
                      {shop.wait === 0 ? (
                        <span className="text-green-600">
                          Immediate Service
                        </span>
                      ) : (
                        <span>{shop.wait} min est. wait</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center text-textMuted font-bold text-sm bg-white rounded-2xl border border-bgSurface">
              No venues found matching your criteria.
            </div>
          )}
        </div>
      </section>

      {/* ── DETAIL DRAWER MODAL ───────────────────────────────────────────────────── */}
      {activeShopDetail && (
        <div
          id="detailModal"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end lg:items-center animate-fade-in pb-0 lg:pb-10"
          onClick={() => setCurrentDetailId(null)}
        >
          <div
            className="bg-bgMain w-full max-h-[92vh] overflow-y-auto rounded-t-3xl lg:rounded-3xl lg:max-w-[500px] relative flex flex-col animate-slide-up shadow-2xl hide-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[250px] shrink-0 bg-brandPrimary">
              <img
                id="detailImg"
                src={activeShopDetail.image}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bgMain via-transparent to-transparent"></div>
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pt-safe lg:pt-0">
                <button
                  onClick={() => setCurrentDetailId(null)}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur text-brandPrimary flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                >
                  <CrossIcon className="size-6" />
                </button>
                <button
                  onClick={() => handleToggleFavorite(activeShopDetail.id)}
                  disabled={togglingIds.has(activeShopDetail.id)}
                  className={`w-10 h-10 rounded-full bg-white/90 backdrop-blur text-brandPrimary flex items-center justify-center hover:bg-white transition-colors shadow-sm ${
                    togglingIds.has(activeShopDetail.id)
                      ? "opacity-50 cursor-wait"
                      : ""
                  }`}
                >
                  <HeartIcon
                    isFav={favoriteIds.has(activeShopDetail.id)}
                    className="size-5"
                  />
                </button>
              </div>
            </div>

            <div className="p-4 relative -mt-6 bg-bgMain rounded-t-3xl flex-1 text-left">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <h1
                    id="detailName"
                    className="text-2xl font-bold text-brandPrimary leading-tight"
                  >
                    {activeShopDetail.name}
                  </h1>
                  <p
                    id="detailCategory"
                    className="text-xs text-textMuted font-light uppercase tracking-wider mt-1"
                  >
                    {activeShopDetail.category}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div
                    className="flex items-center gap-1 mb-1"
                    id="detailOpenStatus"
                  >
                    {activeShopDetail.isOpen ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-green-600 uppercase tracking-widest">
                          Open Now
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                          Closed
                        </span>
                      </>
                    )}
                  </div>
                  <span
                    id="detailDistance"
                    className="text-[10px] text-textMuted font-bold mt-1"
                  >
                    {activeShopDetail.distance} km away
                  </span>
                </div>
              </div>

              {/* Real-time Dynamic Stats Blocks */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white p-2 rounded-2xl border border-bgSurface shadow-sm text-center">
                  <UsersIcon className="size-6 inline" />
                  <h4 className="font-bold text-sm text-brandPrimary">
                    Live Queue
                  </h4>
                  <p
                    id="detailQueueDesc"
                    className="text-xs text-textMuted mt-1 leading-tight font-bold"
                  >
                    {liveQueueCount} groups
                  </p>
                </div>
                <div className="bg-white p-2 rounded-2xl border border-bgSurface shadow-sm text-center">
                  <ClockIcon className="size-6 inline" />
                  <h4 className="font-bold text-sm text-brandPrimary">
                    Est. Wait
                  </h4>
                  <p
                    id="detailTimeDesc"
                    className="text-xs text-brandPrimary mt-1 leading-tight font-bold"
                  >
                    {liveWaitMins === 0 ? "Immediate" : `~${liveWaitMins} mins`}
                  </p>
                </div>
              </div>

              <p className="mb-5 text-black/60 text-sm">
                {activeShopDetail.desc}
              </p>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-brandPrimary mb-3 uppercase tracking-wider text-left">
                  Menu Preview
                </h3>
                <div className="w-full h-32 rounded-xl bg-bgSurface overflow-hidden border border-bgSurface">
                  <img
                    id="detailMenuImg"
                    src={activeShopDetail.menuImage}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="mb-24 lg:mb-20"></div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-bgSurface px-6 py-4 flex items-center justify-between z-20 pb-safe lg:pb-4 lg:rounded-b-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
              <div className="text-left">
                <p className="text-[10px] text-textMuted font-bold uppercase tracking-widest mb-0.5">
                  Price Range
                </p>
                <p className="font-bold text-lg leading-none text-green-600">
                  {"$".repeat(activeShopDetail.price)}
                </p>
              </div>

              {myActiveTickets.some(
                (t) =>
                  t.shopId === activeShopDetail.id &&
                  (t.status === "PENDING" || t.status === "CALLED"),
              ) ? (
                <button
                  disabled
                  className="bg-brandPrimary/40 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md cursor-not-allowed"
                >
                  Already in Queue
                </button>
              ) : (
                <button
                  onClick={() => handleIssueToken(activeShopDetail.id)}
                  className="bg-brandPrimary hover:bg-opacity-90 text-bgMain px-8 py-3 rounded-xl text-sm font-bold transition-colors shadow-md"
                >
                  Get Token Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PRETTY USER INTERACTION TOAST ─────────────────────────────────────────── */}
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

      {/* ── LIVE TICKET QR MODAL PREVIEW ─────────────────────────────────────────── */}
      {isQRModalOpen && selectedTicketForQR && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsQRModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-brandPrimary text-white p-6 text-center">
              <button
                onClick={() => setIsQRModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
              >
                <CrossIcon className="size-5" />
              </button>
              <p className="text-xs uppercase font-bold tracking-wider text-white/80">
                {dbShops.find((s) => s.id === selectedTicketForQR.shopId)
                  ?.name || "Shop"}
              </p>
              <h4 className="text-3xl font-black mt-1">
                Ticket #{String(selectedTicketForQR.ticketNo).padStart(3, "0")}
              </h4>
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                {selectedTicketForQR.status}
              </span>
            </div>

            <div className="p-8 flex flex-col items-center text-center">
              {/* Dynamic QR Code based on Supabase UUID */}
              <div className="p-4 bg-bgMain rounded-2xl border border-bgSurface shadow-inner mb-6">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    selectedTicketForQR.id,
                  )}&bgcolor=ffffff&color=1e293b&margin=2`}
                  alt="Ticket QR Code"
                  className="w-44 h-44 rounded-lg object-contain"
                />
              </div>

              <p className="text-xs text-textMuted font-semibold leading-relaxed max-w-xs">
                Present this QR code to the merchant at the service counter when
                your ticket number is called.
              </p>
            </div>

            <div className="px-6 py-4 bg-bgMain border-t border-bgSurface flex justify-center">
              <button
                onClick={() => setIsQRModalOpen(false)}
                className="w-full bg-brandPrimary text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-opacity-90 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTO-CANCELLED TIMER EXPIRED MODAL ─────────────────────────────────────── */}
      {isExpiredModalOpen && expiredTokenId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative">
            <div className="bg-orange-50 px-6 pt-8 pb-6 text-center">
              <div className="text-6xl mb-4">⏰</div>
              <h2 className="text-2xl font-black text-brandPrimary mb-2">
                Time's Up!
              </h2>
              <p className="text-textMuted text-xs leading-relaxed max-w-[280px] mx-auto">
                Your 3-minute window to reach the counter has passed, so your
                ticket was auto-canceled to keep the line moving.
              </p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <button
                onClick={async () => {
                  const token = tickets.find((t) => t.id === expiredTokenId);
                  if (token) {
                    await rejoinQueue(token.id, token.shopId);
                  }
                  setIsExpiredModalOpen(false);
                }}
                className="w-full bg-brandPrimary hover:bg-opacity-90 text-white py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-md"
              >
                Rejoin Queue (Go to End)
              </button>
              <button
                onClick={() => {
                  dismissTicket(expiredTokenId);
                  setIsExpiredModalOpen(false);
                }}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3.5 rounded-xl font-bold text-sm transition"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
