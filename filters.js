(() => {
  "use strict";

  function textOf(node) { return (node?.textContent || "").trim().toLowerCase(); }

  function setupJobFilters() {
    const directory = document.getElementById("jobsDirectory");
    if (!directory || document.getElementById("jobFilterPanel")) return;

    const panel = document.createElement("div");
    panel.id = "jobFilterPanel";
    panel.className = "job-filter-panel";
    panel.innerHTML = `
      <div class="job-filter-row">
        <label>🔎 <span>Search</span><input id="jobFilterSearch" type="search" placeholder="Post, department or eligibility"></label>
        <label>📍 <span>State</span><select id="jobFilterState"><option value="">All States</option></select></label>
        <label>🏢 <span>Department</span><select id="jobFilterDepartment"><option value="">All Departments</option></select></label>
        <label>📅 <span>Deadline</span><select id="jobFilterDeadline"><option value="">Any date</option><option value="soon">Closing soon</option><option value="open">Open / no deadline</option></option></select></label>
        <button id="jobFilterReset" type="button">Reset</button>
      </div>`;

    const toolbar = directory.previousElementSibling;
    if (toolbar && toolbar.classList.contains("jobs-toolbar")) toolbar.after(panel);
    else directory.before(panel);

    const search = document.getElementById("jobFilterSearch");
    const state = document.getElementById("jobFilterState");
    const department = document.getElementById("jobFilterDepartment");
    const deadline = document.getElementById("jobFilterDeadline");
    const reset = document.getElementById("jobFilterReset");

    function collectOptions() {
      const states = new Set();
      const departments = new Set();
      directory.querySelectorAll(".directory-section").forEach(section => {
        const heading = section.querySelector(".directory-heading");
        if (!heading) return;
        const label = (heading.firstChild?.textContent || heading.textContent || "").replace(/\d+\s*jobs?/i, "").trim();
        const group = section.parentElement?.querySelector(".directory-group-title")?.textContent || "";
        if (/state-wise/i.test(group)) states.add(label);
        if (/department-wise/i.test(group)) departments.add(label);
      });
      const keep = state.value;
      state.innerHTML = '<option value="">All States</option>' + [...states].sort().map(x => `<option value="${CSS.escape(x)}">${x}</option>`).join("");
      state.value = [...states].includes(keep) ? keep : "";
      const keepD = department.value;
      department.innerHTML = '<option value="">All Departments</option>' + [...departments].sort().map(x => `<option value="${CSS.escape(x)}">${x}</option>`).join("");
      department.value = [...departments].includes(keepD) ? keepD : "";
    }

    function matchesDeadline(card) {
      if (!deadline.value) return true;
      const raw = [...card.querySelectorAll(".job-meta span")].map(x => x.textContent).join(" ");
      const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) return deadline.value === "open";
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      if (deadline.value === "open") return false;
      const days = Math.ceil((d - new Date()) / 86400000);
      return days >= 0 && days <= 14;
    }

    function apply() {
      const q = textOf(search).replace(/^\s+|\s+$/g, "");
      const selectedState = state.value.toLowerCase();
      const selectedDepartment = department.value.toLowerCase();
      directory.querySelectorAll(".directory-section").forEach(section => {
        const heading = section.querySelector(".directory-heading");
        const sectionName = (heading?.firstChild?.textContent || heading?.textContent || "").replace(/\d+\s*jobs?/i, "").trim().toLowerCase();
        const group = section.parentElement?.querySelector(".directory-group-title")?.textContent || "";
        const isStateGroup = /state-wise/i.test(group);
        const isDepartmentGroup = /department-wise/i.test(group);
        let sectionVisible = false;
        section.querySelectorAll(".job-card").forEach(card => {
          const matchesSearch = !q || textOf(card).includes(q);
          const matchesGroup = isStateGroup
            ? (!selectedState || sectionName === selectedState)
            : (!selectedDepartment || sectionName === selectedDepartment);
          const show = matchesSearch && matchesGroup && matchesDeadline(card);
          card.style.display = show ? "" : "none";
          if (show) sectionVisible = true;
        });
        section.style.display = sectionVisible ? "" : "none";
      });
    }

    function refresh() { collectOptions(); apply(); }
    [search, state, department, deadline].forEach(el => el.addEventListener("input", apply));
    [state, department, deadline].forEach(el => el.addEventListener("change", apply));
    reset.addEventListener("click", () => { search.value = ""; state.value = ""; department.value = ""; deadline.value = ""; apply(); });

    const observer = new MutationObserver(() => { collectOptions(); apply(); });
    observer.observe(directory, { childList: true, subtree: true });
    refresh();
  }

  function start() { setTimeout(setupJobFilters, 250); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
