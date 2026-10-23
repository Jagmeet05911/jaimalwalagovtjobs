/* Load this file from the admin panel to refresh pending candidates every 5 minutes. */
(() => {
  "use strict";
  const FIVE_MINUTES = 300000;
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    try {
      if (typeof window.loadPendingJobs === "function") window.loadPendingJobs();
      else window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  }, FIVE_MINUTES);
})();
