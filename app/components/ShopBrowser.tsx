"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  cancelQueueTicket,
  createQueueTicket,
  fetchAllTickets,
  fetchMyActiveTicketIds,
} from "@/backend/queue";
import { WAIT_MINUTES_PER_GROUP, TOTAL_WINDOW_MS } from "@/lib/queue/constants";
import { setupTicketPush } from "@/lib/queue/push";
import { playNotificationSound } from "@/lib/queue/sound";
import { computeTimerState } from "@/lib/queue/timer";
import { isActiveQueueStatus, STATUS_LABELS } from "@/lib/queue/types";
import {
  Heart,
  Clock as ClockIcon,
  Users as UsersIcon,
  Ticket as TicketIcon,
  MapPin as LocationIcon,
  QrCode as QrIcon,
  SlidersHorizontal as SlidersIcon,
  Filter as FilterIcon,
  X as CrossIcon,
} from "lucide-react";
import PromotionBanner from "./promotionbanner";

const HeartIcon = ({
  isFav,
  className,
}: {
  isFav?: boolean;
  className?: string;
}) => <Heart className={className} fill={isFav ? "currentColor" : "none"} />;

interface ShopItem {
  id: number | string;
  name: string;
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
  categories: string[];
}

export default function ShopBrowser({
  initialShops,
  userId,
  categories,
}: ShopBrowserProps) {
  const searchParams = useSearchParams();

  // Filters & UI states
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterOpenNow, setFilterOpenNow] = useState<boolean>(false);
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

  // Warning Modal (triggered at 3 minutes)
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningTokenId, setWarningTokenId] = useState<string | null>(null);

  const [isGuestCountModalOpen, setIsGuestCountModalOpen] = useState(false);
  const [pendingShopId, setPendingShopId] = useState<number | string | null>(
    null,
  );
  const [guestCount, setGuestCount] = useState<number>(1);

  const notifiedAlmostRef = useRef<Set<string>>(new Set());
  const notifiedCanceledRef = useRef<Set<string>>(new Set());
  const warnedTokensRef = useRef<Set<string>>(new Set());
  const [showAutoCancelBanner, setShowAutoCancelBanner] = useState(false);
  const [expiredCountdown, setExpiredCountdown] = useState(60);

  // Handle initialization of Search query from URL params
  useEffect(() => {
    if (searchParams?.has("search")) {
      setSearchQuery(searchParams.get("search") || "");
    }
  }, [searchParams]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) {
      localStorage.removeItem("qm_my_tokens");
      localStorage.removeItem("qm_dismissed_tokens");
      setMyTokenIds([]);
      setDismissedTokenIds([]);
      return;
    }
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
  }, [userId]);

  // Sync myTokenIds from the database. localStorage is only populated when the
  // user taps "Get Token" in this browser tab — tickets created out-of-band
  // (e.g. by the PaceAI assistant calling join_queue) would otherwise be
  // invisible. We merge rather than replace so a freshly-created ticket the
  // local code already knows about doesn't flicker off while the round-trip
  // is in flight.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const syncFromDb = async () => {
      const result = await fetchMyActiveTicketIds();
      if (cancelled || !result.ok) return;
      const dbIds = result.data;
      setMyTokenIds((prev) => {
        const merged = Array.from(new Set([...prev, ...dbIds]));
        // Only update if something actually changed — avoids an extra render.
        if (
          merged.length === prev.length &&
          merged.every((id) => prev.includes(id))
        ) {
          return prev;
        }
        try {
          localStorage.setItem("qm_my_tokens", JSON.stringify(merged));
        } catch {}
        return merged;
      });
    };

    syncFromDb();
    const poll = setInterval(syncFromDb, 5000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((e) => console.warn("SW registration failed:", e));

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "PLAY_NOTIFICATION_SOUND") {
        playNotificationSound(e.data.notificationType);
      }
    };
    navigator.serviceWorker.addEventListener("message", onSwMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    };
  }, []);

  const sameShop = (a: unknown, b: unknown) => String(a) === String(b);

  const checkQueuePositions = (allTickets: any[]) => {
    const shopNames = new Map(
      initialShops.map((s) => [s.id, s.name as string]),
    );

    myTokenIds.forEach((tokenId) => {
      const token = allTickets.find((t) => t.id === tokenId);
      if (!token || token.status !== "PENDING") return;

      const pending = allTickets
        .filter(
          (t) => sameShop(t.shopId, token.shopId) && t.status === "PENDING",
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      const pos = pending.findIndex((t) => t.id === tokenId);
      if (pos === 1 && !notifiedAlmostRef.current.has(tokenId)) {
        notifiedAlmostRef.current.add(tokenId);
        const shopName = shopNames.get(token.shopId) || "the shop";
        // Push is fired server-side by notifyAlmostTurn() when the head ticket
        // moves to NOTIFIED. Here we only handle the in-app feedback for users
        // who already have the page open.
        showToast(`⏳ You're next at ${shopName}!`);
        playNotificationSound("queued");
      }
    });
  };

  const handleTicketRealtime = (payload: any, prev: any[]) => {
    let next = prev;

    if (payload.eventType === "INSERT") {
      if (prev.some((t) => t.id === payload.new.id)) return prev;
      next = [...prev, payload.new];
    } else if (payload.eventType === "UPDATE") {
      const i = prev.findIndex((t) => t.id === payload.new.id);
      const merged = { ...(i !== -1 ? prev[i] : {}), ...payload.new };
      next =
        i !== -1
          ? prev.map((t) => (t.id === payload.new.id ? merged : t))
          : [...prev, merged];

      if (
        merged.status === "NOSHOW" &&
        myTokenIds.includes(merged.id) &&
        merged.notifiedAt
      ) {
        const elapsed = Date.now() - new Date(merged.notifiedAt).getTime();
        if (elapsed >= TOTAL_WINDOW_MS - 5000) {
          setShowAutoCancelBanner(true);
        }
        if (!notifiedCanceledRef.current.has(merged.id)) {
          notifiedCanceledRef.current.add(merged.id);
        }
        playNotificationSound("canceled");
      }

      if (merged.status === "NOTIFIED" && myTokenIds.includes(merged.id)) {
        // Push is fired server-side in updateQueueTicketStatus when the
        // manager clicks Call. Local-only feedback for an open tab below.
        playNotificationSound("called");
      }

      if (merged.status === "COMPLETED" && myTokenIds.includes(merged.id)) {
        playNotificationSound("queued");
      }
    } else if (payload.eventType === "DELETE") {
      next = prev.filter((t) => t.id !== payload.old.id);
    } else {
      return prev;
    }

    checkQueuePositions(next);
    return next;
  };

  // Fetch tickets via server action (bypasses RLS) + realtime refresh
  useEffect(() => {
    let cancelled = false;

    const loadTickets = async () => {
      const result = await fetchAllTickets();
      if (cancelled) return;
      if (result.ok) {
        setTickets(result.data);
        checkQueuePositions(result.data);
      } else {
        console.error("Ticket load failed:", result.error);
      }
    };

    loadTickets();
    const poll = setInterval(loadTickets, 4000);

    const supabase = createClient();
    const channel = supabase
      .channel("live-ticket-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Ticket" },
        (payload) => {
          setTickets((prev) => handleTicketRealtime(payload, prev));
          loadTickets();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTokenIds, initialShops]);

  // Customer warning modal at 3-minute mark (auto-cancel runs on manager side)
  useEffect(() => {
    const myNOTIFIEDTokens = tickets.filter(
      (t) =>
        myTokenIds.includes(t.id) && t.status === "NOTIFIED" && t.notifiedAt,
    );

    myNOTIFIEDTokens.forEach((token) => {
      const { inWarning, totalRemain } = computeTimerState(
        token.notifiedAt,
        currentTime,
      );

      if (
        inWarning &&
        totalRemain > 0 &&
        !warnedTokensRef.current.has(token.id)
      ) {
        warnedTokensRef.current.add(token.id);
        setWarningTokenId(token.id);
        setIsWarningModalOpen(true);
        setExpiredCountdown(
          Math.max(1, Math.min(60, Math.ceil(totalRemain / 1000))),
        );
        playNotificationSound("warning");
      }
    });
  }, [currentTime, tickets, myTokenIds]);

  useEffect(() => {
    if (!isWarningModalOpen) return;
    const interval = setInterval(() => {
      setExpiredCountdown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isWarningModalOpen]);

  useEffect(() => {
    if (!userId) return;
    const loadFavorites = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("Favorite")
        .select("shopId")
        .eq("userId", userId);
      if (!error && data) {
        setFavoriteIds(new Set(data.map((r: any) => r.shopId)));
      }
    };
    loadFavorites();
  }, [userId]);

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
      )
        type = "cafe";
      else if (
        lowerCat.includes("fast") ||
        lowerCat.includes("burger") ||
        lowerCat.includes("food court")
      )
        type = "fastfood";

      const shopTickets = tickets.filter((t) => sameShop(t.shopId, s.id));
      const pendingCount = shopTickets.filter(
        (t) => t.status === "PENDING",
      ).length;
      const activeCount = shopTickets.filter((t) =>
        isActiveQueueStatus(t.status),
      ).length;
      const calculatedWait = activeCount * WAIT_MINUTES_PER_GROUP;

      const restaurantImages = [
        "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1667388969250-1c7220bf3f37?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cmVzdGF1cmFudCUyMGludGVyaW9yfGVufDB8fDB8fHwy",
        "https://images.unsplash.com/photo-1583354608715-177553a4035e?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      ];

      const menuImages = [
        "https://images.unsplash.com/photo-1663113093939-75a677758e79?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODh8fG1lbnUlMjBwcmV2aWV3fGVufDB8fDB8fHwy",
        "https://images.unsplash.com/photo-1710732652617-264d6f860546?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "https://media.istockphoto.com/id/1250720245/photo/bbq-or-summer-picnic-food-border-over-a-dark-stone-banner-background-overhead-view-with-copy.webp?a=1&b=1&s=612x612&w=0&k=20&c=mo6m1_a88qzcmOlCNPvogNfab-HO5K5NcxiaWn0u-8s=",
      ];

      const imageIndex = typeof s.id === "number" ? s.id : index + 1;
      const imageList = restaurantImages;

      return {
        id: s.id,
        name: s.name || `Shop #${imageIndex}`,
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
      if (filterCategory !== "all" && shop.category !== filterCategory)
        return false;
      if (filterOpenNow && !shop.isOpen) return false;
      if (filterNearBy && shop.distance > 2.0) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !shop.name.toLowerCase().includes(query) &&
          !shop.category.toLowerCase().includes(query)
        )
          return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sort) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
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

  const liveQueueCount = useMemo(() => {
    if (!activeShopDetail) return 0;
    return tickets.filter(
      (t) =>
        sameShop(t.shopId, activeShopDetail.id) &&
        isActiveQueueStatus(t.status),
    ).length;
  }, [activeShopDetail, tickets]);

  const liveWaitMins = useMemo(
    () => liveQueueCount * WAIT_MINUTES_PER_GROUP,
    [liveQueueCount],
  );

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

  const saveToken = (id: string) => {
    setMyTokenIds((prev) => {
      const updated = [...prev, id];
      localStorage.setItem("qm_my_tokens", JSON.stringify(updated));
      return updated;
    });
  };

  const cancelTicket = async (tokenId: string | number) => {
    const result = await cancelQueueTicket(String(tokenId));
    if (!result.ok) {
      showToast(result.error || "Failed to cancel ticket.");
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

  const handleIssueToken = async (shopId: number | string) => {
    if (!userId) {
      showToast("Please login or register to get a token.");
      setCurrentDetailId(null);
      const next = encodeURIComponent(`/?shop=${shopId}`);
      window.location.href = `/login?next=${next}`;
      return;
    }
    setPendingShopId(shopId);
    setGuestCount(1);
    setIsGuestCountModalOpen(true);
  };

  const confirmIssueToken = async (
    overrideShopId: number | string | null = null,
    overrideGuestCount: number | null = null,
  ) => {
    const shopId = overrideShopId || pendingShopId;
    const count = overrideGuestCount || guestCount;
    if (!shopId || !userId) return;

    setIsGuestCountModalOpen(false);

    const targetShop = dbShops.find((s) => sameShop(s.id, shopId));
    if (!targetShop) return;

    const result = await createQueueTicket(String(shopId), count);
    if (!result.ok) {
      showToast(result.error || "Failed to generate token. Try again.");
      return;
    }

    const { ticket, queuePosition, immediateCall } = result.data;
    const nextTicketNo = ticket.ticketNo;

    saveToken(ticket.id);

    if (queuePosition <= 2) {
      notifiedAlmostRef.current.add(ticket.id);
    }

    setCurrentDetailId(null);

    if (immediateCall) {
      showToast(
        `Success! Ticket #${nextTicketNo} (${count} pax) — It's your turn!`,
      );
      playNotificationSound("immediate_call");
    } else {
      showToast(
        `Success! You got Ticket #${nextTicketNo} for ${targetShop.name} (${count} pax)`,
      );
    }

    await setupTicketPush(ticket.id);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null)
        clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-bgMain py-10 sm:py-2 ">
      <section
        id="venues"
        className="max-w-[1400px] mx-auto px-5 lg:px-8 relative z-20 flex-1 w-full pt-24 lg:pt-28"
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

        {/* ── REAL-TIME USER ACTIVE TOKENS DASHBOARD ───────────────────────── */}
        {showAutoCancelBanner && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-sm">Token Auto-Canceled</p>
              <p className="text-xs mt-0.5 text-red-600 leading-relaxed">
                Your token was automatically canceled because you didn&apos;t
                respond within the time limit. You can get a new token anytime.
              </p>
            </div>
            <button
              onClick={() => setShowAutoCancelBanner(false)}
              className="shrink-0 text-red-300 hover:text-red-500 transition"
            >
              ✕
            </button>
          </div>
        )}

        {myActiveTickets.length > 0 && (
          <div className="mb-10 p-6 bg-white border border-bgSurface rounded-3xl shadow-xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-bgSurface pb-4 mb-5">
              <div>
                <h3 className="text-xl font-extrabold text-brandPrimary tracking-tight flex items-center gap-2">
                  <TicketIcon className="size-6 text-brandPrimary" /> Your
                  Active Tokens
                </h3>
                <p className="text-xs text-textMuted mt-0.5">
                  Live queue trackers & counter call alerts
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

                const shopTickets = tickets.filter((t) =>
                  sameShop(t.shopId, token.shopId),
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
                  token.status === "NOTIFIED" && token.notifiedAt
                    ? computeTimerState(token.notifiedAt, currentTime)
                    : null;
                const isPending = token.status === "PENDING";
                const isNotified = token.status === "NOTIFIED";
                const isServing = token.status === "SERVING";
                const isCompleted = token.status === "COMPLETED";
                const isNoShow = token.status === "NOSHOW";

                return (
                  <div
                    key={token.id}
                    className={`relative flex flex-col justify-between border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
                      isNotified
                        ? timerState?.inWarning
                          ? "border-red-400 bg-red-50/30 ring-2 ring-red-400 animate-pulse"
                          : timerState?.isUrgent
                            ? "border-orange-400 bg-orange-50/30 ring-2 ring-orange-400"
                            : "border-blue-400 bg-blue-50/30 ring-2 ring-blue-400"
                        : "border-bgSurface bg-white hover:border-textMuted"
                    }`}
                  >
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

                        {isPending && (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-max">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>{" "}
                              Waiting in line
                            </span>
                            <p className="text-xs text-textMuted font-medium mt-1">
                              {position >= 0 ? (
                                <>
                                  Queue position{" "}
                                  <span className="font-bold text-brandPrimary">
                                    #{position + 1}
                                  </span>
                                  {position > 0 && (
                                    <>
                                      {" "}
                                      ·{" "}
                                      <span className="font-bold text-brandPrimary">
                                        {position}{" "}
                                        {position === 1 ? "person" : "people"}
                                      </span>{" "}
                                      ahead
                                    </>
                                  )}
                                </>
                              ) : (
                                "Calculating line position..."
                              )}
                            </p>
                          </div>
                        )}

                        {isNotified && (
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

                        {isServing && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 w-max">
                            🪑 Being served
                          </span>
                        )}

                        {isCompleted && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 w-max">
                            ✓ Completed
                          </span>
                        )}

                        {isNoShow && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 w-max">
                            ✕ No show
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-5 py-4 bg-bgMain border-t border-bgSurface flex items-center justify-between gap-3">
                      <button
                        onClick={() => {
                          setSelectedTicketForQR(token);
                          setIsQRModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-brandPrimary hover:text-opacity-80 transition"
                      >
                        <QrIcon className="size-4" /> Show QR Code
                      </button>

                      {(isPending || isNotified || isServing) && (
                        <button
                          onClick={() => cancelTicket(token.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 transition"
                        >
                          {isPending ? "Cancel" : "Give up turn"}
                        </button>
                      )}

                      {(isCompleted || isNoShow) && (
                        <div className="flex gap-2">
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
            <PromotionBanner />
          </div>
        )}

        {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────────── */}
        <div className="sticky-filters py-3 lg:py-4 mb-6 lg:mb-8 mx-0 sm:mx-2 lg:mx-0 px-4 lg:px-6 rounded-2xl flex flex-col gap-2 border border-bgSurface shadow-md transition-all duration-300">
          <div className="flex justify-between items-center w-full">
            <span className="font-bold text-sm text-brandPrimary flex items-center gap-2">
              <FilterIcon className="size-4" /> Filter & Sort
            </span>
            <button
              onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
              className="w-9 h-9 rounded-xl bg-bgMain border border-bgSurface flex items-center justify-center text-brandPrimary hover:bg-bgSurface transition-colors shadow-sm"
            >
              <SlidersIcon className="size-4" />
            </button>
          </div>

          <div
            className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isFilterBarOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden min-h-0">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 mt-2 border-t border-bgSurface">
                <div className="flex flex-wrap items-center gap-2 lg:gap-3 w-full lg:w-auto overflow-x-auto hide-scrollbar pb-2 lg:pb-0">
                  {/* <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white border border-bgSurface text-xs sm:text-sm font-bold text-brandPrimary outline-none cursor-pointer px-4 py-2.5 rounded-xl shadow-sm shrink-0"
                  >
                    <option value="all">All Categories</option>
                    <option value="restaurant">Restaurants</option>
                    <option value="cafe">Cafes & Bakeries</option>
                    <option value="fastfood">Fast Casual</option>
                  </select> */}

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white border border-bgSurface text-xs sm:text-sm font-bold text-brandPrimary outline-none cursor-pointer px-4 py-2.5 rounded-xl shadow-sm shrink-0"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setFilterOpenNow(!filterOpenNow)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border shadow-sm shrink-0 ${filterOpenNow ? "bg-brandPrimary text-bgMain border-brandPrimary" : "bg-white text-brandPrimary border-bgSurface"}`}
                  >
                    Open Now
                  </button>
                  <button
                    onClick={() => setFilterNearBy(!filterNearBy)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border shadow-sm shrink-0 ${filterNearBy ? "bg-brandPrimary text-bgMain border-brandPrimary" : "bg-white text-brandPrimary border-bgSurface"}`}
                  >
                    Near By (&lt; 2km)
                  </button>
                  <button
                    onClick={() => setFilterFavorite(!filterFavorite)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border shadow-sm shrink-0 ${filterFavorite ? "bg-brandPrimary text-bgMain border-brandPrimary" : "bg-white text-brandPrimary border-bgSurface"}`}
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── VENUES GRID ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 lg:gap-8 pb-10">
          {filteredAndSortedShops.length > 0 ? (
            filteredAndSortedShops.map((shop) => {
              const isFav = favoriteIds.has(shop.id);
              const isToggling = togglingIds.has(shop.id);
              const hasActiveQueue = myActiveTickets.some(
                (t) =>
                  t.shopId === shop.id &&
                  (t.status === "PENDING" ||
                    t.status === "NOTIFIED" ||
                    t.status === "SERVING"),
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
                      className={`absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center transition-transform z-10 shadow-sm text-brandPrimary hover:bg-white ${isToggling ? "opacity-50 cursor-wait" : "active:scale-90"}`}
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

      {/* ── DETAIL DRAWER MODAL ─────────────────────────────────────────────── */}
      {activeShopDetail && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex flex-col justify-end lg:items-center animate-fade-in pb-0 lg:pb-10"
          onClick={() => setCurrentDetailId(null)}
        >
          <div
            className="bg-bgMain w-full max-h-[92vh] overflow-y-auto rounded-t-3xl lg:rounded-3xl lg:max-w-[500px] relative flex flex-col animate-slide-up shadow-2xl hide-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[250px] shrink-0 bg-brandPrimary">
              <img
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
                  className={`w-10 h-10 rounded-full bg-white/90 backdrop-blur text-brandPrimary flex items-center justify-center hover:bg-white transition-colors shadow-sm ${togglingIds.has(activeShopDetail.id) ? "opacity-50 cursor-wait" : ""}`}
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
                  <h1 className="text-2xl font-bold text-brandPrimary leading-tight">
                    {activeShopDetail.name}
                  </h1>
                  <p className="text-xs text-textMuted font-light uppercase tracking-wider mt-1">
                    {activeShopDetail.category}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1 mb-1">
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
                  <span className="text-[10px] text-textMuted font-bold mt-1">
                    {activeShopDetail.distance} km away
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white p-2 rounded-2xl border border-bgSurface shadow-sm text-center">
                  <UsersIcon className="size-6 inline" />
                  <h4 className="font-bold text-sm text-brandPrimary">
                    In Queue
                  </h4>
                  <p className="text-xs text-textMuted mt-1 leading-tight font-bold">
                    {liveQueueCount} active
                  </p>
                </div>
                <div className="bg-white p-2 rounded-2xl border border-bgSurface shadow-sm text-center">
                  <ClockIcon className="size-6 inline" />
                  <h4 className="font-bold text-sm text-brandPrimary">
                    Est. Wait
                  </h4>
                  <p className="text-xs text-brandPrimary mt-1 leading-tight font-bold">
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
                  (t.status === "PENDING" ||
                    t.status === "NOTIFIED" ||
                    t.status === "SERVING"),
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

      {/* ── TOAST ───────────────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 bg-brandPrimary text-bgMain px-6 py-3 rounded-xl text-sm font-medium shadow-2xl z-[120] transition-all duration-300 transform text-center w-max max-w-[90%] border border-white/10 ${isToastVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"}`}
      >
        {toastMessage}
      </div>

      {/* ── TICKET QR MODAL ─────────────────────────────────────────────────── */}
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
              <div className="p-4 bg-bgMain rounded-2xl border border-bgSurface shadow-inner mb-6">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedTicketForQR.id)}&bgcolor=ffffff&color=1e293b&margin=2`}
                  alt="QR"
                  className="w-44 h-44 rounded-lg object-contain"
                />
              </div>
              <p className="text-xs text-textMuted font-semibold leading-relaxed max-w-xs">
                Present this QR code to the merchant when your ticket is called.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── WARNING (3 MINS) MODAL ──────────────────────────────────────────── */}
      {isWarningModalOpen && warningTokenId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[105] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative">
            <div className="bg-orange-50 px-6 pt-8 pb-6 text-center border-b border-orange-100">
              <div className="text-6xl mb-4">⏰</div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                Time&apos;s Up!
              </h2>
              <p className="text-textMuted text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
                Your 3-minute window to reach the counter has passed. Choose an
                option below.
              </p>
              <p className="mt-3 text-xs text-textMuted">
                Auto-canceling in{" "}
                <span className="font-black text-orange-500 text-sm">
                  {expiredCountdown}
                </span>
                s if no action taken.
              </p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <button
                onClick={async () => {
                  const token = tickets.find((t) => t.id === warningTokenId);
                  if (token) {
                    await cancelTicket(token.id);
                    await confirmIssueToken(
                      token.shopId,
                      token.personCount || 1,
                    );
                  }
                  setIsWarningModalOpen(false);
                  setWarningTokenId(null);
                }}
                className="w-full bg-brandPrimary hover:bg-opacity-90 text-white py-3.5 rounded-xl font-bold text-sm transition shadow-md"
              >
                Rejoin Queue (Go to End)
              </button>
              <button
                onClick={async () => {
                  await cancelTicket(warningTokenId);
                  setIsWarningModalOpen(false);
                  setWarningTokenId(null);
                }}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3.5 rounded-xl font-bold text-sm transition"
              >
                Cancel My Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GUEST COUNT MODAL ───────────────────────────────────────────────── */}
      {isGuestCountModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsGuestCountModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-brandPrimary text-white px-6 pt-7 pb-5 text-center">
              <p className="text-xs uppercase font-bold tracking-widest text-white/70 mb-1">
                Almost there
              </p>
              <h3 className="text-2xl font-black">How many people?</h3>
              <p className="text-sm text-white/70 mt-1">Including yourself</p>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-center gap-6 my-4">
                <button
                  onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                  className="w-12 h-12 rounded-full bg-bgSurface border border-bgSurface text-brandPrimary text-2xl font-black flex items-center justify-center hover:bg-brandPrimary hover:text-white transition-colors shadow-sm"
                >
                  −
                </button>
                <span className="text-5xl font-black text-brandPrimary w-16 text-center">
                  {guestCount}
                </span>
                <button
                  onClick={() => setGuestCount((c) => Math.min(20, c + 1))}
                  className="w-12 h-12 rounded-full bg-bgSurface border border-bgSurface text-brandPrimary text-2xl font-black flex items-center justify-center hover:bg-brandPrimary hover:text-white transition-colors shadow-sm"
                >
                  +
                </button>
              </div>

              <div className="flex justify-center gap-2 mb-6 flex-wrap">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGuestCount(n)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-colors ${guestCount === n ? "bg-brandPrimary text-white border-brandPrimary" : "bg-white text-brandPrimary border-bgSurface hover:border-brandPrimary"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <button
                onClick={() => confirmIssueToken(null, null)}
                className="w-full bg-brandPrimary hover:bg-opacity-90 text-white py-3.5 rounded-xl font-bold text-sm transition shadow-md"
              >
                Confirm & Get Token
              </button>
              <button
                onClick={() => setIsGuestCountModalOpen(false)}
                className="w-full mt-2 text-textMuted text-sm font-semibold py-2 hover:text-brandPrimary transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
