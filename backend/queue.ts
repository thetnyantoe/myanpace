"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { clearSession, getShopSession } from "@/backend/session";
import {
  ACTIVE_QUEUE_STATUSES,
  type TicketStatus,
} from "@/lib/queue/types";
import { pushToTicket, pushToSubscription } from "@/lib/queue/push-server";

async function getShopName(shopId: string): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("Shop")
      .select("name")
      .eq("id", shopId)
      .maybeSingle();
    return (data?.name as string) || "the shop";
  } catch {
    return "the shop";
  }
}

/**
 * After a ticket moves to NOTIFIED ("Call" clicked), the customer at the head
 * of the remaining queue should be warned they are next. We fire-and-forget so
 * the manager's action isn't blocked by a push failure.
 */
async function notifyAlmostTurn(
  shopId: string,
  excludeTicketId: string,
  shopName: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("Ticket")
      .select("id, ticketNo")
      .eq("shopId", shopId)
      .eq("status", "PENDING")
      .neq("id", excludeTicketId)
      .order("createdAt", { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) return;
    const head = data[0];
    await pushToTicket(head.id, {
      title: `⏳ ${shopName}: You're Next!`,
      body: `Ticket #${head.ticketNo} — only 1 person ahead of you. Get ready!`,
      type: "almost_turn",
    });
  } catch (e) {
    console.warn("[notifyAlmostTurn] failed:", e);
  }
}

export type QueueActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Columns safe to return to any authenticated/anonymous reader.
// Excludes `subscription` (push endpoint) and `customerId` (PII linkage).
const PUBLIC_TICKET_COLUMNS =
  "id, shopId, ticketNo, status, createdAt, notifiedAt, servedAt, personCount";

async function requireCustomer() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Please log in to get a token." };
  return { ok: true as const, userId: user.id };
}

async function requireManagerShop(shopId?: string) {
  const shopSession = await getShopSession();
  if (!shopSession) {
    return { ok: false as const, error: "Shop session not found. Please log in." };
  }
  if (shopId && shopSession.id !== shopId) {
    return { ok: false as const, error: "Not authorized for this shop." };
  }

  // Verify the shop still exists / hasn't been deleted since login.
  const admin = createAdminClient();
  const { data: shop, error } = await admin
    .from("Shop")
    .select("id")
    .eq("id", shopSession.id)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }
  if (!shop) {
    await clearSession();
    return { ok: false as const, error: "Shop no longer exists. Please log in again." };
  }

  return { ok: true as const, shopId: shopSession.id };
}

/**
 * Returns ticket IDs that belong to the currently signed-in customer and are
 * still active in some shop's queue. The customer-side UI uses this to keep
 * the "my tokens" list in sync with the DB — important when tickets are
 * created out-of-band (e.g. by the PaceAI assistant) and never touched
 * localStorage on this device.
 */
export async function fetchMyActiveTicketIds(): Promise<
  QueueActionResult<string[]>
> {
  const auth = await requireCustomer();
  if (!auth.ok) return auth;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("Ticket")
      .select("id")
      .eq("customerId", auth.userId)
      .in("status", ACTIVE_QUEUE_STATUSES);

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).map((t: any) => t.id) };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Failed to load your active tickets.",
    };
  }
}

/**
 * Public, read-only feed used by the customer ShopBrowser to compute "X ahead
 * of you" counts. Intentionally strips `subscription` and `customerId` so the
 * endpoint cannot be used to harvest push endpoints or link tickets to users.
 */
export async function fetchAllTickets(): Promise<QueueActionResult<any[]>> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("Ticket")
      .select(PUBLIC_TICKET_COLUMNS)
      .order("createdAt", { ascending: true });

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load tickets.",
    };
  }
}

export async function fetchShopTickets(
  shopId: string,
): Promise<QueueActionResult<any[]>> {
  const auth = await requireManagerShop(shopId);
  if (!auth.ok) return auth;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("Ticket")
      .select("*")
      .eq("shopId", shopId)
      .order("createdAt", { ascending: true });

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data ?? [] };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load shop tickets.",
    };
  }
}

const MAX_TICKET_CREATE_RETRIES = 3;

