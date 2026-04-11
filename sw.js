/* ═══════════════════════════════════════════════════
   Service Worker — 垃圾車快到了
   Strategy:
   - App Shell (HTML, icons) → Cache First
   - Leaflet assets           → Cache First
   - NTPC API / GPS data      → Network First (dynamic)
   - Nominatim geocoding      → Network First (dynamic)
═══════════════════════════════════════════════════ */

const CACHE_NAME    = 'gtruck-shell-v4';
const DYNAMIC_CACHE = 'gtruck-dynamic-v4';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './routes.csv',          // route data — same-origin, no CORS issues
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

const NETWORK_FIRST_PATTERNS = [
  'data.ntpc.gov.tw',
  'nominatim.openstreetmap.org',
  'allorigins.win',
  'corsproxy.io',
  'thingproxy.freeboard.io',
  'routes.csv',            // always fetch latest CSV; fall back to cache if offline
];

/* ── Install: cache shell assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: clean old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE)
          .map(k  => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: route by strategy ── */
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-GET and non-http(s) requests (e.g. chrome-extension://)
  if (event.request.method !== 'GET') return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // Network First for dynamic API data
  if (NETWORK_FIRST_PATTERNS.some(p => url.includes(p))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache First for shell / Leaflet / tiles
  event.respondWith(cacheFirst(event.request));
});

/* ── Cache First strategy ── */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('離線中，無法載入資源', { status: 503 });
  }
}

/* ── Network First strategy ── */
async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: '離線，無法取得最新資料' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}
