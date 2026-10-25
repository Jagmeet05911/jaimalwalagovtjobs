/* Admin panel live refresh: import new pending jobs every 10 minutes. */
(() => {
  "use strict";
  const INTERVAL = 10 * 60 * 1000;

  function refreshPending() {
    const adminView = document.getElementById("adminView");
    if (!adminView || adminView.classList.contains("hidden")) return;
    const button = document.getElementById("refreshCandidatesBtn");
    if (!button || button.disabled) return;
    button.click();
  }

  if (document.visibilityState === "visible") {
    setInterval(() => {
      if (document.visibilityState === "visible") refreshPending();
    }, INTERVAL);
  }
})();