export async function createQueueTicket(
  shopId: string,
  personCount: number,
): Promise<
  QueueActionResult<{
    ticket: any;
    queuePosition: number;
    immediateCall: boolean;
  }>
> {
  const auth = await requireCustomer();
  if (!auth.ok) return auth;

  try {
    const admin = createAdminClient();

    // Retry loop guards against the read-then-insert race where two concurrent
    // customers compute the same nextTicketNo. Relies on a unique
    // (shopId, ticketNo) index to surface the conflict.
    let ticket: any = null;
    let queuePosition = 0;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < MAX_TICKET_CREATE_RETRIES; attempt++) {
      const { data: shopTickets, error: loadError } = await admin
        .from("Ticket")
        .select("id, ticketNo, status")
        .eq("shopId", shopId);

      if (loadError) return { ok: false, error: loadError.message };

      const tickets = shopTickets ?? [];
      const maxTicket = tickets.reduce(
        (max, t) => Math.max(max, t.ticketNo || 0),
        0,
      );
      const nextTicketNo = maxTicket + 1;
      const activeCount = tickets.filter((t) =>
        ACTIVE_QUEUE_STATUSES.includes(t.status),
      ).length;
      queuePosition = activeCount + 1;

      const { data, error } = await admin
        .from("Ticket")
        .insert({
          shopId,
          customerId: auth.userId,
          status: "PENDING",
          ticketNo: nextTicketNo,
          personCount,
        })
        .select()
        .single();

      if (!error && data) {
        ticket = data;
        break;
      }

      // Postgres unique_violation = 23505. Retry to recompute nextTicketNo.
      const code = (error as { code?: string } | null)?.code;
      if (code === "23505") {
        lastError = error?.message ?? "Ticket number conflict.";
        continue;
      }

      return { ok: false, error: error?.message ?? "Failed to create ticket." };
    }

    if (!ticket) {
      return {
        ok: false,
        error: lastError ?? "Failed to create ticket after retries.",
      };
    }

    const immediateCall = queuePosition === 1;

    if (immediateCall) {
      const nowIso = new Date().toISOString();
      const { data: notified, error: notifyError } = await admin
        .from("Ticket")
        .update({ status: "NOTIFIED", notifiedAt: nowIso })
        .eq("id", ticket.id)
        .select()
        .single();

      if (notifyError) {
        return { ok: false, error: notifyError.message };
      }
      ticket = notified ?? ticket;
    }

    return {
      ok: true,
      data: { ticket, queuePosition, immediateCall },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create ticket.",
    };
  }
}

export async function updateQueueTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
): Promise<QueueActionResult<any>> {
  const auth = await requireManagerShop();
  if (!auth.ok) return auth;

  try {
    const admin = createAdminClient();
    const { data: existing, error: findError } = await admin
      .from("Ticket")
      .select("*")
      .eq("id", ticketId)
      .eq("shopId", auth.shopId)
      .maybeSingle();

    if (findError) return { ok: false, error: findError.message };
    if (!existing) return { ok: false, error: "Ticket not found for this shop." };

    // Idempotency: no-op if already in the target state. Prevents duplicate
    // writes when multiple manager tabs fire the same auto-cancel.
    if (existing.status === newStatus) {
      return { ok: true, data: existing };
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, string> = { status: newStatus };
    if (newStatus === "NOTIFIED") updatePayload.notifiedAt = nowIso;
    if (newStatus === "COMPLETED") updatePayload.servedAt = nowIso;
    if (newStatus === "NOSHOW") updatePayload.noshowAt = nowIso;

    const { data, error } = await admin
      .from("Ticket")
      .update(updatePayload)
      .eq("id", ticketId)
      .select()
      .single();

    if (error) return { ok: false, error: error.message };

    // Fire-and-forget server-side push triggers. Awaited so the action
    // doesn't return before the edge-function call lands, but errors inside
    // pushToTicket are already swallowed so they can't block the status
    // change the manager just made.
    const shopName = await getShopName(existing.shopId);
    if (newStatus === "NOTIFIED") {
      await pushToTicket(ticketId, {
        title: `🔔 ${shopName}: It's Your Turn!`,
        body: `Ticket #${existing.ticketNo} — please come to the counter within 3 minutes!`,
        type: "called",
      });
      // The next pending ticket in this shop is now the head — warn them.
      await notifyAlmostTurn(existing.shopId, ticketId, shopName);
    } else if (newStatus === "COMPLETED") {
      await pushToTicket(ticketId, {
        title: `✅ ${shopName}: All done!`,
        body: `Ticket #${existing.ticketNo} completed. Thanks for visiting!`,
        type: "finish",
      });
    } else if (newStatus === "NOSHOW") {
      await pushToTicket(ticketId, {
        title: `❌ ${shopName}: Token Canceled`,
        body: `Ticket #${existing.ticketNo} was canceled.`,
        type: "canceled",
      });
    }

    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update ticket.",
    };
  }
}

