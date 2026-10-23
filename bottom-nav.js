(() => {
  "use strict";

  function loadFunctionalFixes() {
    if (document.getElementById("functionalFixesScript")) return;
    const script = document.createElement("script");
    script.id = "functionalFixesScript";
    script.src = "functional-fixes.js?v=20261023-1";
    script.defer = true;
    document.body.appendChild(script);
  }

  function addBottomNav() {
    const topNav = document.querySelector("nav.tabs");
    if (!topNav) return;
    const homeTop = document.getElementById("homeTab");
    if (homeTop) {
      homeTop.style.setProperty("order", "-1", "important");
      homeTop.style.setProperty("flex", "0 0 auto", "important");
      homeTop.style.setProperty("width", "auto", "important");
      homeTop.style.setProperty("margin-top", "0", "important");
      topNav.insertBefore(homeTop, topNav.firstChild);
    }
    const oldBottom = document.getElementById("bottomNav");
    if (oldBottom) oldBottom.remove();
    const nav = document.createElement("nav");
    nav.id = "bottomNav";
    nav.setAttribute("aria-label", "Bottom navigation");
    nav.className = "tabs bottom-tabs";
    const label = document.createElement("div");
    label.className = "tabs-label";
    label.innerHTML = '<span class="nav-dot"></span> JOB PORTAL';
    nav.appendChild(label);
    const originalTabs = [...topNav.querySelectorAll("button.tab")];
    originalTabs.forEach(original => {
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "tab";
      copy.innerHTML = original.innerHTML;
      copy.setAttribute("aria-label", original.textContent.trim());
      copy.addEventListener("click", () => {
        original.click();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      nav.appendChild(copy);
    });
    const safety = document.querySelector(".safety-band");
    if (safety) safety.parentNode.insertBefore(nav, safety);
    else document.body.appendChild(nav);
  }

  function start() {
    addBottomNav();
    loadFunctionalFixes();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
