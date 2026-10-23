(() => {
  "use strict";
  function addBottomNav() {
    if (document.getElementById("bottomNav")) return;
    const topNav = document.querySelector("nav.tabs");
    if (!topNav) return;

    const nav = topNav.cloneNode(true);
    nav.id = "bottomNav";
    nav.classList.add("bottom-nav");
    nav.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    nav.querySelectorAll(".tabs-label").forEach(el => el.remove());
    nav.querySelectorAll(".tab").forEach(button => {
      button.classList.remove("active");
      if (button.dataset.view === "homeView") button.textContent = "🏠 Home";
      if (button.dataset.view === "jobsView") button.textContent = "Jobs";
      if (button.dataset.view === "privateJobsView") button.textContent = "💼 Private Jobs";
      if (button.dataset.view === "savedView") button.textContent = "♡ Saved Jobs";
      if (button.dataset.view === "admitView") button.textContent = "Admit Cards";
      if (button.dataset.view === "adminView") button.textContent = "Admin Panel ⚙";
      button.addEventListener("click", () => {
        if (button.dataset.view === "homeView") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });

    const safety = document.querySelector(".safety-band");
    if (safety) safety.parentNode.insertBefore(nav, safety);
    else document.body.appendChild(nav);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addBottomNav, { once: true });
  } else {
    addBottomNav();
  }
})();
