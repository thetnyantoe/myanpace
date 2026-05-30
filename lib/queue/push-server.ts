import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";
import { getPushUrl, getSupabaseAnonKey } from "./constants";

export type PushType =
  | "token_confirmed"
  | "almost_turn"
  | "called"
  | "immediate_call"
  | "warning"
  | "canceled"
  | "finish";

interface PushPayload {
  title: string;
  body: string;
  type: PushType;
}

async function deliver(
  subscription: PushSubscriptionJSON,
  payload: PushPayload,
): Promise<void> {
  const url = getPushUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    console.warn("[push-server] Missing Supabase config; skip push.");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ subscription, ...payload }),
    });
    if (!res.ok) {
      console.warn(
        "[push-server] send-push failed:",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (e) {
    console.warn("[push-server] send-push error:", e);
  }
}

/**
 * Look up the ticket's stored push subscription and send a push.
 * Silently no-ops if the ticket has no subscription yet (the customer
 * hasn't granted permission). Fire-and-forget — never throws.
 */
export async function pushToTicket(
  ticketId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("Ticket")
      .select("subscription")
      .eq("id", ticketId)
      .maybeSingle();

    if (error || !data?.subscription) return;
    await deliver(data.subscription as PushSubscriptionJSON, payload);
  } catch (e) {
    console.warn("[push-server] pushToTicket error:", e);
  }
}

/**
 * Push to an already-loaded subscription (saves a DB round-trip when the
 * caller already has the row in hand).
 */
export async function pushToSubscription(
  subscription: PushSubscriptionJSON,
  payload: PushPayload,
): Promise<void> {
  await deliver(subscription, payload);
}
