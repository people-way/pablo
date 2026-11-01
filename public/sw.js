/**
 * Served at /sw.js, the address of the worker installed before /pablo.
 * Vercel publishes this public file at the domain root, so an update is a
 * 200 rather than a redirect. It drops the old caches and unregisters.
 * The live worker is /pablo/app-sw.js.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: "window" });
      await Promise.all(windows.map((client) => client.navigate(client.url)));
    })(),
  );
});
