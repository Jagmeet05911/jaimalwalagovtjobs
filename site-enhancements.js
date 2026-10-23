(() => {
  "use strict";

  const STATE_ORDER = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Chandigarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
    "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "All India"
  ];

  const STATE_RANK = new Map(STATE_ORDER.map((name, index) => [name, index]));

  function sortStateSections() {
    const directory = document.querySelector("#jobsDirectory");
    if (!directory) return;
    const stateGroup = [...directory.querySelectorAll(".directory-group")]
      .find(group => /State-wise Government Jobs/i.test(group.querySelector(".directory-group-title")?.textContent || ""));
    if (!stateGroup) return;
    const sections = [...stateGroup.querySelectorAll(":scope > .directory-section")];
    sections.sort((a, b) => {
      const aName = (a.querySelector(".directory-heading")?.textContent || "").replace(/\d+\s*jobs?/i, "").trim();
      const bName = (b.querySelector(".directory-heading")?.textContent || "").replace(/\d+\s*jobs?/i, "").trim();
      const ar = STATE_RANK.has(aName) ? STATE_RANK.get(aName) : 999;
      const br = STATE_RANK.has(bName) ? STATE_RANK.get(bName) : 999;
      return ar - br || aName.localeCompare(bName, "en", { sensitivity: "base" });
    });
    sections.forEach(section => stateGroup.appendChild(section));
  }

  function setupLanguage() {
    const saved = localStorage.getItem("jg_language_v1");
    const browser = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    const wanted = saved || (browser.startsWith("pa") ? "pa" : browser.startsWith("hi") ? "hi" : "en");
    const btn = document.getElementById("langBtn");
    if (!btn || !wanted || wanted === "en") return;
    // The existing app owns the language state. Its button cycles the supported languages.
    // Click until the document language matches the browser preference.
    let tries = 0;
    const timer = setInterval(() => {
      const current = document.documentElement.lang || "en";
      if (current === wanted || tries >= 4) {
        clearInterval(timer);
        localStorage.setItem("jg_language_v1", wanted);
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
