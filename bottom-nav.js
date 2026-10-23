(() => {
  "use strict";

  function addBottomNav() {
    const topNav = document.querySelector("nav.tabs");
    if (!topNav) return;

    // Top navigation: Home must be the FIRST item on the same row.
    const homeTop = document.getElementById("homeTab");
    if (homeTop) {
      homeTop.style.setProperty("order", "0", "important");
      homeTop.style.setProperty("flex", "0 0 auto", "important");
      homeTop.style.setProperty("width", "auto", "important");
      homeTop.style.setProperty("margin-top", "0", "important");
      topNav.insertBefore(homeTop, topNav.children[1] || null);
    }

    // Remove an older cloned bottom navigation if this script was previously loaded.
    const oldBottom = document.getElementById("bottomNav");
    if (oldBottom) oldBottom.remove();

    // Bottom navigation: Home only, aligned to the right.
    const nav = document.createElement("nav");
    nav.id = "bottomNav";
    nav.setAttribute("aria-label", "Bottom navigation");
    nav.style.cssText = [
      "max-width:1120px",
      "margin:0 auto",
      "padding:12px 0 18px",
      "display:flex",
      "justify-content:flex-end",
      "border-top:1px solid var(--line)"
    ].join(";");

    const home = document.createElement("button");
    home.type = "button";
    home.className = "tab";
    home.textContent = "🏠 Home";
    home.style.cssText = [
      "background:var(--blue-light)",
      "color:var(--navy)",
      "border:0",
      "padding:11px 16px",
      "border-radius:10px",
      "font-weight:700"
    ].join(";");
    home.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    nav.appendChild(home);

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
