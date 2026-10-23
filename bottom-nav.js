(() => {
  "use strict";

  function addBottomNav() {
    const topNav = document.querySelector("nav.tabs");
    if (!topNav) return;

    // Home must be the FIRST item in the top navigation.
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

    // Make a complete second navigation line at the bottom of the page.
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
        if (original.id === "homeTab") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          original.click();
        } else {
          original.click();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
      nav.appendChild(copy);
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
