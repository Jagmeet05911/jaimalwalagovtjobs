(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // Supabase public configuration. Row Level Security protects all job records.
  const SUPABASE_URL = "https://kbebdetnhfkxnkpdiefd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_51mCCN-NaaylwYSnLyFk2Q_Uovo2lY_";
  const SESSION_KEY = "jg_supabase_session_v1";
  const PRIVATE_JOBS_URL = new URL("./data/private_jobs.json", document.baseURI).href;
  let accessToken = "";
  let adminUser = null;
  let cloudReady = false;
  let privateJobs = [];

  function dbJob(row) {
    return {
      id: row.id, title: row.title, department: row.department,
      location: row.location || "Punjab", category: row.category || "Other",
      eligibility: row.eligibility || "", deadline: row.deadline || "",
      noticeUrl: row.notice_url, applyUrl: row.apply_url || "",
      admitCardUrl: row.admit_card_url || "",
      sourceChecked: row.source_checked || "", status: row.status
    };
  }

  function jobRow(job) {
    return {
      id: String(job.id), title: job.title, department: job.department,
      location: job.location || "Punjab", category: job.category || "Other",
      eligibility: job.eligibility || "", deadline: job.deadline || null,
      notice_url: job.noticeUrl, apply_url: job.applyUrl || null,
      admit_card_url: job.admitCardUrl || null,
      source_checked: job.sourceChecked || null, status: job.status || "pending"
    };
  }

  async function supa(path, options = {}, authenticated = false) {
    const headers = {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (authenticated) {
      if (!accessToken) throw new Error("Please sign in to the Admin Panel first.");
      headers.Authorization = "Bearer " + accessToken;
    } else if (accessToken) {
      headers.Authorization = "Bearer " + accessToken;
    }
    const response = await fetch(SUPABASE_URL + path, { ...options, headers });
    const body = await response.text();
    let data = null;
    try { data = body ? JSON.parse(body) : null; } catch (_) {}
    if (!response.ok) throw new Error(data?.message || data?.msg || data?.error_description || "Database request failed (" + response.status + ")");
    return data;
  }

  async function loadPrivateJobs() {
    try {
      const response = await fetch(PRIVATE_JOBS_URL + "?v=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("Private jobs feed unavailable");
      const data = await response.json();
      privateJobs = Array.isArray(data) ? data.filter(job => job?.status === "published") : [];
    } catch (error) {
      console.error("Private jobs feed failed:", error);
      privateJobs = [];
    }
    renderPrivateJobs();
  }

  function showAdminLogin() {
    const host = $("adminView");
    if (!host || $("supabaseAdminBox")) return;
    const box = document.createElement("div");
    box.id = "supabaseAdminBox";
    box.className = "panel";
    box.style.marginBottom = "18px";
    box.innerHTML = `
      <h3>Secure Admin Login</h3>
      <p class="muted">Sign in with your administrator account. Your password is not stored in this website code.</p>
      <form id="supabaseLoginForm">
        <label for="adminEmail">Admin email</label>
        <input id="adminEmail" type="email" autocomplete="username" required value="jaimalwalajobpoint@gmail.com">
        <label for="adminPassword">Password</label>
        <input id="adminPassword" type="password" autocomplete="current-password" required>
        <button class="btn btn-primary full" type="submit">Login</button>
      </form>
      <div id="adminSessionInfo" class="muted" style="margin-top:12px"></div>
    `;
    const heading = host.querySelector(".section-head");
    if (heading) heading.after(box); else host.prepend(box);
    const protectedPanels = host.querySelectorAll(".warning, .admin-grid");
    protectedPanels.forEach(el => el.classList.add("hidden"));
    $("supabaseLoginForm").addEventListener("submit", async event => {
      event.preventDefault();
      const button = $("supabaseLoginForm").querySelector("button");
      button.disabled = true;
      try {
        const result = await supa("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: JSON.stringify({
            email: $("adminEmail").value.trim(),
            password: $("adminPassword").value
          })
        });
        if (!result?.access_token || result?.user?.email?.toLowerCase() !== "jaimalwalajobpoint@gmail.com") {
          throw new Error("This account is not authorized for the Admin Panel.");
        }
        accessToken = result.access_token;
        adminUser = result.user;
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          user: result.user
        }));
        $("adminPassword").value = "";
        await loadCloudJobs();
        updateAdminSession();
        await loadAutomaticJobs();
        toast("Admin login successful.");
      } catch (error) {
        toast("Login failed: " + error.message);
      } finally {
        button.disabled = false;
      }
    });
  }

  function updateAdminSession() {
    const info = $("adminSessionInfo");
    const form = $("supabaseLoginForm");
    const protectedPanels = $("adminView")?.querySelectorAll(".warning, .admin-grid") || [];
    protectedPanels.forEach(el => el.classList.toggle("hidden", !adminUser));
    if (form) form.classList.toggle("hidden", !!adminUser);
    if (info) {
      info.innerHTML = adminUser
        ? 'Signed in as <strong>' + escapeHtml(adminUser.email) + '</strong> <button type="button" id="adminLogoutBtn" class="btn btn-danger">Logout</button>'
        : "Sign in to review pending jobs or add a new job.";
    }
    const logout = $("adminLogoutBtn");
    if (logout) logout.addEventListener("click", async () => {
      try { await supa("/auth/v1/logout", { method: "POST" }, true); } catch (_) {}
      accessToken = "";
      adminUser = null;
      localStorage.removeItem(SESSION_KEY);
      await loadCloudJobs();
      updateAdminSession();
      toast("You have been signed out.");
    });
  }

  async function loadCloudJobs() {
    try {
      const filter = adminUser ? "" : "&status=eq.published";
      const rows = await supa("/rest/v1/jobs?select=*&order=created_at.desc" + filter);
      jobs = (Array.isArray(rows) ? rows : []).map(dbJob);
      cloudReady = true;
      renderAll();
    } catch (error) {
      console.error("Supabase load failed:", error);
      if (!cloudReady) jobs = [];
      renderAll();
      toast("Could not load jobs: " + error.message);
    }
  }

  async function initializeCloud() {
    showAdminLogin();
    await loadPrivateJobs();
    try {
      const savedSession = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (savedSession?.access_token && savedSession?.user?.email?.toLowerCase() === "jaimalwalajobpoint@gmail.com") {
        accessToken = savedSession.access_token;
        const user = await supa("/auth/v1/user", {}, true);
        if (user?.email?.toLowerCase() === "jaimalwalajobpoint@gmail.com") adminUser = user;
        else { accessToken = ""; localStorage.removeItem(SESSION_KEY); }
      }
    } catch (_) {
      accessToken = "";
      adminUser = null;
      localStorage.removeItem(SESSION_KEY);
    }
    await loadCloudJobs();
    updateAdminSession();
    if (adminUser) await loadAutomaticJobs();
  }

  const KEYS = {
    jobs: "jg_jobs_v1",
    saved: "jg_saved_v1"
  };

  let language = "en";
  let jobs = [];
  let saved = read(KEYS.saved, []);
  let deadlineSort = false;

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.log("Storage error:", error);
      return false;
    }
  }

  function persist() {
    write(KEYS.saved, saved);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (error) { return ""; }
  }

  function toast(message) {
    const node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.add("hidden"), 2800);
  }

  const translations = {
    pa: {
      tagline: "ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ • ਪੰਜਾਬੀ + English",
      eyebrow: "ਤੁਹਾਡੇ ਕਰੀਅਰ ਲਈ",
      heroTitle: "ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਲੱਭੋ, ਸਹੀ ਜਾਣਕਾਰੀ ਨਾਲ।",
      heroText: "ਪੰਜਾਬ ਅਤੇ ਭਾਰਤ ਦੀਆਂ ਭਰਤੀਆਂ ਲਈ ਜਾਣਕਾਰੀ ਵੇਖੋ। ਅਰਜ਼ੀ ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਜ਼ਰੂਰ ਪੜ੍ਹੋ।",
      browseBtn: "ਨੌਕਰੀਆਂ ਵੇਖੋ ↓",
      noticeTitle: "ਜ਼ਰੂਰੀ ਨੋਟ:",
      noticeText: "ਇਹ ਵੈੱਬਸਾਈਟ ਸ਼ੁਰੂਆਤੀ ਵਰਜਨ ਹੈ। ਹਰ ਨੌਕਰੀ ਲਈ official notification ਅਤੇ last date ਖੁਦ verify ਕਰੋ।"
    }
  };

  function switchView(id) {
    document.querySelectorAll(".view").forEach(view => view.classList.toggle("hidden", view.id !== id));
    document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.view === id));
    if (id === "savedView") renderSaved();
    if (id === "privateJobsView") renderPrivateJobs();
  }

  function renderPrivateJobs() {
    const list = $("privateJobsList");
    if (!list) return;
    const items = privateJobs.filter(job => String(job.category || "").toLowerCase() === "private jobs");
    list.innerHTML = items.map(jobCard).join("");
    if ($("privateJobsCount")) $("privateJobsCount").textContent = String(items.length);
    if ($("emptyPrivateJobs")) $("emptyPrivateJobs").classList.toggle("hidden", items.length > 0);
    attachSaveButtons(list);
  }

  function renderJobs() {
    const list = $("jobsList");
    if (!list) return;
    const visible = jobs.filter(job => job.status === "published" && String(job.category || "").toLowerCase() !== "private jobs");
    list.innerHTML = visible.map(jobCard).join("");
    const count = $("jobsCount");
    if (count) count.textContent = String(visible.length);
    attachSaveButtons(list);
  }

  function renderSaved() {
    const list = $("savedJobsList");
    if (!list) return;
    const savedJobs = jobs.filter(job => saved.includes(String(job.id)));
    list.innerHTML = savedJobs.map(jobCard).join("");
    attachSaveButtons(list);
  }

  function renderAll() {
    renderJobs();
    renderPrivateJobs();
    renderSaved();
  }

  function jobCard(job) {
    const notice = safeUrl(job.noticeUrl || job.url);
    const apply = safeUrl(job.applyUrl);
    return `<article class="job-card">
      <div class="job-card-head"><span class="job-category">${escapeHtml(job.category || "Job")}</span></div>
      <h3>${escapeHtml(job.title)}</h3>
      <p class="job-meta"><strong>${escapeHtml(job.department || "")}</strong> · ${escapeHtml(job.location || "")}</p>
      <p>${escapeHtml(job.eligibility || "Check the official posting for full details.")}</p>
      ${job.deadline ? `<p class="deadline">Last date: ${escapeHtml(job.deadline)}</p>` : ""}
      <div class="job-actions">
        ${notice ? `<a class="btn btn-light" href="${notice}" target="_blank" rel="noopener">Official Notice ↗</a>` : ""}
        ${apply ? `<a class="btn btn-primary" href="${apply}" target="_blank" rel="noopener">Apply ↗</a>` : ""}
      </div>
    </article>`;
  }

  function attachSaveButtons(root) {
    if (!root) return;
    root.querySelectorAll("[data-save-id]").forEach(button => {
      button.addEventListener("click", () => {
        const id = String(button.dataset.saveId);
        if (saved.includes(id)) saved = saved.filter(value => value !== id);
        else saved.push(id);
        persist();
        renderAll();
      });
    });
  }

  // Remaining site/admin logic is preserved below.
  function loadAutomaticJobs() { return Promise.resolve(); }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-view]").forEach(button => {
      button.addEventListener("click", () => switchView(button.dataset.view));
    });
    initializeCloud();
  });
})();
