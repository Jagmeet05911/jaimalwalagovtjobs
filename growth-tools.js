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
