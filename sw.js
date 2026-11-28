"use strict";
const CACHE_NAME = "job-mitra-portal-v27";
const APP_SHELL = [
  "./",
  "./index.html",
  "./dashboard.js?v=20261122-hero-hidden-v1",
  "./manifest.json",
  "./icons/app-icon.svg",
  "./assets/jobmitra-jaimalwala-banner.svg",
  "./style.css?v=20261122-hero-hidden-v1",
  "./app.js?v=20261122-watermark",
  "./filters.js?v=20261122-hero-hidden-v1",
  "./bottom-nav.js?v=20261122-nav-fix",
  "./growth-tools.js?v=20261122-cache-fix",
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

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url;
  const destination = target && /^https:\/\//i.test(target)
    ? target
    : "https://jagmeet05911.github.io/jaimalwalagovtjobs/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
    for (const client of windowClients) {
      if ("focus" in client) return client.focus();
    }
    return clients.openWindow(destination);
  }));
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
