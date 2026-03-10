// Service Worker for Piggy Bank PWA
const CACHE_NAME = 'piggybank-v27';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/style.css',
  '/css/animals.css',
  '/js/data.js',
  '/js/firebase-config.js',
  '/js/storage.js',
  '/js/sound.js',
  '/js/wallet.js',
  '/js/stable.js',
  '/js/market.js',
  '/js/tasks.js',
  '/js/quiz.js',
  '/js/breeding.js',
  '/js/parent.js',
  '/js/chat.js',
  '/js/friends.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