export async function cancelQueueTicket(
  ticketId: string,
): Promise<QueueActionResult<any>> {
  const customerAuth = await requireCustomer();
  if (customerAuth.ok) {
    try {
      const admin = createAdminClient();
      const { data: existing, error: findError } = await admin
        .from("Ticket")
        .select("id, customerId, status")
        .eq("id", ticketId)
        .maybeSingle();

      if (findError) return { ok: false, error: findError.message };
      if (!existing) return { ok: false, error: "Ticket not found." };

      // Strict ownership: a null customerId is treated as untrusted/legacy and
      // cannot be cancelled by an arbitrary logged-in customer.
      if (!existing.customerId || existing.customerId !== customerAuth.userId) {
        return { ok: false, error: "Not authorized to cancel this ticket." };
      }

      // Idempotency
      if (existing.status === "NOSHOW") {
        return { ok: true, data: existing };
      }

      const nowIso = new Date().toISOString();
      const { data, error } = await admin
        .from("Ticket")
        .update({ status: "NOSHOW", noshowAt: nowIso })
        .eq("id", ticketId)
        .select()
        .single();

      if (error) return { ok: false, error: error.message };
      return { ok: true, data };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to cancel ticket.",
      };
    }
  }

  return updateQueueTicketStatus(ticketId, "NOSHOW");
}

export async function saveTicketSubscription(
  ticketId: string,
  subscription: PushSubscriptionJSON,
): Promise<QueueActionResult<null>> {
  const auth = await requireCustomer();
  if (!auth.ok) return auth;

  try {
    const admin = createAdminClient();

    // Ownership check: only the customer who owns the ticket may attach
    // a push subscription to it.
    const { data: existing, error: findError } = await admin
      .from("Ticket")
      .select("id, customerId, shopId, ticketNo, status, subscription")
      .eq("id", ticketId)
      .maybeSingle();

    if (findError) return { ok: false, error: findError.message };
    if (!existing) return { ok: false, error: "Ticket not found." };
    if (!existing.customerId || existing.customerId !== auth.userId) {
      return {
        ok: false,
        error: "Not authorized to set subscription on this ticket.",
      };
    }

    const isFirstSubscribe = !existing.subscription;

    const { error } = await admin
      .from("Ticket")
      .update({ subscription })
      .eq("id", ticketId);

    if (error) return { ok: false, error: error.message };

    // Fire #1 (token confirmed) or fold straight to #3 (immediate call) the
    // first time the customer grants push permission. Subsequent re-subscribes
    // (e.g. user toggled permission off then on) don't re-fire — the customer
    // already has the original confirmation.
    if (isFirstSubscribe) {
      const shopName = await getShopName(existing.shopId);
      if (existing.status === "NOTIFIED") {
        await pushToSubscription(subscription, {
          title: `🔔 ${shopName}: It's Your Turn!`,
          body: `Ticket #${existing.ticketNo} — please come to the counter within 3 minutes!`,
          type: "immediate_call",
        });
      } else if (existing.status === "PENDING") {
        await pushToSubscription(subscription, {
          title: `✅ ${shopName}: Token Confirmed`,
          body: `You got ticket #${existing.ticketNo}. We'll notify you when it's almost your turn.`,
          type: "token_confirmed",
        });
      }
    }

    return { ok: true, data: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save subscription.",
    };
  }
}
