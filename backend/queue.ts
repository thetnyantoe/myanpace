"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { clearSession, getShopSession } from "@/backend/session";
import {
  ACTIVE_QUEUE_STATUSES,
  type TicketStatus,
} from "@/lib/queue/types";

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
      .select("id, customerId")
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

    const { error } = await admin
      .from("Ticket")
      .update({ subscription })
      .eq("id", ticketId);

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save subscription.",
    };
  }
}
