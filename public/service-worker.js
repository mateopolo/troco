/**
 * Troco Service Worker
 * Gestion du cache offline, des requêtes statiques, page offline brandée et installation PWA mobile.
 */

const CACHE_NAME = 'troco-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
];

// Installation du Service Worker et mise en cache des ressources prioritaires
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache non-blocking error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activation et purge des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de mise en cache intelligente : Network First pour navigation, Cache First pour les assets statiques
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non GET ou vers Firebase Firestore / Cloud Functions
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignorer les appels API Firestore / WebRTC / WebSockets
  if (
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('firebasestorage.googleapis.com') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // 1. Assets statiques (JS, CSS, Images, Polices) -> Stale While Revalidate
  if (
    event.request.destination === 'style' ||
    event.request.destination === 'script' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. Navigation HTML -> Network First avec fallback sur offline.html ou index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(async () => {
        const cachedOffline = await caches.match('/offline.html');
        if (cachedOffline) return cachedOffline;
        return caches.match('/index.html') || caches.match('/');
      })
    );
  }
});
