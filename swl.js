/* ═══════════════════════════════════════════════════
Service Worker — 垃圾車快到了
Strategy:
App Shell (HTML, icons, AUDIO) → Cache First
Leaflet assets                 → Cache First
NTPC API / GPS data            → Network First (dynamic)
Nominatim geocoding            → Network First (dynamic)
═══════════════════════════════════════════════════ */
const CACHE_NAME    = 'gtruck-shell-v5'; // Updated to v5 to cache new audio files
const DYNAMIC_CACHE = 'gtruck-dynamic-v5'; // Updated to match
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './routes.csv',          // route data — same-origin, no CORS issues
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Audio files for offline playback
  './audio/您已開啟語音提醒請自行調整音量.mp3',
  './audio/您已關閉語音提醒.mp3',
  './audio/垃圾車到了請準備.mp3',
  './audio/垃圾車距離您 200 公尺.mp3',
  './audio/垃圾車距離您 300 公尺.mp3',
  './audio/垃圾車距離您 400 公尺.mp3',
  './audio/垃圾車距離您 500 公尺.mp3',
  './audio/垃圾車距離您 600 公尺.mp3',
  './audio/垃圾車距離您 700 公尺.mp3',
  './audio/垃圾車距離您 800 公尺.mp3',
  './audio/垃圾車距離您 900 公尺.mp3',
  './audio/垃圾車距離您 1000 公尺.mp3',
  // Leaflet
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
  // Cache First for shell / Leaflet / tiles / AUDIO
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