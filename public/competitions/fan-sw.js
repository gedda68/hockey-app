self.addEventListener("push", (event) => {
  let data = { title: "Hockey update", body: "Open the site for details.", url: "/competitions/" };
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url || "/competitions/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/competitions/";
  event.waitUntil(self.clients.openWindow(url));
});
