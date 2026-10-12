(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const KEYS = { jobs: "jg_jobs_v1", saved: "jg_saved_v1" };
  let language = "pa";
  let jobs = read(KEYS.jobs, []);
  let saved = read(KEYS.saved, []);

  function read(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { toast("Browser storage is unavailable. Please check browser settings."); return false; }
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function safeUrl(value) {
    try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) ? u.href : ""; }
    catch (_) { return ""; }
  }
  function toast(message) {
    const node = $("toast"); node.textContent = message; node.classList.remove("hidden");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.add("hidden"), 2800);
  }
  function persist() { write(KEYS.jobs, jobs); write(KEYS.saved, saved); }
  const translations = {
    pa: {
      tagline:"ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ • ਪੰਜਾਬੀ + English", eyebrow:"ਤੁਹਾਡੇ ਕਰੀਅਰ ਲਈ",
      heroTitle:"ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਲੱਭੋ, ਸਹੀ ਜਾਣਕਾਰੀ ਨਾਲ।",
      heroText:"ਪੰਜਾਬ ਅਤੇ ਭਾਰਤ ਦੀਆਂ ਭਰਤੀਆਂ ਲਈ ਜਾਣਕਾਰੀ ਵੇਖੋ। ਅਰਜ਼ੀ ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਜ਼ਰੂਰ ਪੜ੍ਹੋ।",
      browseBtn:"ਨੌਕਰੀਆਂ ਵੇਖੋ ↓", noticeTitle:"ਜ਼ਰੂਰੀ ਨੋਟ:",
      noticeText:"ਇਹ ਵੈੱਬਸਾਈਟ ਇਸ ਵੇਲੇ ਸ਼ੁਰੂਆਤੀ ਵਰਜਨ ਹੈ। ਹੇਠਾਂ ਕੋਈ ਅਸਲੀ vacancy ਨਹੀਂ ਦਿੱਤੀ ਗਈ। ਕਿਸੇ ਵੀ ਨੌਕਰੀ ਲਈ official notification ਅਤੇ last date ਖੁਦ verify ਕਰੋ।",
      jobsTab:"ਨੌਕਰੀਆਂ", savedTab:"ਸੇਵ ਕੀਤੀਆਂ", jobsHeading:"ਨਵੀਆਂ ਨੌਕਰੀਆਂ",
      jobsIntro:"ਆਪਣੀ ਲੋੜ ਮੁਤਾਬਕ ਖੋਜੋ ਅਤੇ ਫਿਲਟਰ ਕਰੋ।", publishedLabel:"ਪਬਲਿਸ਼",
      searchPlaceholder:"ਅਹੁਦਾ, ਵਿਭਾਗ ਜਾਂ ਯੋਗਤਾ ਖੋਜੋ", allLocations:"ਸਾਰੇ ਸਥਾਨ",
      allCategories:"ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ", emptyTitle:"ਹਾਲੇ ਕੋਈ ਮਨਜ਼ੂਰ ਨੌਕਰੀ ਨਹੀਂ",
      emptyText:"ਨਵੀਆਂ ਭਰਤੀਆਂ ਦੀ ਜਾਂਚ ਕਰਕੇ Admin Panel ਰਾਹੀਂ ਜੋੜੋ।",
      savedHeading:"ਸੇਵ ਕੀਤੀਆਂ ਨੌਕਰੀਆਂ", savedIntro:"ਆਪਣੀਆਂ ਪਸੰਦੀਦਾ ਨੌਕਰੀਆਂ ਇੱਥੇ ਵੇਖੋ।",
      emptySavedTitle:"ਹਾਲੇ ਕੋਈ ਨੌਕਰੀ ਸੇਵ ਨਹੀਂ ਕੀਤੀ",
      emptySavedText:"ਨੌਕਰੀ ਦੇ ਕਾਰਡ ਉੱਤੇ Save ਬਟਨ ਦਬਾਓ.",
      footerText:"ਜਾਣਕਾਰੀ ਲਈ ਪੋਰਟਲ — ਅੰਤਿਮ ਅਤੇ ਸਹੀ ਜਾਣਕਾਰੀ ਲਈ ਭਰਤੀ ਕਰਨ ਵਾਲੀ ਸੰਸਥਾ ਦਾ official notice ਹੀ ਮੰਨੋ।",
      save:"♡ Save", unsave:"♥ Saved", apply:"Official notice ↗", deadline:"ਆਖ਼ਰੀ ਮਿਤੀ",
      location:"ਸਥਾਨ", eligibility:"ਯੋਗਤਾ", checked:"ਜਾਂਚੀ ਮਿਤੀ", noResults:"ਇਸ ਖੋਜ ਲਈ ਕੋਈ ਨੌਕਰੀ ਨਹੀਂ ਮਿਲੀ।",
      pendingEmpty:"ਕੋਈ pending ਨੌਕਰੀ ਨਹੀਂ।", publishedEmpty:"ਹਾਲੇ ਕੁਝ publish ਨਹੀਂ ਕੀਤਾ।",
      pending:"Pending", approve:"Approve", reject:"Reject", delete:"Delete",
      submitted:"ਨੌਕਰੀ pending ਵਿੱਚ ਸੇਵ ਹੋ ਗਈ।", approved:"ਨੌਕਰੀ publish ਹੋ ਗਈ।",
      rejected:"Pending ਨੌਕਰੀ ਹਟਾ ਦਿੱਤੀ ਗਈ।", savedToast:"ਨੌਕਰੀ saved list ਵਿੱਚ ਜੋੜੀ ਗਈ।",
      removedToast:"Saved list ਤੋਂ ਹਟਾ ਦਿੱਤੀ ਗਈ।", noDate:"ਨਹੀਂ ਦਿੱਤੀ",
      confirmReset:"ਕੀ ਤੁਸੀਂ ਇਸ browser ਦਾ ਸਾਰਾ demo job data ਮਿਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
      resetDone:"Demo data ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ।"
    },
    en: {
      tagline:"Government jobs • Punjabi + English", eyebrow:"FOR YOUR CAREER",
      heroTitle:"Find government jobs with clearer information.",
      heroText:"Explore recruitment information for Punjab and India. Always read the official notification before applying.",
      browseBtn:"Browse jobs ↓", noticeTitle:"Important:",
      noticeText:"This is an early website version. No real vacancies are listed yet. Verify every official notification and deadline yourself.",
      jobsTab:"Jobs", savedTab:"Saved", jobsHeading:"Latest jobs",
      jobsIntro:"Search and filter opportunities to match your needs.", publishedLabel:"published",
      searchPlaceholder:"Search title, department or eligibility", allLocations:"All locations",
      allCategories:"All categories", emptyTitle:"No approved jobs yet",
      emptyText:"Verify official recruitment notices before adding jobs through the Admin Panel.",
      savedHeading:"Saved jobs", savedIntro:"Your shortlisted jobs appear here.",
      emptySavedTitle:"No saved jobs yet", emptySavedText:"Press Save on a job card to keep it here.",
      footerText:"Information portal — always rely on the recruiting organisation's official notice for final details.",
      save:"♡ Save", unsave:"♥ Saved", apply:"Official notice ↗", deadline:"Last date",
      location:"Location", eligibility:"Eligibility", checked:"Verified on", noResults:"No jobs match this search.",
      pendingEmpty:"No pending jobs.", publishedEmpty:"Nothing published yet.",
      pending:"Pending", approve:"Approve", reject:"Reject", delete:"Delete",
      submitted:"Job saved as pending.", approved:"Job published.", rejected:"Pending job removed.",
      savedToast:"Job added to saved list.", removedToast:"Removed from saved list.", noDate:"Not specified",
      confirmReset:"Delete all demo job data saved in this browser?",
      resetDone:"Demo data cleared."
    }
  };
  function t(key) { return translations[language][key] || translations.en[key] || key; }
  function setText(id, value) { const node = $(id); if (node) node.textContent = value; }
  function setLanguage(lang) {
    language = lang;
    document.documentElement.lang = lang === "pa" ? "pa" : "en";
    const map = {
      tagline:"tagline", eyebrow:"eyebrow", heroTitle:"heroTitle", heroText:"heroText",
      browseBtn:"browseBtn", noticeTitle:"noticeTitle", noticeText:"noticeText",
      jobsTab:"jobsTab", savedTab:"savedTab", jobsHeading:"jobsHeading", jobsIntro:"jobsIntro",
      publishedLabel:"publishedLabel", emptyTitle:"emptyTitle", emptyText:"emptyText",
      savedHeading:"savedHeading", savedIntro:"savedIntro", emptySavedTitle:"emptySavedTitle",
      emptySavedText:"emptySavedText", footerText:"footerText"
    };
    Object.entries(map).forEach(([id,key]) => setText(id, t(key)));
    $("langBtn").textContent = lang === "pa" ? "English" : "ਪੰਜਾਬੀ";
    $("searchInput").placeholder = t("searchPlaceholder");
    const loc = $("locationFilter").value, cat = $("categoryFilter").value;
    $("locationFilter").options[0].textContent = t("allLocations");
    $("categoryFilter").options[0].textContent = t("allCategories");
    $("locationFilter").value = loc; $("categoryFilter").value = cat;
    renderAll();
  }
  function switchView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("hidden", v.id !== id));
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === id));
    if (id === "savedView") renderSaved();
    if (id === "adminView") renderAdmin();
  }
  function jobCard(job) {
    const isSaved = saved.includes(job.id);
    const notice = safeUrl(job.noticeUrl);
    const apply = safeUrl(job.applyUrl) || notice;
    return `<article class="job-card">
      <div class="job-top"><span class="job-badge">${escapeHtml(job.category || "Other")}</span><span class="job-badge">${escapeHtml(job.status === "published" ? "Verified by admin" : "")}</span></div>
      <h3>${escapeHtml(job.title)}</h3><p class="job-dept">${escapeHtml(job.department)}</p>
      <div class="job-meta"><span>⌖ ${escapeHtml(job.location || "—")}</span><span>◷ ${escapeHtml(job.deadline || t("noDate"))}</span></div>
      ${job.eligibility ? `<p class="job-description">${escapeHtml(job.eligibility)}</p>` : ""}
      <p class="job-meta"><span>${escapeHtml(t("checked"))}: ${escapeHtml(job.sourceChecked || t("noDate"))}</span></p>
      <div class="job-actions">${notice ? `<a class="apply-link" href="${escapeHtml(notice)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("apply"))}</a>` : ""}
      ${apply && apply !== notice ? `<a href="${escapeHtml(apply)}" target="_blank" rel="noopener noreferrer">Apply ↗</a>` : ""}
      <button class="save-btn" type="button" data-save="${escapeHtml(job.id)}">${escapeHtml(isSaved ? t("unsave") : t("save"))}</button></div>
    </article>`;
  }
  function attachSaveButtons(container) {
    container.querySelectorAll("[data-save]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.save;
      if (saved.includes(id)) { saved = saved.filter(x => x !== id); toast(t("removedToast")); }
      else { saved.push(id); toast(t("savedToast")); }
      write(KEYS.saved, saved); renderAll();
    }));
  }
  function renderJobs() {
    const q = $("searchInput").value.trim().toLowerCase();
    const loc = $("locationFilter").value, cat = $("categoryFilter").value;
    const visible = jobs.filter(j => j.status === "published").filter(j => {
      const text = [j.title,j.department,j.eligibility,j.location,j.category].join(" ").toLowerCase();
      return (!q || text.includes(q)) && (!loc || j.location === loc) && (!cat || j.category === cat);
    });
    $("publishedCount").textContent = jobs.filter(j => j.status === "published").length;
    $("jobsList").innerHTML = visible.map(jobCard).join("");
    $("emptyJobs").classList.toggle("hidden", visible.length > 0);
    if (!visible.length) setText("emptyText", q || loc || cat ? t("noResults") : t("emptyText"));
    attachSaveButtons($("jobsList"));
  }
  function renderSaved() {
    const items = jobs.filter(j => saved.includes(j.id) && j.status === "published");
    $("savedList").innerHTML = items.map(jobCard).join("");
    $("emptySaved").classList.toggle("hidden", items.length > 0);
    attachSaveButtons($("savedList"));
  }
  function renderAdmin() {
    const pending = jobs.filter(j => j.status === "pending");
    const published = jobs.filter(j => j.status === "published");
    $("pendingCount").textContent = pending.length;
    $("adminPublishedCount").textContent = published.length;
    $("pendingList").innerHTML = pending.length ? pending.map(j => `<div class="pending-card"><strong>${escapeHtml(j.title)}</strong><p>${escapeHtml(j.department)} · ${escapeHtml(j.location)}</p><p>Official notice: <a href="${escapeHtml(safeUrl(j.noticeUrl))}" target="_blank" rel="noopener noreferrer">Open link ↗</a></p><div class="pending-actions"><button class="approve" data-approve="${escapeHtml(j.id)}">${escapeHtml(t("approve"))}</button><button class="reject" data-reject="${escapeHtml(j.id)}">${escapeHtml(t("reject"))}</button></div></div>`).join("") : `<p class="tiny-empty">${escapeHtml(t("pendingEmpty"))}</p>`;
    $("adminPublishedList").innerHTML = published.length ? published.map(j => `<div class="pending-card"><strong>${escapeHtml(j.title)}</strong><p>${escapeHtml(j.department)} · ${escapeHtml(j.deadline || t("noDate"))}</p><div class="pending-actions"><button class="reject" data-delete="${escapeHtml(j.id)}">${escapeHtml(t("delete"))}</button></div></div>`).join("") : `<p class="tiny-empty">${escapeHtml(t("publishedEmpty"))}</p>`;
    $("pendingList").querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", () => changeStatus(b.dataset.approve, "published")));
    $("pendingList").querySelectorAll("[data-reject]").forEach(b => b.addEventListener("click", () => removeJob(b.dataset.reject)));
    $("adminPublishedList").querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => removeJob(b.dataset.delete)));
  }
  function changeStatus(id, status) {
    jobs = jobs.map(j => j.id === id ? {...j, status} : j); persist(); renderAll(); renderAdmin();
    toast(status === "published" ? t("approved") : t("submitted"));
  }
  function removeJob(id) { jobs = jobs.filter(j => j.id !== id); saved = saved.filter(x => x !== id); persist(); renderAll(); renderAdmin(); toast(t("rejected")); }
  function renderAll() {
    $("savedNavCount").textContent = jobs.filter(j => j.status === "published" && saved.includes(j.id)).length;
    renderJobs(); renderSaved(); renderAdmin();
  }

  document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
  $("langBtn").addEventListener("click", () => setLanguage(language === "pa" ? "en" : "pa"));
  ["searchInput","locationFilter","categoryFilter"].forEach(id => $(id).addEventListener(id === "searchInput" ? "input" : "change", renderJobs));
  $("jobForm").addEventListener("submit", event => {
    event.preventDefault();
    const noticeUrl = safeUrl($("noticeUrl").value.trim());
    const applyUrl = $("applyUrl").value.trim() ? safeUrl($("applyUrl").value.trim()) : "";
    if (!noticeUrl || ($("applyUrl").value.trim() && !applyUrl)) { toast("Please enter valid http/https links."); return; }
    const sourceChecked = $("sourceChecked").value;
    if (!sourceChecked) { toast("Please enter the date you checked the official notice."); return; }
    const job = {
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      title: $("jobTitle").value.trim(), department: $("department").value.trim(),
      location: $("location").value, category: $("category").value,
      eligibility: $("eligibility").value.trim(), deadline: $("deadline").value,
      noticeUrl, applyUrl, sourceChecked, status: "pending"
    };
    jobs.unshift(job); persist(); $("jobForm").reset(); $("sourceChecked").value = new Date().toISOString().slice(0,10);
    renderAll(); toast(t("submitted"));
  });
  $("resetBtn").addEventListener("click", () => {
    if (window.confirm(t("confirmReset"))) { jobs = []; saved = []; persist(); renderAll(); toast(t("resetDone")); }
  });
  $("year").textContent = new Date().getFullYear();
  $("sourceChecked").value = new Date().toISOString().slice(0,10);
  setLanguage("pa");
})();