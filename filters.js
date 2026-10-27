(() => {
  "use strict";
  function textOf(node) { return (node?.textContent || "").trim().toLowerCase(); }
  function cleanSectionName(value) {
    return String(value || "")
      .replace(/\s*\d+\s*(?:jobs?|नौकरियां|नौकरी|ਨੌਕਰੀਆਂ|ਨੌਕਰੀ)\s*$/iu, "")
      .replace(/\s*\d+\s*$/u, "")
      .trim()
      .toLowerCase();
  }
  function addStyles() {
    if (document.getElementById("jobFilterStyles")) return;
    const style = document.createElement("style"); style.id = "jobFilterStyles";
    style.textContent = `.job-filter-panel{margin:12px 0 18px;padding:14px;background:#fff;border:1px solid var(--line,#dfe7f1);border-radius:14px;box-shadow:0 6px 18px #203c6408}.job-filter-row{display:grid;grid-template-columns:minmax(190px,1.4fr) repeat(3,minmax(140px,1fr)) auto;gap:9px;align-items:end}.job-filter-row label{display:grid;gap:5px;font-size:11px;font-weight:800;color:var(--muted,#64748b)}.job-filter-row input,.job-filter-row select{width:100%;min-width:0;padding:10px 11px;border:1px solid var(--line,#dfe7f1);border-radius:9px;background:#fff;color:var(--ink,#17243a);font-size:12px}.job-filter-row button{padding:10px 12px;border:1px solid var(--line,#dfe7f1);border-radius:9px;background:#eaf1ff;color:var(--navy,#123b72);font-weight:800;font-size:12px}@media(max-width:760px){.job-filter-row{grid-template-columns:1fr 1fr}.job-filter-row label:first-child{grid-column:1/-1}.job-filter-row button{width:100%}}@media(max-width:420px){.job-filter-row{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }
  function setupJobFilters() {
    const directory = document.getElementById("jobsDirectory");
    if (!directory || document.getElementById("jobFilterPanel")) return;
    addStyles();
    const panel = document.createElement("div"); panel.id = "jobFilterPanel"; panel.className = "job-filter-panel";
    panel.innerHTML = `<div class="job-filter-row"><label>🔎 <span>Search</span><input id="jobFilterSearch" type="search" placeholder="Post, department or eligibility"></label><label>📍 <span>State</span><select id="jobFilterState"><option value="">All States</option></select></label><label>🏢 <span>Department</span><select id="jobFilterDepartment"><option value="">All Departments</option></select></label><label>📅 <span>Deadline</span><select id="jobFilterDeadline"><option value="">Any date</option><option value="soon">Closing soon</option><option value="open">Open / no deadline</option></select><button id="jobFilterSearchBtn" type="button">🔎 Search</button></div>`;
    const toolbar = directory.previousElementSibling;
    if (toolbar && toolbar.classList.contains("jobs-toolbar")) toolbar.after(panel); else directory.before(panel);
    const search = document.getElementById("jobFilterSearch"), state = document.getElementById("jobFilterState"), department = document.getElementById("jobFilterDepartment"), deadline = document.getElementById("jobFilterDeadline"), searchBtn = document.getElementById("jobFilterSearchBtn");
    function groupOf(section) { return section.closest(".directory-group"); }
    function groups() { return [...directory.querySelectorAll(":scope > .directory-group")]; }
    function collectOptions() {
      const states = new Set(), departments = new Set(); const gs = groups(), stateGroup = gs[0], departmentGroup = gs[1];
      directory.querySelectorAll(".directory-section").forEach(section => {
        const heading = section.querySelector(".directory-heading"); if (!heading) return;
        const label = cleanSectionName(heading.firstChild?.textContent || heading.textContent || "");
        if (groupOf(section) === stateGroup) states.add(label);
        if (groupOf(section) === departmentGroup) departments.add(label);
      });
      const keep = state.value, keepD = department.value;
      state.innerHTML = '<option value="">All States</option>' + [...states].sort().map(x => `<option value="${x.replace(/"/g,"&quot;")}">${x}</option>`).join("");
      department.innerHTML = '<option value="">All Departments</option>' + [...departments].sort().map(x => `<option value="${x.replace(/"/g,"&quot;")}">${x}</option>`).join("");
      state.value = [...states].includes(keep) ? keep : ""; department.value = [...departments].includes(keepD) ? keepD : "";
    }
    function matchesDeadline(card) {
      if (!deadline.value) return true;
      const raw = [...card.querySelectorAll(".job-meta span")].map(x => x.textContent).join(" "); const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) return deadline.value === "open"; if (deadline.value === "open") return false;
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); const days = Math.ceil((d - new Date()) / 86400000); return days >= 0 && days <= 14;
    }
    function apply() {
      const q = textOf(search), selectedState = state.value.toLowerCase(), selectedDepartment = department.value.toLowerCase();
      const gs = groups(), stateGroup = gs[0], departmentGroup = gs[1];
      directory.querySelectorAll(".directory-section").forEach(section => {
        const heading = section.querySelector(".directory-heading"); const sectionName = cleanSectionName(heading?.firstChild?.textContent || heading?.textContent || "");
        const isStateGroup = groupOf(section) === stateGroup; const isDepartmentGroup = groupOf(section) === departmentGroup;
        let visible = false;
        section.querySelectorAll(".job-card").forEach(card => {
          const matchesSearch = !q || textOf(card).includes(q); const matchesGroup = isStateGroup ? (!selectedState || sectionName === selectedState) : (isDepartmentGroup ? (!selectedDepartment || sectionName === selectedDepartment) : true);
          const show = matchesSearch && matchesGroup && matchesDeadline(card); card.style.display = show ? "" : "none"; if (show) visible = true;
        }); section.style.display = visible ? "" : "none";
      });
    }
    function refresh() { collectOptions(); apply(); }
    [search, state, department, deadline].forEach(el => el.addEventListener("input", apply)); [state, department, deadline].forEach(el => el.addEventListener("change", apply));
    searchBtn.addEventListener("click", apply); search.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); apply(); } });
    const observer = new MutationObserver(() => { collectOptions(); apply(); }); observer.observe(directory, { childList: true, subtree: true }); refresh();
  }
  function start() { setTimeout(setupJobFilters, 350); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
