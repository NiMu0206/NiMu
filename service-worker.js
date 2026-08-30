const CACHE_NAME = "megumi-birthday-v3";
const GAME_FILES = [
    "./",
    "./index.html",
    "./game.html",
    "./game.js",
    "./stage1-clear.html",
    "./stage2.html",
    "./stage2.js",
    "./boss.html",
    "./boss.css",
    "./style.css",
    "./boss.js",
    "./ending.html",
    "./mobile-controls.css",
    "./mobile-controls.js",
    "./pwa.js",
    "./manifest.json",
    "./app-icon.svg"
];

self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(GAME_FILES)));
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            return response;
        }))
    );
});
