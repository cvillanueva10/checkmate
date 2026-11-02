/* Only the public app shell and same-origin static assets are cached. Auth/API traffic is never cached. */
const CACHE = "checkmate-shell-v1";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/", "/icon.svg", "/manifest.webmanifest"])));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("checkmate-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request, url = new URL(req.url);
  if(req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api") || url.searchParams.has("_rsc") || req.headers.get("RSC")) return;
  if(req.mode === "navigate") {
    event.respondWith(fetch(req).then(response => {
      if(response.ok) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(cache=>cache.put("/",copy))); }
      return response;
    }).catch(()=>caches.match("/").then(response=>response || Response.error())));
    return;
  }
  if(url.pathname.startsWith("/_next/static/") || /^\/icon/.test(url.pathname)) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
      if(response.ok) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy))); }
      return response;
    })));
  }
});

self.addEventListener("message", event => {
  if(event.data?.type !== "CACHE_ASSETS" || !Array.isArray(event.data.assets)) return;
  const urls=event.data.assets.filter(value=>{ try { const u=new URL(value); return u.origin === self.location.origin && u.pathname.startsWith("/_next/static/"); } catch { return false; } });
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(urls.map(url=>cache.add(url)))));
});
