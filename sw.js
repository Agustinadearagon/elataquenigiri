const CACHE_NAME = "nigiri-v2";
const FILES = ["./", "./index.html", "./script.js", "./style.css", "./cara.jpg", "./sw.js"];

self.addEventListener("install", e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    if (e.request.method !== "GET") return;
    e.respondWith(
        fetch(e.request).then(r => {
            if (r && r.status === 200 && r.type === "basic") {
                const clone = r.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            }
            return r;
        }).catch(() => caches.match(e.request))
    );
});
