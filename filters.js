(() => {
  "use strict";

  const textOf = node => (node?.textContent || "").trim().toLowerCase();
  const escapeAttr = value => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const INDIAN_STATES = ["All India","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"];

  function addStyles() {
    if (document.getElementById("simpleJobFilterStyles")) return;
    const style = document.createElement("style");
    style.id = "simpleJobFilterStyles";
    style.textContent = `
      .job-filter-panel{margin:12px 0 18px;padding:14px;background:#fff;border:1px solid var(--line,#dfe7f1);border-radius:14px;box-shadow:0 6px 18px #203c6408}
      .job-filter-title{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:0 0 10px;font-size:14px;font-weight:800;color:var(--navy,#123b72)}
      .job-filter-row{display:grid;grid-template-columns:minmax(180px,1.5fr) repeat(3,minmax(125px,1fr)) auto;gap:9px;align-items:end}
      .job-filter-row label{display:grid;gap:5px;font-size:11px;font-weight:800;color:var(--muted,#64748b)}
      .job-filter-row input,.job-filter-row select{width:100%;min-width:0;padding:10px 11px;border:1px solid var(--line,#dfe7f1);border-radius:9px;background:#fff;color:var(--ink,#17243a);font-size:12px}
      .job-filter-row button{padding:10px 12px;border:1px solid var(--line,#dfe7f1);border-radius:9px;background:#eaf1ff;color:var(--navy,#123b72);font-weight:800;font-size:12px}
      .quick-qualifications{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px;align-items:center}
      .quick-qualifications span{font-size:11px;color:var(--muted);font-weight:700;margin-right:3px}
      .quick-qualifications button{border:1px solid var(--line);border-radius:999px;padding:7px 11px;background:#f7faff;color:var(--navy);font-size:11px;font-weight:750}
      .quick-qualifications button.active{background:var(--navy);color:#fff;border-color:var(--navy)}
      .filter-result-count{font-size:11px;color:var(--muted);font-weight:700}
      .filter-no-results{padding:20px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:12px}
      .directory-group-title{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
      .share-job-btn{border:1px solid #bfd3ed!important;background:#f2f7ff!important;color:#174b84!important;border-radius:9px;padding:9px 12px;font-size:12px;font-weight:800;cursor:pointer}
      .job-actions{display:flex;flex-wrap:wrap;gap:8px}
      @media(max-width:760px){.job-filter-row{grid-template-columns:1fr 1fr}.job-filter-row label:first-child{grid-column:1/-1}.job-filter-row button{width:100%}}
      @media(max-width:420px){.job-filter-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function setupFilter(containerId, panelId, privateMode) {
    const container = document.getElementById(containerId);
    if (!container || document.getElementById(panelId)) return;
    addStyles();

    const panel = document.createElement("div");
    panel.id = panelId;
    panel.className = "job-filter-panel";
    panel.innerHTML = `
      <div class="job-filter-title"><span>${privateMode ? "Find a private job" : "Find the right government job"}</span><span class="filter-result-count" data-filter-count></span></div>
      <div class="job-filter-row">
        <label>🔎 <span>Search jobs</span><input type="search" data-filter-search placeholder="Post, company, skill or qualification"></label>
        <label>📍 <span>State</span><select data-filter-state><option value="">All States</option></select></label>
        <label>🏢 <span>Department / Field</span><select data-filter-department><option value="">All Fields</option></select></label>
        <label>🎓 <span>Qualification</span><select data-filter-qualification><option value="all">Any Qualification</option><option value="5th">5th Pass</option><option value="8th">8th Pass</option><option value="10th">10th / Matric</option><option value="12th">12th / +2</option><option value="iti">ITI</option><option value="diploma">Diploma</option><option value="graduation">Graduation</option><option value="postgraduation">Post Graduation</option></select></label>
        <button type="button" data-filter-reset>Reset</button>
      </div>
      <div class="quick-qualifications"><span>Quick select:</span><button type="button" data-quick="5th">5th</button><button type="button" data-quick="8th">8th</button><button type="button" data-quick="10th">10th</button><button type="button" data-quick="12th">12th</button><button type="button" data-quick="iti">ITI</button><button type="button" data-quick="diploma">Diploma</button><button type="button" data-quick="graduation">Graduate</button></div>`;
    container.before(panel);

    const search = panel.querySelector("[data-filter-search]");
    const state = panel.querySelector("[data-filter-state]");
    const department = panel.querySelector("[data-filter-department]");
    const qualification = panel.querySelector("[data-filter-qualification]");
    const count = panel.querySelector("[data-filter-count]");
    const quickButtons = [...panel.querySelectorAll("[data-quick]")];

    function cards() { return [...container.querySelectorAll(".job-card")]; }
    function fillOptions() {
      const stateKeep = state.value, deptKeep = department.value;
      const states = INDIAN_STATES;
      const depts = [...new Set(cards().map(card => card.dataset.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
      state.innerHTML = '<option value="">All States</option>' + states.map(v=>'<option value="' + escapeAttr(v) + '">' + v + '</option>').join("");
      department.innerHTML = '<option value="">All Fields</option>' + depts.map(v=>'<option value="' + escapeAttr(v) + '">' + v + '</option>').join("");
      state.value = states.includes(stateKeep) ? stateKeep : "";
      department.value = depts.includes(deptKeep) ? deptKeep : "";
    }

    function matchesQualification(card) {
      const value = qualification.value;
      if (!value || value === "all") return true;
      const text = textOf(card);
      if (value === "5th") return /5th|fifth class|ਪੰਜਵੀਂ/.test(text);
      if (value === "8th") return /8th|eighth class|8वीं|8ਵੀਂ|middle pass/.test(text);
      if (value === "10th") return /10th|10वीं|10ਵੀਂ|matric/.test(text);
      if (value === "12th") return /12th|12वीं|12ਵੀਂ|\+2|senior secondary|10\+2/.test(text);
      if (value === "iti") return /\biti\b|industrial training institute/.test(text);
      if (value === "diploma") return /\bdiploma\b/.test(text);
      if (value === "graduation") return /graduation|graduate|b\.a\b|b\.sc|b\.com|btech|b\.tech|bachelor/.test(text) && !/post.?graduation|postgraduate|master|m\.a\b|m\.sc|m\.com/.test(text);
      if (value === "postgraduation") return /post.?graduation|postgraduate|master|m\.a\b|m\.sc|m\.com|mtech|m\.tech|mba|phd/.test(text);
      return true;
    }

    function apply() {
      const q = textOf(search);
      const terms = q.split("|").map(term => term.trim()).filter(Boolean);
      let visible = 0;
      cards().forEach(card => {
        const cardText = textOf(card);
        const textMatch = !q || (terms.length > 1 ? terms.some(term => cardText.includes(term)) : cardText.includes(q));
        const show = textMatch &&
          (!state.value || (String(card.dataset.states || card.dataset.state || "All India").split("|").includes(state.value)) || (state.value !== "All India" && String(card.dataset.states || "").split("|").includes("All India"))) &&
          (!department.value || card.dataset.department === department.value) &&
          matchesQualification(card);
        card.hidden = !show;
        if (show) visible++;
      });
      count.textContent = visible + " of " + cards().length + " jobs";
      quickButtons.forEach(button => button.classList.toggle("active", qualification.value === button.dataset.quick));
      let empty = container.querySelector(":scope > .filter-no-results");
      if (!empty) {
        empty = document.createElement("p");
        empty.className = "filter-no-results";
        empty.textContent = "ਇਸ ਚੋਣ ਲਈ ਨੌਕਰੀ ਨਹੀਂ ਮਿਲੀ। ਹੋਰ ਯੋਗਤਾ ਜਾਂ State ਚੁਣ ਕੇ ਵੇਖੋ।";
        container.appendChild(empty);
      }
      empty.hidden = visible > 0;
    }

    [search,state,department,qualification].forEach(el => {
      el.addEventListener("input", apply);
      el.addEventListener("change", apply);
    });
    quickButtons.forEach(button => button.addEventListener("click", () => {
      qualification.value = button.dataset.quick;
      apply();
    }));
    panel.querySelector("[data-filter-reset]").addEventListener("click", () => {
      search.value = "";
      state.value = "";
      department.value = "";
      qualification.value = "all";
      apply();
    });

    const observer = new MutationObserver(() => { fillOptions(); apply(); });
    observer.observe(container, { childList: true, subtree: true });
    fillOptions();
    apply();
  }

  function start() {
    setupFilter("jobsDirectory", "jobFilterPanel", false);
    setupFilter("privateJobsList", "privateJobFilterPanel", true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
