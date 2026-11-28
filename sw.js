"use strict";
const CACHE_NAME = "jaimalwala-portal-v20";
const APP_SHELL = [
  "./",
  "./index.html",
  "./dashboard.js?v=20261122-hero-hidden-v1",
  "./manifest.json",
  "./icons/app-icon.svg",
  "./style.css?v=20261122-hero-hidden-v1",
  "./app.js?v=20261122-watermark",
  "./filters.js?v=20261122-hero-hidden-v1",
  "./bottom-nav.js?v=20261122-nav-fix",
  "./growth-tools.js?v=20261122-cache-fix",
  "./alerts.js?v=20261025",
  "./festival-greetings.js?v=20261107"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Network-first: visitors receive the newest site files whenever online.
  // The cache is only a fallback for offline use.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
