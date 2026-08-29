self.addEventListener("push", (event) => {
  let data = { title: "Maresi", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    try {
      if (event.data) data.body = event.data.text();
    } catch (__) {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Maresi", {
      body: data.body || "",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && path) client.navigate(path);
          return;
        }
      }
      return self.clients.openWindow(path);
    })
  );
});
