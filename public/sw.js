// sw.js — QueueMaster Service Worker
// Served from /public so Next.js exposes it at /sw.js

const CACHE_NAME = "queuemaster-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "QueueMaster",
      body: event.data ? event.data.text() : "Your queue position has updated.",
      type: "generic",
    };
  }

  const type = data.type || "generic";
  const isYourTurn = type === "called" || type === "immediate_call";
  const isWarning = type === "warning";
  const isCanceled = type === "canceled";
  const isAlmost = type === "almost_turn";

  const options = {
    body: data.body,
    icon: "/logo.jpg",
    badge: "/logo.jpg",
    vibrate: isYourTurn
      ? [300, 100, 300, 100, 300]
      : isWarning
        ? [500, 200, 500, 200, 500]
        : isCanceled
          ? [100, 50, 100]
          : isAlmost
            ? [200, 100, 200]
            : [150],
    data: data.data || {},
    requireInteraction: isYourTurn || isWarning,
    tag: isYourTurn
      ? "qm-turn"
      : isWarning
        ? "qm-warn"
        : isCanceled
          ? "qm-cancel"
          : "qm-queued",
    renotify: true,
  };

  const title = data.title || "QueueMaster";

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() =>
        self.clients.matchAll({ includeUncontrolled: true, type: "window" }),
      )
      .then((clients) => {
        clients.forEach((client) =>
          client.postMessage({
            type: "PLAY_NOTIFICATION_SOUND",
            notificationType: type,
          }),
        );
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const focused = clients.find(
          (c) => c.url && c.visibilityState === "visible",
        );
        if (focused) return focused.focus();
        if (clients.length > 0) return clients[0].focus();
        return self.clients.openWindow("/");
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "PLAY_NOTIFICATION_SOUND") {
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clients) => {
        clients.forEach((c) =>
          c.postMessage({
            type: "PLAY_NOTIFICATION_SOUND",
            notificationType: event.data.notificationType,
          }),
        );
      });
  }
});
