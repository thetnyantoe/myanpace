// Supabase Edge Function: queue-tick
//
// Invoked every minute by pg_cron (see backend/MIGRATIONS.sql section 5).
// Scans NOTIFIED tickets and:
//   (a) Sends notification #4 (3-minute warning) and stamps warnedAt — once.
//   (b) Sends notification #5a (auto-cancel) and transitions the ticket to
//       NOSHOW when the 4-minute total window elapses.
//
// Reuses the existing `send-push` edge function for actual delivery so VAPID
// signing logic stays in one place.
//
// Deploy:
//   supabase functions deploy queue-tick --no-verify-jwt
//
// Required environment / secrets on the Supabase project:
//   SUPABASE_URL                 (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY    (auto-injected)
//   SUPABASE_ANON_KEY            (auto-injected) — used to call send-push
//   QUEUE_TICK_SECRET            — shared with the pg_cron job
//
// All timings must match lib/queue/constants.ts.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CALL_WINDOW_MS = 3 * 60 * 1000; // 3 min → warning fires
const TOTAL_WINDOW_MS = 4 * 60 * 1000; // 4 min → auto-cancel

interface Ticket {
  id: string;
  shopId: string;
  ticketNo: number;
  status: string;
  notifiedAt: string | null;
  warnedAt: string | null;
  subscription: PushSubscriptionJSON | null;
}

interface Shop {
  id: string;
  name: string;
}

async function sendPush(
  pushUrl: string,
  anonKey: string,
  subscription: PushSubscriptionJSON,
  title: string,
  body: string,
  type: string,
): Promise<void> {
  try {
    const res = await fetch(pushUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ subscription, title, body, type }),
    });
    if (!res.ok) {
      console.warn("[queue-tick] send-push failed", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[queue-tick] send-push error", e);
  }
}

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("QUEUE_TICK_SECRET");
  const auth = req.headers.get("Authorization") || "";
  if (!expected || auth !== `Bearer ${expected}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const pushUrl = `${supabaseUrl}/functions/v1/send-push`;

  const sb = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: tickets, error } = await sb
    .from("Ticket")
    .select(
      "id, shopId, ticketNo, status, notifiedAt, warnedAt, subscription",
    )
    .eq("status", "NOTIFIED")
    .not("notifiedAt", "is", null);

  if (error) {
    return new Response(`db error: ${error.message}`, { status: 500 });
  }

  const list = (tickets ?? []) as Ticket[];
  if (list.length === 0) {
    return new Response(JSON.stringify({ warned: 0, canceled: 0 }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Resolve shop names in one round-trip.
  const shopIds = Array.from(new Set(list.map((t) => t.shopId)));
  const { data: shops } = await sb
    .from("Shop")
    .select("id, name")
    .in("id", shopIds);
  const shopName = new Map<string, string>(
    (shops as Shop[] | null ?? []).map((s) => [s.id, s.name]),
  );

  const now = Date.now();
  let warned = 0;
  let canceled = 0;

  for (const t of list) {
    if (!t.notifiedAt) continue;
    const elapsed = now - new Date(t.notifiedAt).getTime();
    const name = shopName.get(t.shopId) || "the shop";

    // Auto-cancel takes precedence — once the total window passes, push the
    // cancel notification (#5a) and flip status. Skips the warning push if
    // we somehow missed it (the cron should hit the 3-min boundary first).
    if (elapsed >= TOTAL_WINDOW_MS) {
      const { error: upErr } = await sb
        .from("Ticket")
        .update({ status: "NOSHOW", noshowAt: new Date(now).toISOString() })
        .eq("id", t.id)
        .eq("status", "NOTIFIED");
      if (upErr) {
        console.warn("[queue-tick] cancel update failed", t.id, upErr.message);
        continue;
      }
      if (t.subscription) {
        await sendPush(
          pushUrl,
          anonKey,
          t.subscription,
          `❌ ${name}: Token Canceled`,
          `Ticket #${t.ticketNo} was auto-canceled after 4 minutes.`,
          "canceled",
        );
      }
      canceled++;
      continue;
    }

    // 3-min warning — fire exactly once via warnedAt sentinel.
    if (elapsed >= CALL_WINDOW_MS && !t.warnedAt) {
      const { error: upErr } = await sb
        .from("Ticket")
        .update({ warnedAt: new Date(now).toISOString() })
        .eq("id", t.id)
        .is("warnedAt", null);
      if (upErr) {
        console.warn("[queue-tick] warn update failed", t.id, upErr.message);
        continue;
      }
      if (t.subscription) {
        await sendPush(
          pushUrl,
          anonKey,
          t.subscription,
          `⚠️ ${name}: Time is up!`,
          `Ticket #${t.ticketNo} — please return to the counter now or your token will be canceled.`,
          "warning",
        );
      }
      warned++;
    }
  }

  return new Response(JSON.stringify({ scanned: list.length, warned, canceled }), {
    headers: { "content-type": "application/json" },
  });
});
