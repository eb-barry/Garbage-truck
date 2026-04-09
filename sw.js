/* ═══════════════════════════════════════════════════
Service Worker — 垃圾車快到了
Strategy:
App Shell (HTML, icons, AUDIO) → Cache First
Leaflet assets                 → Cache First
NTPC API / GPS data            → Network First (dynamic)
Nominatim geocoding            → Network First (dynamic)
═══════════════════════════════════════════════════ */
const CACHE_NAME    = 'gtruck-shell-v5'; // Updated to v5 to cache new files
const DYNAMIC_CACHE = 'gtruck-dynamic-v5';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './routes.csv',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Audio files for offline playback
  './audio/您已開啟語音提醒請自行調整音量.mp3',
  './audio/您已關閉語音提醒.mp3',
  './audio/垃圾車到了請準備.mp3',
  './audio/垃圾車距離您200公尺.mp3',
  './audio/垃圾車距離您300公尺.mp3',
  './audio/垃圾車距離您400公尺.mp3',
  './audio/垃圾車距離您500公尺.mp3',
  './audio/垃圾車距離您600公尺.mp3',
  './audio/垃圾車距離您700公尺.mp3',
  './audio/垃圾車距離您800公尺.mp3',
  './audio/垃圾車距離您900公尺.mp3',
  './audio/垃圾車距離您1000公尺.mp3',
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
  'routes.csv',
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