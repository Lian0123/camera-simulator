// Service Worker for Pro Camera Simulator PWA
// Version: 2.0.0 — Improved offline support with cache-first for static, network-first for dynamic

const CACHE_VERSION = 'camera-sim-v2';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';
const IMAGE_CACHE = CACHE_VERSION + '-images';

// Core assets that must be cached for offline use (keep small!)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Max items in dynamic/image caches to prevent unbounded growth
const MAX_DYNAMIC_ITEMS = 30;
const MAX_IMAGE_ITEMS = 10;

// ===== Install =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching core assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Pre-cache complete');
      })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// ===== Activate =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== IMAGE_CACHE)
          .map((k) => {
            console.log('[SW] Removing old cache:', k);
            return caches.delete(k);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ===== Helper: Trim cache to max size =====
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Remove oldest entries (FIFO)
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// ===== Helper: Is request for an image? =====
function isImageRequest(request) {
  const url = request.url;
  return /\.(jpe?g|png|gif|webp|svg|ico)(\?.*)?$/i.test(url) ||
    request.destination === 'image';
}

// ===== Helper: Is request for a static asset (CDN libs)? =====
function isStaticCDN(url) {
  return url.includes('unpkg.com') || url.includes('cdnjs.cloudflare.com') || url.includes('cdn.jsdelivr.net');
}

// ===== Fetch Strategy =====
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, devtools, etc.
  if (!request.url.startsWith('http')) return;

  // Strategy 1: Cache-first for static CDN resources (React, Babel)
  if (isStaticCDN(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Strategy 2: Cache-first for images (default.jpeg can be large)
  if (isImageRequest(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, clone);
              trimCache(IMAGE_CACHE, MAX_IMAGE_ITEMS);
            });
          }
          return response;
        }).catch(() => {
          // Return a transparent 1x1 PNG as fallback for images
          return new Response(
            atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==')
              .split('').map(c => c.charCodeAt(0)),
            { headers: { 'Content-Type': 'image/png' } }
          );
        });
      })
    );
    return;
  }

  // Strategy 3: Network-first for HTML and other assets (ensures fresh content)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          // Cache in appropriate bucket
          const cacheName = request.url.includes('index.html') || request.url.endsWith('/') || request.url.includes('.webmanifest')
            ? STATIC_CACHE
            : DYNAMIC_CACHE;
          caches.open(cacheName).then((cache) => {
            cache.put(request, clone);
            if (cacheName === DYNAMIC_CACHE) {
              trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
            }
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: try cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;

          // If it's a navigation request, serve the cached index.html (SPA fallback)
          if (request.mode === 'navigate') {
            return caches.match('./index.html').then((indexCached) => {
              if (indexCached) return indexCached;
              return offlineFallbackResponse();
            });
          }

          // Generic offline response
          return offlineFallbackResponse();
        });
      })
  );
});

// ===== Offline fallback HTML =====
function offlineFallbackResponse() {
  const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Pro Camera Simulator — 離線</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
      font-family:system-ui,-apple-system,sans-serif; background:#080a12; color:#f0f2ff; text-align:center; padding:20px; }
    .box { max-width:400px; }
    h1 { font-size:20px; margin-bottom:8px; }
    p { color:#8b92b0; font-size:14px; line-height:1.6; }
    button { margin-top:16px; padding:10px 24px; border:none; border-radius:8px;
      background:linear-gradient(135deg,#4f8cff,#7c5dff); color:#fff; font-size:14px;
      cursor:pointer; font-weight:600; }
    button:hover { opacity:0.9; }
    .icon { font-size:48px; margin-bottom:12px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">📷</div>
    <h1>目前處於離線狀態</h1>
    <p>您目前沒有網路連線。請檢查您的網路設定，然後重新整理頁面。</p>
    <p>You are currently offline. Please check your connection and try again.</p>
    <button onclick="location.reload()">重新整理 / Reload</button>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ===== Listen for message to skip waiting =====
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
