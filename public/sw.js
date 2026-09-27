const CACHE = '__APP_CACHE_NAME__';
const APP_ASSETS = __APP_ASSETS__;
const SCENES = [
  '/camera-simulator/scenes/tokyo-rain.png',
  '/camera-simulator/scenes/window-still-life.png',
  '/camera-simulator/scenes/low-light-room.png',
];
const CORE = [
  '/camera-simulator/', '/camera-simulator/index.html', '/camera-simulator/manifest.webmanifest',
  '/camera-simulator/icon.svg', '/camera-simulator/grain.svg', ...APP_ASSETS, ...SCENES,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('camera-sim-') || (key.startsWith('stillframe-') && key !== CACHE)).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const pathname = new URL(event.request.url).pathname;
  const explicitSceneAsset = pathname.includes('/models/') || /-backplate\.png$/.test(pathname);
  event.respondWith(caches.match(event.request, { ignoreVary: true }).then((cached) => {
    if (cached) return cached;
    return fetch(event.request).then((response) => {
      if (response.ok && !explicitSceneAsset) {
        const clone = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(async () => {
      if (event.request.mode === 'navigate') return (await caches.match('/camera-simulator/index.html', { ignoreVary: true })) ?? new Response('Stillframe is offline. Reconnect to reload the studio.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      return new Response('', { status: 503 });
    });
  }));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'stillframe-cache-scenes') event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SCENES)));
  if (event.data?.type === 'stillframe-activate-update') void self.skipWaiting();
});
