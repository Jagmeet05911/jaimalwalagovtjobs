(() => {
  "use strict";

  const installButton = document.getElementById("installPortalBtn");
  const shareButton = document.getElementById("sharePortalBtn");
  const hint = document.getElementById("growthHint");
  let installPrompt = null;
  const portalUrl = "https://jagmeet05911.github.io/jaimalwalagovtjobs/";
  const shareText = "ਮੈਂ ਇਹ ਮੁਫ਼ਤ Job Mitra ਸਾਈਟ ਵੇਖੀ ਹੈ। ਪੰਜਾਬ ਅਤੇ ਪੂਰੇ ਭਾਰਤ ਦੀਆਂ ਸਰਕਾਰੀ ਤੇ ਪ੍ਰਾਈਵੇਟ ਨੌਕਰੀਆਂ, ਯੋਗਤਾ, ਉਮਰ ਹੱਦ, ਨੋਟੀਫਿਕੇਸ਼ਨ ਅਤੇ Apply ਲਿੰਕ ਇੱਥੇ ਵੇਖੋ। ਆਪਣੇ 4 ਦੋਸਤਾਂ ਨਾਲ ਵੀ ਸਾਂਝੀ ਕਰੋ:";

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
        .then(registration => registration.update())
        .catch(error => {
          console.warn("Offline/install support could not be enabled:", error);
        });
    });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
    if (hint) hint.textContent = "ਇੱਕ ਵਾਰ Install ਕਰੋ; ਫਿਰ ਮੋਬਾਈਲ ਦੀ Home Screen ਤੋਂ ਸਾਈਟ ਸਿੱਧੀ ਖੁੱਲ੍ਹੇਗੀ।";
  });

  // Browser notifications: checks for newly published jobs while the portal is open.
  const notifyButton = document.getElementById("enableJobNotificationsBtn");
  const notifyStatus = document.getElementById("jobNotificationStatus");
  const JOBS_API = "https://kbebdetnhfkxnkpdiefd.supabase.co/rest/v1/jobs";
  const JOBS_KEY = "sb_publishable_51mCCN-NaaylwYSnLyFk2Q_Uovo2lY_";
  const LAST_JOB_KEY = "jg_last_job_notification_created_at_v1";
  let notificationTimer = null;
  let notificationBusy = false;

  function setNotificationStatus(message) {
    if (notifyStatus) notifyStatus.textContent = message;
  }

  async function fetchLatestPublishedJobs() {
    const url = JOBS_API + "?select=id,title,department,created_at,notice_url&status=eq.published&order=created_at.desc&limit=10";
    const response = await fetch(url, { headers: { apikey: JOBS_KEY } });
    if (!response.ok) throw new Error("Job updates could not be checked right now.");
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function showNewJobNotifications(initializing) {
    if (notificationBusy || Notification.permission !== "granted") return;
    notificationBusy = true;
    try {
      const rows = await fetchLatestPublishedJobs();
      if (!rows.length) return;
      const latest = rows[0].created_at;
      let lastSeen = "";
      try { lastSeen = localStorage.getItem(LAST_JOB_KEY) || ""; } catch (_) {}
      if (!lastSeen || initializing) {
        try { localStorage.setItem(LAST_JOB_KEY, latest); } catch (_) {}
        setNotificationStatus("✓ Notifications enabled. New published jobs will alert you while the app is open.");
        return;
      }
      const fresh = rows.filter(job => job.created_at && job.created_at > lastSeen).reverse();
      if (fresh.length) {
        const registration = await navigator.serviceWorker.ready;
        for (const job of fresh.slice(-3)) {
          await registration.showNotification("New Job: " + (job.title || "Job Update"), {
            body: [job.department, "Open Job Mitra to read the official notice."].filter(Boolean).join(" • "),
            icon: "./icons/app-icon.svg",
            badge: "./icons/app-icon.svg",
            tag: "job-" + job.id,
            data: { url: job.notice_url || portalUrl }
          });
        }
        try { localStorage.setItem(LAST_JOB_KEY, latest); } catch (_) {}
        setNotificationStatus("🔔 " + fresh.length + " new job update(s) found.");
      }
    } catch (error) {
      setNotificationStatus(error.message || "Notifications could not be refreshed.");
    } finally {
      notificationBusy = false;
    }
  }

  function startJobNotificationChecks() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || Notification.permission !== "granted") return;
    if (notificationTimer) window.clearInterval(notificationTimer);
    showNewJobNotifications(false);
    notificationTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") showNewJobNotifications(false);
    }, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") showNewJobNotifications(false);
    });
    setNotificationStatus("✓ Notifications are on. New jobs are checked every 15 minutes while the app is open.");
  }

  if (notifyButton) {
    if ("Notification" in window && Notification.permission === "granted") {
      notifyButton.textContent = "🔔 Notifications On";
      startJobNotificationChecks();
    }
    notifyButton.addEventListener("click", async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setNotificationStatus("This browser does not support app notifications. Try installing Job Mitra in Chrome.");
        return;
      }
      try {
        const permission = Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
        if (permission !== "granted") {
          setNotificationStatus("Notifications were not allowed. You can enable them in browser/site settings.");
          return;
        }
        notifyButton.textContent = "🔔 Notifications On";
        await navigator.serviceWorker.ready;
        await showNewJobNotifications(true);
        startJobNotificationChecks();
      } catch (_) {
        setNotificationStatus("Could not enable notifications on this device.");
      }
    });
  }

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
    if (hint) hint.textContent = "ਧੰਨਵਾਦ! ਹੁਣ Home Screen ਵਾਲੇ Job Mitra ਆਈਕਨ ਤੋਂ ਸਾਈਟ ਖੋਲ੍ਹੋ।";
  });

  if (installButton) {
    installButton.addEventListener("click", async () => {
      if (!installPrompt) {
        if (hint) hint.textContent = /iphone|ipad|ipod/i.test(navigator.userAgent)
          ? "Safari ਵਿੱਚ Share ਬਟਨ ਦਬਾਓ, ਫਿਰ Add to Home Screen ਚੁਣੋ।"
          : "Browser ਦੇ ⋮ ਮੀਨੂ ਵਿੱਚ Add to Home Screen ਜਾਂ Install app ਚੁਣੋ।";
        return;
      }
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
    });
  }

  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      const data = { title: "Job Mitra", text: shareText, url: portalUrl };
      try {
        if (navigator.share) {
          await navigator.share(data);
        } else {
          window.open("https://wa.me/?text=" + encodeURIComponent(shareText + " " + portalUrl), "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        if (error && error.name !== "AbortError") {
          window.open("https://wa.me/?text=" + encodeURIComponent(shareText + " " + portalUrl), "_blank", "noopener,noreferrer");
        }
      }
    });
  }

  try {
    const seenBefore = localStorage.getItem("jg_portal_seen_v1") === "yes";
    localStorage.setItem("jg_portal_seen_v1", "yes");
    if (seenBefore && !sessionStorage.getItem("jg_return_welcome_v1")) {
      sessionStorage.setItem("jg_return_welcome_v1", "yes");
      window.addEventListener("load", () => {
        const welcome = document.createElement("div");
        welcome.className = "return-visitor-note";
        welcome.textContent = "ਮੁੜ ਆਉਣ ਲਈ ਧੰਨਵਾਦ! ਨਵੀਆਂ ਨੌਕਰੀਆਂ ਵੇਖੋ ਅਤੇ ਦੋਸਤਾਂ ਨਾਲ ਸਾਂਝੀਆਂ ਕਰੋ।";
        welcome.setAttribute("role", "status");
        document.body.appendChild(welcome);
        window.setTimeout(() => welcome.classList.add("show"), 100);
        window.setTimeout(() => welcome.remove(), 6500);
      }, { once: true });
    }
  } catch (_) {
    // Private browsing may block storage; the portal remains fully usable.
  }
})();
