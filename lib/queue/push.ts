import { getPushUrl, getSupabaseAnonKey, VAPID_PUBLIC_KEY } from "./constants";

export function urlB64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    view[i] = raw.charCodeAt(i);
  }
  return view;
}

export async function sendPush(
  subscription: PushSubscriptionJSON,
  title: string,
  body: string,
  type = "generic",
): Promise<void> {
  if (!subscription) return;

  const pushUrl = getPushUrl();
  const anonKey = getSupabaseAnonKey();
  if (!pushUrl || !anonKey) return;

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
      console.error("Push failed:", await res.text());
    }
  } catch (e) {
    console.warn("Push error:", e);
  }
}

export async function setupTicketPush(
  tokenId: string,
  ticketNo: number,
  queuePosition: number,
  shopName: string,
  immediateCall: boolean,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || !("PushManager" in window)) return;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return;

  try {
    await navigator.serviceWorker.register("/sw.js");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { saveTicketSubscription } = await import("@/backend/queue");
    const saveResult = await saveTicketSubscription(tokenId, sub.toJSON());
    if (!saveResult.ok) {
      console.warn("Failed to save push subscription:", saveResult.error);
    }

    if (immediateCall || queuePosition === 1) {
      await sendPush(
        sub.toJSON(),
        `🔔 ${shopName}: It's Your Turn!`,
        `Ticket #${ticketNo} — please come to the counter within 3 minutes!`,
        "immediate_call",
      );
    } else {
      const ahead = queuePosition - 1;
      const peopleStr = ahead === 1 ? "1 person is" : `${ahead} people are`;
      await sendPush(
        sub.toJSON(),
        `✅ ${shopName}: Token Confirmed`,
        `You got ticket #${ticketNo}. There ${peopleStr} ahead of you.`,
        "queued",
      );
    }
  } catch (e) {
    console.warn("Push subscribe failed:", e);
  }
}
