(() => {
  "use strict";

  function sortStateSections() {
    const directory = document.querySelector("#jobsDirectory");
    if (!directory) return;

    const stateGroup = [...directory.querySelectorAll(".directory-group")]
      .find(group => /State-wise Government Jobs/i.test(
        group.querySelector(".directory-group-title")?.textContent || ""
      ));
    if (!stateGroup) return;

    const sections = [...stateGroup.querySelectorAll(":scope > .directory-section")];
    sections.sort((a, b) => {
      const aName = (a.querySelector(".directory-heading")?.textContent || "")
        .replace(/\d+\s*jobs?/i, "").trim();
      const bName = (b.querySelector(".directory-heading")?.textContent || "")
        .replace(/\d+\s*jobs?/i, "").trim();
      return aName.localeCompare(bName, "en", { sensitivity: "base" });
    });
    sections.forEach(section => stateGroup.appendChild(section));
  }

  function detectBrowserLanguage() {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || "en"];
    for (const raw of languages) {
      const lang = String(raw || "").toLowerCase();
      if (lang.startsWith("pa")) return "pa";
      if (lang.startsWith("hi")) return "hi";
    }
    return "en";
  }

  function setupLanguage() {
    const btn = document.getElementById("langBtn");
    if (!btn) return;

    const manualChoice = localStorage.getItem("jg_language_manual_v1") === "1";
    const wanted = manualChoice
      ? (localStorage.getItem("jg_language_v1") || detectBrowserLanguage())
      : detectBrowserLanguage();

    if (!manualChoice) localStorage.setItem("jg_language_v1", wanted);
    if (wanted === "en") {
      document.documentElement.lang = "en";
      return;
    }

    let autoChanging = true;
    btn.addEventListener("click", () => {
      if (!autoChanging) localStorage.setItem("jg_language_manual_v1", "1");
    });

    let tries = 0;
    const timer = setInterval(() => {
      const current = (document.documentElement.lang || "en").toLowerCase();
      if (current === wanted || tries >= 4) {
        clearInterval(timer);
        autoChanging = false;
        localStorage.setItem("jg_language_v1", current === wanted ? wanted : current);
        return;
      }
      tries += 1;
      btn.click();
    }, 180);
  }

  function boot() {
    sortStateSections();
    setupLanguage();
    const observer = new MutationObserver(() => sortStateSections());
    const target = document.getElementById("jobsDirectory");
    if (target) observer.observe(target, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
