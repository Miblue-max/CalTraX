// Service Worker for Calorie & Hydration Tracker (Offline PWA)
const CACHE_NAME = 'calorie-tracker-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './calorie_tracker.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './screenshot-mobile.png',
  './screenshot-desktop.png',
  'https://cdn.tailwindcss.com/3.4.17',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap'
];

// 1. Install event: Cache core static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core application shell and icons');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Non-critical asset cache failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate event: Clean up previous version caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch event: Stale-While-Revalidate / Cache-First strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Chrome-extension or non-http requests should be ignored
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch from network in parallel to update cache (Stale-While-Revalidate)
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for page navigation, fallback to cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./calorie_tracker.html');
          }
        });

      // Return cached version immediately if available, else await network
      return cachedResponse || fetchPromise;
    })
  );
});
