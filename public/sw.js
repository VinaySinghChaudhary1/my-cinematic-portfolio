/* Portfolio service worker — installable app + offline cache.
 * - /_next/static, fonts, icons: cache-first (file names are content-hashed / immutable)
 * - images (/media, /me, /demo, /_next/image): stale-while-revalidate, capped
 * - pages: network-first, falling back to the cached copy, then /offline
 * - never touches /admin, /api, /beta, /auth or non-GET requests
 * Pages viewed while signed in (admin / tester / preview) are not cached: the server marks them x-sw-cache: no.
 */
const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const OFFLINE = "/offline";
const MAX_PAGES = 30;
const MAX_IMAGES = 80;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.add(new Request(OFFLINE, { cache: "reload" })))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES, IMAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const PRIVATE = /^\/(admin|api|beta|auth)(\/|$)/;

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

function cacheable(res) {
  return res && res.ok && res.type === "basic" && res.headers.get("x-sw-cache") !== "no";
}

async function pageFetch(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (cacheable(res)) {
      cache.put(req, res.clone()).then(() => trim(PAGES, MAX_PAGES));
    }
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match(OFFLINE)) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, e) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res.ok && (res.type === "basic" || res.type === "cors")) cache.put(req, res.clone()).then(() => trim(IMAGES, MAX_IMAGES));
      return res;
    })
    .catch(() => hit || Response.error());
  if (hit) {
    e.waitUntil(net);
    return hit;
  }
  return net;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE.test(url.pathname)) return;

  if (req.mode === "navigate") return e.respondWith(pageFetch(req));
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|ttf|otf)$/.test(url.pathname)) return e.respondWith(cacheFirst(req));
  if (req.destination === "image" && /^\/(media|me|demo|_next\/image|layouts)\//.test(url.pathname)) return e.respondWith(staleWhileRevalidate(req, e));
});

self.addEventListener("message", (e) => {
  if (e.data === "clear-pages") e.waitUntil(caches.delete(PAGES));
});
