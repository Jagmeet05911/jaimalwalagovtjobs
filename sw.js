"use strict";
const CACHE_NAME = "indojobalert-portal-v38";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/app-icon.svg",
  "./icons/jobmitra-logo.svg?v=4",
  "./assets/jobmitra-jaimalwala-banner.svg?v=20261128-tagline-rotator",
  "./style.css?v=20261128-simple-layout",
  "./dashboard.js?v=20261122-categories-v3",
  "./bottom-nav.js?v=20261122-nav-fix",
  "./app.js?v=20261123-in-site-apply",
  "./filters.js?v=20261122-categories-v3",
  "./festival-greetings.js?v=20261107",
  "./growth-tools.js?v=20261128-indojobalert-final"
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
