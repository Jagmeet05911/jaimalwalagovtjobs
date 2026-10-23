/* Admin panel live refresh: check for new pending jobs every 5 minutes. */
(() => {
  "use strict";
  const INTERVAL = 5 * 60 * 1000;
  function refreshPending() {
    try {
      if (typeof window.loadPendingJobs === "function") window.loadPendingJobs();
      else window.location.reload();
    } catch (_) {
      window.location.reload();
    }
  }
  if (document.visibilityState === "visible") {
    setInterval(() => {
      if (document.visibilityState === "visible") refreshPending();
    }, INTERVAL);
  }
})();
