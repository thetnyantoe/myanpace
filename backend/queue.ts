"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { getShopSession } from "@/backend/session";
import {
  ACTIVE_QUEUE_STATUSES,
  type TicketStatus,
} from "@/lib/queue/types";

export type QueueActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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
  return { ok: true as const, shopId: shopSession.id };
}

export async function fetchAllTickets(): Promise<QueueActionResult<any[]>> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("Ticket")
      .select("*")
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
    const queuePosition = activeCount + 1;

    const { data, error } = await admin
      .from("Ticket")
      .insert({
        shopId,
        status: "PENDING",
        ticketNo: nextTicketNo,
        personCount,
      })
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Failed to create ticket." };
    }

    let ticket = data;
    const immediateCall = queuePosition === 1;

    if (immediateCall) {
      const nowIso = new Date().toISOString();
      const { data: notified, error: notifyError } = await admin
        .from("Ticket")
        .update({ status: "NOTIFIED", notifiedAt: nowIso })
        .eq("id", data.id)
        .select()
        .single();

      if (notifyError) {
        return { ok: false, error: notifyError.message };
      }
      ticket = notified ?? data;
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

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, string> = { status: newStatus };
    if (newStatus === "NOTIFIED") updatePayload.notifiedAt = nowIso;
    if (newStatus === "COMPLETED") updatePayload.servedAt = nowIso;

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
        .select("id, customerId")
        .eq("id", ticketId)
        .maybeSingle();

      if (findError) return { ok: false, error: findError.message };
      if (!existing) return { ok: false, error: "Ticket not found." };
      if (
        existing.customerId &&
        existing.customerId !== customerAuth.userId
      ) {
        return { ok: false, error: "Not authorized to cancel this ticket." };
      }

      const { data, error } = await admin
        .from("Ticket")
        .update({ status: "NOSHOW" })
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
