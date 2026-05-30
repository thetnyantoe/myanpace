import { VAPID_PUBLIC_KEY } from "./constants";

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

/**
 * Subscribe the browser to Web Push and persist the subscription for this
 * ticket. Notifications themselves (#1 token confirmed, #3 your turn, etc.)
 * are fired from the server — saveTicketSubscription sends the initial
 * confirmation the first time a subscription is attached.
 */
export async function setupTicketPush(tokenId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || !("PushManager" in window)) return;
  if (!("serviceWorker" in navigator)) return;

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
  } catch (e) {
    console.warn("Push subscribe failed:", e);
  }
}
