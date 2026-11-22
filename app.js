(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // Supabase public configuration. Row Level Security protects all job records.
  const SUPABASE_URL = "https://kbebdetnhfkxnkpdiefd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_51mCCN-NaaylwYSnLyFk2Q_Uovo2lY_";
  const SESSION_KEY = "jg_supabase_session_v1";
  let accessToken = "";
  let adminUser = null;
  let cloudReady = false;

  function dbJob(row) {
    return {
      id: row.id, title: row.title, department: row.department,
      location: row.location || "Punjab", category: row.category || "Other",
      eligibility: row.eligibility || "", ageLimit: row.age_limit || "", deadline: row.deadline || "",
      noticeUrl: row.notice_url, applyUrl: row.apply_url || "",
      admitCardUrl: row.admit_card_url || "",
      sourceChecked: row.source_checked || "", status: row.status
    };
  }

  function jobRow(job) {
    return {
      id: String(job.id), title: job.title, department: job.department,
      location: job.location || "Punjab", category: job.category || "Other",
      eligibility: job.eligibility || "", age_limit: job.ageLimit || null, deadline: job.deadline || null,
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

  // Count a browser once per local calendar day and keep page views private to the admin.
  function getVisitorKey() {
    const key = "jg_visitor_key_v1";
    try {
      let value = localStorage.getItem(key);
      if (!value || value.length < 20) {
        value = (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID() + "-" + crypto.randomUUID()
          : String(Date.now()) + "-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
        localStorage.setItem(key, value);
      }
      return value;
    } catch (_) {
      return String(Date.now()) + "-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
    }
  }

  async function recordSiteVisit() {
    const counter = $("siteVisitCount");
    try {
      const path = (location.pathname || "/").slice(0, 250);
      const total = await supa("/rest/v1/rpc/record_site_visit", {
        method: "POST",
        body: JSON.stringify({
          p_visitor_key: getVisitorKey(),
          p_visit_date: localDateString(),
          p_page_path: path
        })
      });
      if (counter && Number.isFinite(Number(total))) counter.textContent = Number(total).toLocaleString();
    } catch (error) {
      if (counter) counter.textContent = "—";
      console.warn("Visitor counter is not configured yet. Run the analytics SQL file in Supabase.", error);
    }
  }

  async function loadPrivateAnalytics() {
    if (!adminUser || !accessToken) return;
    const summary = $("siteAnalyticsSummary");
    const daily = $("siteAnalyticsDaily");
    if (!summary || !daily) return;
    summary.textContent = "Loading analytics…";
    try {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const fromDate = localDateString(since);
      const rows = await supa("/rest/v1/site_analytics?select=visitor_key,visit_date,page_path,created_at&visit_date=gte." + encodeURIComponent(fromDate) + "&order=visit_date.desc", {}, true);
      const data = Array.isArray(rows) ? rows : [];
      const clickRows = data.filter(row => String(row.page_path || "").startsWith("/apply-click/"));
      const pageRows = data.filter(row => !String(row.page_path || "").startsWith("/apply-click/"));
      const visitors = new Set(pageRows.map(row => row.visitor_key + "|" + row.visit_date)).size;
      const clickVisitors = new Set(clickRows.map(row => row.visitor_key + "|" + row.visit_date)).size;
      summary.innerHTML = '<p><strong>Page views (last 7 days):</strong> ' + pageRows.length.toLocaleString() + '</p><p><strong>Unique browser-days (last 7 days):</strong> ' + visitors.toLocaleString() + '</p><p><strong>Apply Online clicks (last 7 days):</strong> ' + clickRows.length.toLocaleString() + '</p><p><strong>Unique browser-days with Apply clicks:</strong> ' + clickVisitors.toLocaleString() + '</p>';
      const byDayPage = new Map();
      data.forEach(row => {
        const key = row.visit_date + "|" + row.page_path;
        byDayPage.set(key, (byDayPage.get(key) || 0) + 1);
      });
      const lines = Array.from(byDayPage.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      daily.innerHTML = lines.length
        ? lines.slice(0, 50).map(([key, count]) => {
            const split = key.indexOf("|");
            const pagePath = key.slice(split + 1);
            if (pagePath.startsWith("/apply-click/")) {
              let jobId = pagePath.slice("/apply-click/".length);
              try { jobId = decodeURIComponent(jobId); } catch (_) {}
              const clickedJob = jobs.find(job => String(job.id) === jobId);
              const label = clickedJob ? "Apply Online · " + clickedJob.title : "Apply Online · Job " + jobId;
              return '<div class="pending-card"><strong>' + escapeHtml(displayDate(key.slice(0, split))) + '</strong><p>' + escapeHtml(label) + ' · ' + count + ' click(s)</p></div>';
            }
            return '<div class="pending-card"><strong>' + escapeHtml(displayDate(key.slice(0, split))) + '</strong><p>' + escapeHtml(pagePath) + ' · ' + count + ' page view(s)</p></div>';
          }).join("")
        : '<p class="muted">No visits recorded yet. Open the public website once the SQL setup is complete.</p>';
    } catch (error) {
      summary.textContent = "Analytics could not load: " + error.message + ". Check that site_analytics.sql has been run in Supabase.";
      daily.innerHTML = "";
    }
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
        await loadPrivateAnalytics();
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
    const protectedPanels = $("adminView")?.querySelectorAll(".warning, .admin-grid, #siteAnalyticsPanel") || [];
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
    if (adminUser) { await loadAutomaticJobs(); await loadPrivateAnalytics(); }
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

  // Use the visitor's local calendar date; UTC can shift the date in India.
  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  // Keep published listings visible unless a clear, valid deadline has expired.
  // Missing/legacy dates must not make every existing published job disappear.
  function isDeadlineActive(job) {
    if (!job) return false;
    const raw = String(job.deadline || "").trim();
    if (!raw) return true;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return true;
    const deadline = match[1] + "-" + match[2] + "-" + match[3];
    return deadline >= localDateString();
  }

  // Format YYYY-MM-DD without parsing it as UTC (which can shift the day).
  function displayDate(value) {
    if (!value) return "";
    const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[3] + "/" + match[2] + "/" + match[1];
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : [
      String(parsed.getDate()).padStart(2, "0"),
      String(parsed.getMonth() + 1).padStart(2, "0"),
      parsed.getFullYear()
    ].join("/");
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
    // Jobs live in Supabase; only visitor-specific saved IDs stay in this browser.
    write(KEYS.saved, saved);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function toast(message) {
    const node = $("toast");

    if (!node) return;

    node.textContent = message;
    node.classList.remove("hidden");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      node.classList.add("hidden");
    }, 2800);
  }

  const translations = {
    pa: {
      tagline: "ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ • ਪੰਜਾਬੀ + English",
      eyebrow: "ਤੁਹਾਡੇ ਕਰੀਅਰ ਲਈ",
      heroTitle: "ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਲੱਭੋ, ਸਹੀ ਜਾਣਕਾਰੀ ਨਾਲ।",
      heroText:
        "ਪੰਜਾਬ ਅਤੇ ਭਾਰਤ ਦੀਆਂ ਭਰਤੀਆਂ ਲਈ ਜਾਣਕਾਰੀ ਵੇਖੋ। ਅਰਜ਼ੀ ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਜ਼ਰੂਰ ਪੜ੍ਹੋ।",
      browseBtn: "ਨੌਕਰੀਆਂ ਵੇਖੋ ↓",
      noticeTitle: "ਜ਼ਰੂਰੀ ਨੋਟ:",
      noticeText:
        "ਇਹ ਨੌਕਰੀਆਂ ਬਾਰੇ ਜਾਣਕਾਰੀ ਦੇਣ ਵਾਲਾ ਸੁਤੰਤਰ ਪੋਰਟਲ ਹੈ, ਸਰਕਾਰੀ ਵੈੱਬਸਾਈਟ ਨਹੀਂ। ਅਰਜ਼ੀ ਤੋਂ ਪਹਿਲਾਂ ਅਧਿਕਾਰਤ ਨੋਟਿਸ ਅਤੇ ਆਖ਼ਰੀ ਤਾਰੀਖ਼ ਜ਼ਰੂਰ ਜਾਂਚੋ।",
      homeTab: "🏠 ਹੋਮ",
      homeEyebrow: "JAIMALWALA GOVT JOBS",
      homeHeading: "ਤੁਹਾਡਾ ਸਰਕਾਰੀ ਨੌਕਰੀ ਪੋਰਟਲ",
      homeIntro: "ਨਵੀਆਂ ਭਰਤੀਆਂ, ਐਡਮਿਟ ਕਾਰਡ ਅਤੇ ਨਤੀਜਿਆਂ ਦੀ ਜਾਣਕਾਰੀ ਇੱਕੋ ਥਾਂ ਲੱਭੋ। ਅਰਜ਼ੀ ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ official notification ਜ਼ਰੂਰ ਪੜ੍ਹੋ।",
      homeBrowseBtn: "ਨਵੀਆਂ ਨੌਕਰੀਆਂ ਵੇਖੋ ↗",
      siteBookmarkBtn: "⭐ ਵੈੱਬਸਾਈਟ Bookmark ਕਰੋ",
      homeJobsLabel: "ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ",
      homeJobsHint: "ਨਵੀਆਂ ਭਰਤੀਆਂ ਅਤੇ ਆਖ਼ਰੀ ਮਿਤੀਆਂ",
      homeAdmitLabel: "ਐਡਮਿਟ ਕਾਰਡ",
      homeAdmitHint: "ਰੋਲ ਨੰਬਰ ਅਤੇ ਡਾਊਨਲੋਡ ਲਿੰਕ",
      homeSavedLabel: "ਸੇਵ ਕੀਤੀਆਂ ਨੌਕਰੀਆਂ",
      homeSavedHint: "ਆਪਣੀ ਪਸੰਦ ਦੀਆਂ ਨੌਕਰੀਆਂ ਸੰਭਾਲੋ",
      homeTrustTitle: "✓ ਅਧਿਕਾਰਤ ਜਾਣਕਾਰੀ ਨੂੰ ਪਹਿਲ",
      homeTrustText: "ਨੌਕਰੀ ਦੀ ਯੋਗਤਾ, ਫੀਸ, ਆਖ਼ਰੀ ਮਿਤੀ ਅਤੇ ਅਰਜ਼ੀ ਦਾ ਲਿੰਕ ਸਬੰਧਤ ਵਿਭਾਗ ਦੀ official website ਤੋਂ ਪੱਕਾ ਕਰੋ।",
      jobsTab: "ਨੌਕਰੀਆਂ",
      savedTab: "ਸੇਵ ਕੀਤੀਆਂ",
      admitTab: "ਐਡਮਿਟ ਕਾਰਡ",
      admitHeading: "ਐਡਮਿਟ ਕਾਰਡ / ਰੋਲ ਨੰਬਰ",
      admitIntro: "ਜਿਨ੍ਹਾਂ ਨੌਕਰੀਆਂ ਦੇ ਐਡਮਿਟ ਕਾਰਡ ਦਾ official link ਜਾਰੀ ਹੋਇਆ ਹੈ, ਉਹ ਇੱਥੇ ਵੇਖੋ।",
      emptyAdmitTitle: "ਹਾਲੇ ਕੋਈ ਐਡਮਿਟ ਕਾਰਡ ਲਿੰਕ ਨਹੀਂ",
      emptyAdmitText: "ਐਡਮਿਟ ਕਾਰਡ ਜਾਰੀ ਹੋਣ ਅਤੇ Admin Panel ਵਿੱਚ official link ਜੋੜਨ ਤੋਂ ਬਾਅਦ ਇੱਥੇ ਦਿਖੇਗਾ.",
      jobsHeading: "ਨਵੀਆਂ ਨੌਕਰੀਆਂ",
      jobsIntro: "ਆਪਣੀ ਲੋੜ ਮੁਤਾਬਕ ਖੋਜੋ ਅਤੇ ਫਿਲਟਰ ਕਰੋ।",
      publishedLabel: "ਪਬਲਿਸ਼",
      searchPlaceholder: "ਅਹੁਦਾ, ਵਿਭਾਗ ਜਾਂ ਯੋਗਤਾ ਖੋਜੋ",
      allLocations: "ਸਾਰੇ ਸਥਾਨ",
      allCategories: "ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ",
      emptyTitle: "ਹਾਲੇ ਕੋਈ ਮਨਜ਼ੂਰ ਨੌਕਰੀ ਨਹੀਂ",
      emptyText:
        "ਨਵੀਆਂ ਭਰਤੀਆਂ ਦੀ ਜਾਂਚ ਕਰਕੇ Admin Panel ਰਾਹੀਂ ਜੋੜੋ।",
      savedHeading: "ਸੇਵ ਕੀਤੀਆਂ ਨੌਕਰੀਆਂ",
      savedIntro: "ਆਪਣੀਆਂ ਪਸੰਦੀਦਾ ਨੌਕਰੀਆਂ ਇੱਥੇ ਵੇਖੋ।",
      emptySavedTitle: "ਹਾਲੇ ਕੋਈ ਨੌਕਰੀ ਸੇਵ ਨਹੀਂ ਕੀਤੀ",
      emptySavedText:
        "ਨੌਕਰੀ ਦੇ ਕਾਰਡ ਉੱਤੇ Save ਬਟਨ ਦਬਾਓ।",
      footerText:
        "ਅੰਤਿਮ ਅਤੇ ਸਹੀ ਜਾਣਕਾਰੀ ਲਈ ਭਰਤੀ ਕਰਨ ਵਾਲੀ ਸੰਸਥਾ ਦਾ official notice ਹੀ ਮੰਨੋ।",
      save: "♡ Save",
      unsave: "♥ Saved",
      notification: "Official Notification ↗",
      applyOnline: "Apply Online ↗",
      admitCard: "ਰੋਲ ਨੰਬਰ / ਐਡਮਿਟ ਕਾਰਡ ਡਾਊਨਲੋਡ ↗",
      admitCardUnavailable: "ਐਡਮਿਟ ਕਾਰਡ ਹਾਲੇ ਜਾਰੀ ਨਹੀਂ",
      applyUnavailable: "ਫਾਰਮ ਦਾ ਸਿੱਧਾ ਲਿੰਕ ਹਾਲੇ ਨਹੀਂ",
      deadline: "ਆਖ਼ਰੀ ਮਿਤੀ",
      location: "ਸਥਾਨ",
      eligibility: "ਯੋਗਤਾ",
      checked: "ਜਾਂਚੀ ਮਿਤੀ",
      noResults: "ਇਸ ਖੋਜ ਲਈ ਕੋਈ ਨੌਕਰੀ ਨਹੀਂ ਮਿਲੀ।",
      pendingEmpty: "ਕੋਈ pending ਨੌਕਰੀ ਨਹੀਂ।",
      publishedEmpty: "ਹਾਲੇ ਕੁਝ publish ਨਹੀਂ ਕੀਤਾ।",
      pending: "Pending",
      approve: "Approve",
      reject: "Reject",
      delete: "Delete",
      submitted: "ਨੌਕਰੀ pending ਵਿੱਚ ਸੇਵ ਹੋ ਗਈ।",
      approved: "ਨੌਕਰੀ publish ਹੋ ਗਈ।",
      rejected: "ਨੌਕਰੀ ਹਟਾ ਦਿੱਤੀ ਗਈ।",
      savedToast: "ਨੌਕਰੀ saved list ਵਿੱਚ ਜੋੜੀ ਗਈ।",
      removedToast: "Saved list ਤੋਂ ਹਟਾ ਦਿੱਤੀ ਗਈ।",
      noDate: "ਨਹੀਂ ਦਿੱਤੀ",
      confirmReset:
        "ਕੀ ਤੁਸੀਂ ਇਸ browser ਦਾ ਸਾਰਾ demo job data ਮਿਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
      resetDone: "Demo data ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ।"
    },

    en: {
      tagline: "Government jobs • Punjabi + English",
      eyebrow: "FOR YOUR CAREER",
      heroTitle: "Find government jobs with clearer information.",
      heroText:
        "Explore recruitment information for Punjab and India. Always read the official notification before applying.",
      browseBtn: "Browse jobs ↓",
      noticeTitle: "Important:",
      noticeText:
        "Independent job-information portal, not a government website. Always verify the official notification and deadline before applying.",
      homeTab: "🏠 Home",
      homeEyebrow: "JAIMALWALA GOVT JOBS",
      homeHeading: "Your Government Jobs Portal",
      homeIntro: "Find recruitment updates, admit cards and results in one place. Always read the official notification before applying.",
      homeBrowseBtn: "Browse Latest Jobs ↗",
      siteBookmarkBtn: "⭐ Bookmark This Website",
      homeJobsLabel: "Government Jobs",
      homeJobsHint: "Latest recruitment and closing dates",
      homeAdmitLabel: "Admit Cards",
      homeAdmitHint: "Roll numbers and download links",
      homeSavedLabel: "Saved Jobs",
      homeSavedHint: "Keep your preferred opportunities handy",
      homeTrustTitle: "✓ Official information comes first",
      homeTrustText: "Verify eligibility, fees, deadlines and application links on the recruiting department's official website.",
      benefitSearchTitle: "Easy Search",
      benefitSearchText: "By job title and eligibility",
      benefitNoticeTitle: "Notification Link",
      benefitNoticeText: "Recruiting body's official website",
      benefitDeadlineTitle: "Closing Date",
      benefitDeadlineText: "Check before applying",
      benefitLanguageTitle: "Punjabi + English",
      benefitLanguageText: "Easy to understand",
      jobsTab: "Jobs",
      savedTab: "Saved",
      admitTab: "Admit Card",
      admitHeading: "Admit Cards / Roll Numbers",
      admitIntro: "Find official admit-card links for published recruitments here.",
      emptyAdmitTitle: "No admit-card links yet",
      emptyAdmitText: "Official links will appear here after an admit card is released and added in the Admin Panel.",
      jobsHeading: "Latest jobs",
      jobsIntro: "Search and filter opportunities.",
      publishedLabel: "published",
      searchPlaceholder: "Search title, department or eligibility",
      allLocations: "All locations",
      allCategories: "All categories",
      emptyTitle: "No approved jobs yet",
      emptyText:
        "Verify official recruitment notices before publishing jobs.",
      savedHeading: "Saved jobs",
      savedIntro: "Your shortlisted jobs appear here.",
      emptySavedTitle: "No saved jobs yet",
      emptySavedText:
        "Press Save on a job card to keep it here.",
      footerText:
        "Always rely on the recruiting organisation's official notice.",
      save: "♡ Save",
      unsave: "♥ Saved",
      notification: "Official Notification ↗",
      applyOnline: "Apply Online ↗",
      admitCard: "Download Roll Number / Admit Card ↗",
      admitCardUnavailable: "Admit card link not released yet",
      applyUnavailable: "Direct form link not added yet",
      deadline: "Last date",
      location: "Location",
      eligibility: "Eligibility",
      checked: "Verified on",
      noResults: "No jobs match this search.",
      pendingEmpty: "No pending jobs.",
      publishedEmpty: "Nothing published yet.",
      pending: "Pending",
      approve: "Approve",
      reject: "Reject",
      delete: "Delete",
      submitted: "Job saved as pending.",
      approved: "Job published.",
      rejected: "Job removed.",
      savedToast: "Job added to saved list.",
      removedToast: "Removed from saved list.",
      noDate: "Not specified",
      confirmReset:
        "Delete all demo job data saved in this browser?",
      resetDone: "Demo data cleared."
    }
  };


  const hindiTranslations = {
    ...translations.en,
    tagline: "सरकारी नौकरियाँ • पंजाबी + English",
    eyebrow: "आपके करियर के लिए",
    heroTitle: "सही जानकारी के साथ सरकारी नौकरी खोजें।",
    heroText: "पंजाब और भारत की भर्तियों की जानकारी देखें। आवेदन करने से पहले आधिकारिक नोटिफिकेशन ज़रूर पढ़ें।",
    browseBtn: "नौकरियाँ देखें ↓",
    noticeTitle: "ज़रूरी सूचना:",
    noticeText: "यह नौकरी-सूचना पोर्टल है, सरकारी वेबसाइट नहीं। आवेदन से पहले आधिकारिक नोटिस और अंतिम तारीख़ ज़रूर जाँचें।",
    homeTab: "🏠 होम",
    homeHeading: "आपका सरकारी नौकरी पोर्टल",
    homeIntro: "नई भर्तियाँ, एडमिट कार्ड और नतीजों की जानकारी एक जगह पाएँ। आवेदन से पहले आधिकारिक नोटिफिकेशन ज़रूर पढ़ें।",
    homeBrowseBtn: "नई नौकरियाँ देखें ↗",
    siteBookmarkBtn: "⭐ वेबसाइट बुकमार्क करें",
    homeJobsLabel: "सरकारी नौकरियाँ",
    homeJobsHint: "नई भर्तियाँ और अंतिम तारीख़ें",
    homeAdmitLabel: "एडमिट कार्ड",
    homeAdmitHint: "रोल नंबर और डाउनलोड लिंक",
    homeSavedLabel: "सेव की गई नौकरियाँ",
    homeSavedHint: "अपनी पसंद की नौकरियाँ सँभालें",
    homeTrustTitle: "✓ आधिकारिक जानकारी को प्राथमिकता",
    homeTrustText: "योग्यता, फीस, अंतिम तारीख़ और आवेदन लिंक संबंधित विभाग की आधिकारिक वेबसाइट पर जाँचें।",
    benefitSearchTitle: "आसान खोज",
    benefitSearchText: "पद और योग्यता के अनुसार",
    benefitNoticeTitle: "नोटिफिकेशन लिंक",
    benefitNoticeText: "भर्ती संस्था की आधिकारिक वेबसाइट",
    benefitDeadlineTitle: "अंतिम तारीख़",
    benefitDeadlineText: "आवेदन से पहले जाँचें",
    benefitLanguageTitle: "पंजाबी + English + हिन्दी",
    benefitLanguageText: "अपनी भाषा चुनें",
    jobsTab: "नौकरियाँ",
    savedTab: "सेव की गई",
    admitTab: "एडमिट कार्ड",
    admitHeading: "एडमिट कार्ड / रोल नंबर",
    admitIntro: "जिन भर्तियों के एडमिट कार्ड के आधिकारिक लिंक जारी हुए हैं, वे यहाँ देखें।",
    emptyAdmitTitle: "अभी कोई एडमिट कार्ड लिंक नहीं",
    emptyAdmitText: "एडमिट कार्ड जारी होने और Admin Panel में लिंक जोड़ने के बाद यहाँ दिखेगा।",
    jobsHeading: "नई नौकरियाँ",
    jobsIntro: "अपनी ज़रूरत के अनुसार खोजें और फ़िल्टर करें।",
    publishedLabel: "प्रकाशित",
    searchPlaceholder: "पद, विभाग या योग्यता खोजें",
    allLocations: "सभी स्थान",
    allCategories: "सभी श्रेणियाँ",
    emptyTitle: "अभी कोई मंज़ूर नौकरी नहीं",
    emptyText: "आधिकारिक भर्ती सूचना जाँचकर Admin Panel के ज़रिए जोड़ें।",
    savedHeading: "सेव की गई नौकरियाँ",
    savedIntro: "अपनी पसंद की नौकरियाँ यहाँ देखें।",
    emptySavedTitle: "अभी कोई नौकरी सेव नहीं की",
    emptySavedText: "नौकरी के कार्ड पर Save बटन दबाएँ।",
    footerText: "अंतिम और सही जानकारी के लिए भर्ती संस्था की आधिकारिक सूचना पर ही भरोसा करें।",
    save: "♡ सेव करें",
    unsave: "♥ सेव की गई",
    notification: "आधिकारिक नोटिफिकेशन ↗",
    applyOnline: "ऑनलाइन आवेदन ↗",
    admitCard: "रोल नंबर / एडमिट कार्ड डाउनलोड ↗",
    admitCardUnavailable: "एडमिट कार्ड अभी जारी नहीं हुआ",
    applyUnavailable: "सीधा आवेदन लिंक अभी उपलब्ध नहीं",
    deadline: "अंतिम तारीख़",
    location: "स्थान",
    eligibility: "योग्यता",
    checked: "जाँच की तारीख़",
    noResults: "इस खोज के लिए कोई नौकरी नहीं मिली।",
    pendingEmpty: "कोई लंबित नौकरी नहीं।",
    publishedEmpty: "अभी कुछ प्रकाशित नहीं हुआ।",
    pending: "लंबित",
    approve: "मंज़ूर करें",
    reject: "अस्वीकार करें",
    delete: "हटाएँ",
    submitted: "नौकरी लंबित सूची में सेव हो गई।",
    approved: "नौकरी प्रकाशित हो गई।",
    rejected: "नौकरी हटा दी गई।",
    savedToast: "नौकरी सेव की गई सूची में जोड़ दी गई।",
    removedToast: "सेव की गई सूची से हटा दी गई।",
    noDate: "नहीं दी गई",
    confirmReset: "क्या आप इस ब्राउज़र में सेव किया गया सारा डेमो जॉब डेटा मिटाना चाहते हैं?",
    resetDone: "डेमो डेटा मिटा दिया गया।"
  };
  Object.assign(translations, { hi: hindiTranslations });

  function t(key) {
    return translations[language][key] ||
      translations.en[key] ||
      key;
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function setLanguage(lang) {
    language = lang;

    document.documentElement.lang =
      lang === "pa" ? "pa" : lang === "hi" ? "hi" : "en";

    const map = {
      tagline: "tagline",
      eyebrow: "eyebrow",
      heroTitle: "heroTitle",
      heroText: "heroText",
      browseBtn: "browseBtn",
      noticeTitle: "noticeTitle",
      noticeText: "noticeText",
      homeTab: "homeTab",
      homeEyebrow: "homeEyebrow",
      homeHeading: "homeHeading",
      homeIntro: "homeIntro",
      homeBrowseBtn: "homeBrowseBtn",
      siteBookmarkBtn: "siteBookmarkBtn",
      homeJobsLabel: "homeJobsLabel",
      homeJobsHint: "homeJobsHint",
      homeAdmitLabel: "homeAdmitLabel",
      homeAdmitHint: "homeAdmitHint",
      homeSavedLabel: "homeSavedLabel",
      homeSavedHint: "homeSavedHint",
      homeTrustTitle: "homeTrustTitle",
      homeTrustText: "homeTrustText",
      benefitSearchTitle: "benefitSearchTitle",
      benefitSearchText: "benefitSearchText",
      benefitNoticeTitle: "benefitNoticeTitle",
      benefitNoticeText: "benefitNoticeText",
      benefitDeadlineTitle: "benefitDeadlineTitle",
      benefitDeadlineText: "benefitDeadlineText",
      benefitLanguageTitle: "benefitLanguageTitle",
      benefitLanguageText: "benefitLanguageText",
      jobsTab: "jobsTab",
      savedTab: "savedTab",
      admitTab: "admitTab",
      admitHeading: "admitHeading",
      admitIntro: "admitIntro",
      emptyAdmitTitle: "emptyAdmitTitle",
      emptyAdmitText: "emptyAdmitText",
      jobsHeading: "jobsHeading",
      jobsIntro: "jobsIntro",
      publishedLabel: "publishedLabel",
      emptyTitle: "emptyTitle",
      emptyText: "emptyText",
      savedHeading: "savedHeading",
      savedIntro: "savedIntro",
      emptySavedTitle: "emptySavedTitle",
      emptySavedText: "emptySavedText",
      footerText: "footerText"
    };

    Object.entries(map).forEach(([id, key]) => {
      setText(id, t(key));
    });

    if ($("langBtn")) {
      $("langBtn").textContent =
        lang === "pa" ? "English" : lang === "en" ? "हिन्दी" : "ਪੰਜਾਬੀ";
    }

    if ($("searchInput")) {
      $("searchInput").placeholder =
        t("searchPlaceholder");
    }

    if ($("locationFilter") &&
        $("locationFilter").options.length) {
      $("locationFilter").options[0].textContent =
        t("allLocations");
    }

    if ($("categoryFilter") &&
        $("categoryFilter").options.length) {
      $("categoryFilter").options[0].textContent =
        t("allCategories");
    }

    renderAll();
  }

  // Expose the three primary portal languages to the header selector.
  window.setPortalLanguage = setLanguage;

  function switchView(id) {
    const showJobSplit = id === "jobsView" || id === "privateJobsView";
    const splitLayout = $("jobsSplitLayout");
    if (splitLayout) splitLayout.classList.toggle("hidden", !showJobSplit);

    document.querySelectorAll(".view").forEach(view => {
      const isJobColumn = view.id === "jobsView" || view.id === "privateJobsView";
      view.classList.toggle("hidden", showJobSplit ? !isJobColumn : view.id !== id);
    });

    document.querySelectorAll(".tab").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.view === id
      );
    });

    if (id === "savedView") {
      renderSaved();
    }

    if (id === "privateJobsView") {
      renderPrivateJobs();
    }

    if (id === "admitView") {
      renderAdmitCards();
    }
    if (id === "resultsView") {
      renderResults();
    }
    if (id === "formsView") {
      renderForms();
    }

    if (id === "adminView") {
      renderAdmin();
    }

    // Keep navigation tabs useful: jump to the selected section after it is shown.
    const destination = $(id);
    if (destination) {
      destination.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function jobCard(job) {
    const isSaved = saved.includes(job.id);

    const notice = safeUrl(job.noticeUrl);
    const apply = safeUrl(job.applyUrl);
    const admitCard = safeUrl(job.admitCardUrl);

    return `
      <article class="job-card" id="job-${escapeHtml(job.id)}" data-state="${escapeHtml(getJobLocation(job))}" data-department="${escapeHtml(classifyJob(job))}">

        <div class="job-top">
          <span class="job-badge">
            ${escapeHtml(job.category || "Government")}
          </span>

          <span class="job-badge">
            ${job.status === "published"
              ? "Verified by admin"
              : ""}
          </span>
        </div>

        <h3>${escapeHtml(job.title)}</h3>

        <p class="job-dept">
          ${escapeHtml(job.department)}
        </p>

        <div class="job-facts">
          <div class="job-fact"><strong>Eligibility / ਯੋਗਤਾ</strong><span>${escapeHtml(job.eligibility || "Check official notification / ਨੋਟੀਫਿਕੇਸ਼ਨ ਵੇਖੋ")}</span></div>
          <div class="job-fact"><strong>Age Limit / ਉਮਰ ਹੱਦ</strong><span>${escapeHtml(job.ageLimit || "As per official notification / ਨੋਟੀਫਿਕੇਸ਼ਨ ਅਨੁਸਾਰ")}</span></div>
        </div>
        <p class="job-link-hint">ਪਹਿਲਾਂ Notification ਪੜ੍ਹੋ। ਯੋਗਤਾ ਪੂਰੀ ਹੋਵੇ ਤਾਂ Apply ਕਰੋ।</p>

        <div class="job-meta">
          <span>
            ⌖ ${escapeHtml(getJobLocation(job))}
          </span>

          <span>
            ◷ ${escapeHtml(t("deadline"))}: ${escapeHtml(displayDate(job.deadline) || t("noDate"))}
          </span>
        </div>

        <p class="job-meta">
          <span>
            ${escapeHtml(t("checked"))}:
            ${escapeHtml(
              displayDate(job.sourceChecked) || t("noDate")
            )}
          </span>
        </p>

        <details class="apply-help">
          <summary>ਫਾਰਮ ਕਿਵੇਂ ਭਰਨਾ ਹੈ? · How to apply</summary>
          <ol>
            <li>ਪਹਿਲਾਂ Official Notification ਖੋਲ੍ਹ ਕੇ ਯੋਗਤਾ, ਉਮਰ, ਫੀਸ ਅਤੇ ਆਖ਼ਰੀ ਮਿਤੀ ਪੜ੍ਹੋ।</li>
            <li>Apply Online ਦਬਾ ਕੇ ਸਰਕਾਰੀ ਭਰਤੀ ਪੋਰਟਲ ਖੋਲ੍ਹੋ।</li>
            <li>ਉੱਥੇ ਆਪਣਾ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਅਤੇ ਫਾਰਮ ਸਰਕਾਰੀ ਹਦਾਇਤਾਂ ਮੁਤਾਬਕ ਪੂਰਾ ਕਰੋ।</li>
            <li>ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼ ਅਤੇ ਫੀਸ ਸਿਰਫ਼ ਨੋਟੀਫਿਕੇਸ਼ਨ ਅਨੁਸਾਰ ਜਮ੍ਹਾਂ ਕਰੋ।</li>
            <li>Submit ਕਰਨ ਤੋਂ ਬਾਅਦ ਰਸੀਦ/ਐਪਲੀਕੇਸ਼ਨ ਨੰਬਰ ਸੰਭਾਲੋ।</li>
          </ol>
          <p>ਦਸਤਾਵੇਜ਼ ਨੌਕਰੀ ਅਨੁਸਾਰ ਵੱਖਰੇ ਹੁੰਦੇ ਹਨ—ਸਹੀ ਲਿਸਟ Official Notification ਵਿੱਚ ਵੇਖੋ। ਆਪਣਾ ਪਾਸਵਰਡ ਜਾਂ OTP ਕਿਸੇ ਨਾਲ ਸਾਂਝਾ ਨਾ ਕਰੋ।</p>
          <p class="apply-help-en">Read the official notice first. Complete the application only on the recruiting authority's official portal. Required documents and fees vary by vacancy.</p>
        </details>

        <div class="job-actions">

          ${
            notice
              ? `<a
                   class="apply-link watermark-notice-link"
                   href="${escapeHtml(notice)}"
                   target="_blank"
                   rel="noopener noreferrer">
                   📄 Notification ਪੜ੍ਹੋ
                 </a>`
              : ""
          }

          ${
            apply && apply !== notice
              ? `<a
                   class="apply-online-link"
                   data-job-id="${escapeHtml(job.id)}"
                   href="${escapeHtml(apply)}"
                   target="_blank"
                   rel="noopener noreferrer">
                   🟢 ਸਿੱਧਾ Apply ਕਰੋ
                 </a>`
              : ""
          }

          ${!apply || apply === notice ? `<span class="apply-unavailable">${escapeHtml(t("applyUnavailable"))}</span>` : ""}

          ${admitCard ? `<a class="admit-card-link" href="${escapeHtml(admitCard)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("admitCard"))}</a>` : `<span class="admit-card-unavailable" aria-disabled="true">${escapeHtml(t("admitCardUnavailable"))}</span>`}

          <button class="share-job-btn" type="button" data-share-job="${escapeHtml(job.id)}" aria-label="Share this job">↗ Share Job</button>

          <button
            class="save-btn"
            type="button"
            data-save="${escapeHtml(job.id)}">
            ${escapeHtml(
              isSaved ? t("unsave") : t("save")
            )}
          </button>

        </div>
      </article>
    `;
  }

  async function shareJobById(id) {
    const job = jobs.find(item => String(item.id) === String(id));
    if (!job) return;
    const url = new URL(window.location.href);
    url.hash = "job-" + String(job.id);
    const text = [
      job.title,
      job.department,
      job.eligibility ? "ਯੋਗਤਾ: " + job.eligibility : "",
      job.deadline ? "ਆਖਰੀ ਮਿਤੀ: " + displayDate(job.deadline) : "",
      "Official details ਅਤੇ apply link ਇੱਥੇ ਵੇਖੋ:"
    ].filter(Boolean).join("\n");
    const data = { title: job.title + " | Jaimalwala Govt Jobs", text, url: url.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        window.open("https://wa.me/?text=" + encodeURIComponent(text + "\n" + url.href), "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      if (error && error.name !== "AbortError") {
        window.open("https://wa.me/?text=" + encodeURIComponent(text + "\n" + url.href), "_blank", "noopener,noreferrer");
      }
    }
  }

  function attachSaveButtons(container) {
    if (!container) return;

    container
      .querySelectorAll("[data-share-job]")
      .forEach(button => {
        button.addEventListener("click", () => shareJobById(button.dataset.shareJob));
      });

    container
      .querySelectorAll("[data-save]")
      .forEach(button => {

        button.addEventListener("click", () => {

          const id = button.dataset.save;

          if (saved.includes(id)) {

            saved = saved.filter(
              item => item !== id
            );

            toast(t("removedToast"));

          } else {

            saved.push(id);

            toast(t("savedToast"));
          }

          write(KEYS.saved, saved);

          renderAll();
        });
      });
  }

  function getJobLocation(job) {
    const title = String(job.title || "").toLowerCase();
    const department = String(job.department || "").toLowerCase();
    const combined = title + " " + department;
    const explicitStates = [
      ["Jammu and Kashmir", /jammu\s*(and|&)\s*kashmir|jkssb/],
      ["Himachal Pradesh", /himachal\s*pradesh|hppsc/],
      ["Uttar Pradesh", /uttar\s*pradesh|upsssc|uppsc/],
      ["Madhya Pradesh", /madhya\s*pradesh|mpesb/],
      ["West Bengal", /west\s*bengal|wbpsc/],
      ["Andhra Pradesh", /andhra\s*pradesh/],
      ["Arunachal Pradesh", /arunachal\s*pradesh/],
      ["Punjab", /\bpunjab\b|ppsc|sssc\/pb/],
      ["Haryana", /\bharyana\b|hssc|sssc\/hr/],
      ["Rajasthan", /\brajasthan\b|rssb/],
      ["Uttarakhand", /uttarakhand|uksssc/],
      ["Chandigarh", /\bchandigarh\b|rrb chandigarh/],
      ["Delhi", /\bdelhi\b|dsssb/],
      ["Maharashtra", /maharashtra/], ["Gujarat", /gujarat|gpsc/],
      ["Bihar", /\bbihar\b|bpsc/], ["Odisha", /odisha|opsc/],
      ["Jharkhand", /jharkhand/], ["Chhattisgarh", /chhattisgarh/],
      ["Telangana", /telangana/], ["Karnataka", /karnataka/],
      ["Tamil Nadu", /tamil\s*nadu/], ["Kerala", /kerala/],
      ["Goa", /\bgoa\b/], ["Assam", /assam/], ["Sikkim", /sikkim/],
      ["Nagaland", /nagaland/], ["Manipur", /manipur/],
      ["Mizoram", /mizoram/], ["Tripura", /tripura/],
      ["Meghalaya", /meghalaya/]
    ];
    for (const [state, pattern] of explicitStates) {
      if (pattern.test(title) || pattern.test(department)) return state;
    }
    return String(job.location || "All India").trim();
  }

  function classifyJob(job) {
    const text = [job.title, job.department, job.eligibility, job.category].join(" ").toLowerCase();
    if (/railway|\brrc\b|\brrb\b|locomotive|railway protection force|\brpf\b/.test(text)) return "Railway";
    if (/bank|ibps|sbi|rbi|probationary officer|bank officer|bank assistant/.test(text)) return "Banking";
    if (/b\.tech|btech|b\.e\b|bachelor of engineering|engineer|engineering|junior engineer|assistant engineer|\bje\b|\bae\b|diploma engineer/.test(text)) return "Engineering";
    if (/police|constable|sub inspector|\bsi\b|\basi\b|head constable/.test(text)) return "Police";
    if (/teacher|teaching|lecturer|professor|school education|\bptet\b|\btet\b|\bctet\b/.test(text)) return "Teaching";
    if (/defence|army|navy|air force|\bagniveer\b|\bdrdo\b/.test(text)) return "Defence";
    if (/medical|health|nurse|nursing|doctor|pharmacist|lab technician|\bnhm\b|hospital/.test(text)) return "Medical";
    if (/court|judicial|judiciary|stenographer|judicial services|subordinate courts/.test(text)) return "Courts";
    if (/agriculture|agricultural|horticulture|veterinary|animal husbandry/.test(text)) return "Agriculture";
    if (/software|developer|programmer|computer|information technology|\bit officer\b|data entry|cyber|network engineer/.test(text)) return "IT";
    return "Other";
  }

  function renderJobs() {
    if (!$("jobsDirectory")) return;
    const published = jobs.filter(job =>
      job.status === "published" &&
      !["private jobs", "results", "admit cards", "forms / admissions"].includes(String(job.category || "").toLowerCase())
    );
    const cards = published.map(jobCard).join("");
    $("jobsDirectory").innerHTML =
      '<section class="directory-group"><h2 class="directory-group-title">All Government Jobs <span class="directory-result-count">' +
      published.length + ' opportunities</span></h2><div class="jobs-grid">' + cards + '</div></section>';
    if ($("publishedCount")) $("publishedCount").textContent = published.length;
    if ($("emptyJobs")) $("emptyJobs").classList.toggle("hidden", published.length > 0);
    attachSaveButtons($("jobsDirectory"));
  }

  function renderPrivateJobs() {
    if (!$("privateJobsList")) return;

    const items = jobs.filter(job =>
      job.status === "published" &&
      isDeadlineActive(job) &&
      String(job.category || "").toLowerCase() === "private jobs"
    );

    $("privateJobsList").innerHTML = items.map(jobCard).join("");

    if ($("privateJobsCount")) {
      $("privateJobsCount").textContent = String(items.length);
    }
    if ($("emptyPrivateJobs")) {
      $("emptyPrivateJobs").classList.toggle("hidden", items.length > 0);
    }

    attachSaveButtons($("privateJobsList"));
  }

  function renderSaved() {
    if (!$("savedList")) return;

    const items = jobs.filter(job =>
      saved.includes(job.id) &&
      job.status === "published"
    );

    $("savedList").innerHTML =
      items.map(jobCard).join("");

    if ($("emptySaved")) {
      $("emptySaved").classList.toggle(
        "hidden",
        items.length > 0
      );
    }

    attachSaveButtons($("savedList"));
  }

  function renderAdmitCards() {
    if (!$("admitList")) return;
    const items = jobs.filter(job =>
      job.status === "published" &&
      (safeUrl(job.admitCardUrl) || String(job.category || "").toLowerCase() === "admit cards")
    );
    $("admitList").innerHTML = items.map(jobCard).join("");
    if ($("emptyAdmit")) $("emptyAdmit").classList.toggle("hidden", items.length > 0);
    attachSaveButtons($("admitList"));
  }

  function renderResults() {
    if (!$("resultsList")) return;
    const items = jobs.filter(job => job.status === "published" && String(job.category || "").toLowerCase() === "results");
    $("resultsList").innerHTML = items.map(jobCard).join("");
    if ($("emptyResults")) $("emptyResults").classList.toggle("hidden", items.length > 0);
    if ($("resultsCount")) $("resultsCount").textContent = String(items.length);
    attachSaveButtons($("resultsList"));
  }

  function renderForms() {
    if (!$("dynamicFormsList")) return;
    const items = jobs.filter(job => job.status === "published" && String(job.category || "").toLowerCase() === "forms / admissions");
    $("dynamicFormsList").innerHTML = items.map(jobCard).join("");
    if ($("dynamicFormsCount")) $("dynamicFormsCount").textContent = String(items.length);
    attachSaveButtons($("dynamicFormsList"));
  }

  function renderAdmin() {
    if (!$("pendingList")) return;

    const pendingAll = jobs.filter(
      job => job.status === "pending"
    );

    const filter = $("pendingCategoryFilter")?.value || "all";
    const isAdmitItem = job =>
      String(job.category || "").toLowerCase() === "admit cards" ||
      Boolean(job.admitCardUrl) ||
      /admit.?card|hall ticket|roll number|exam city slip/i.test(String(job.title || ""));
    const isResultItem = job =>
      String(job.category || "").toLowerCase() === "results" ||
      /\bresult(s)?\b|merit list|selection list|score ?card|marks list/i.test(String(job.title || ""));
    const isFormItem = job =>
      String(job.category || "").toLowerCase() === "forms / admissions" ||
      /admission|application form|online form|counselling|counseling|prospectus/i.test(String(job.title || ""));
    const isPrivateItem = job =>
      String(job.category || "").toLowerCase() === "private jobs";
    const reviewCategory = job => {
      if (isAdmitItem(job)) return "Admit Cards / Roll Numbers";
      if (isResultItem(job)) return "Results";
      if (isFormItem(job)) return "Forms / Admissions";
      if (isPrivateItem(job)) return "Private Jobs";
      return "Job Notification";
    };
    const pending = pendingAll.filter(job => {
      if (filter === "all") return true;
      if (filter === "admit") return isAdmitItem(job);
      if (filter === "results") return isResultItem(job);
      if (filter === "forms") return isFormItem(job);
      if (filter === "private") return isPrivateItem(job);
      if (filter === "jobs") return !isAdmitItem(job) && !isResultItem(job) && !isFormItem(job) && !isPrivateItem(job);
      return true;
    });

    const published = jobs.filter(
      job => job.status === "published"
    );

    if ($("pendingCount")) {
      $("pendingCount").textContent =
        filter === "all" ? pendingAll.length : pending.length;
    }

    if ($("adminPublishedCount")) {
      $("adminPublishedCount").textContent =
        published.length;
    }

    $("pendingList").innerHTML =
      pending.length
        ? pending.map(job => `
            <div class="pending-card">

              <strong>
                ${escapeHtml(job.title)}
              </strong>

              <p>
                ${escapeHtml(job.department)}
                ·
                ${escapeHtml(job.location)}
              </p>

              <p class="review-category"><strong>Review type:</strong> ${escapeHtml(reviewCategory(job))}</p>

              <p>
                Official notice:
                <a
                  href="${escapeHtml(
                    safeUrl(job.noticeUrl)
                  )}"
                  target="_blank"
                  rel="noopener noreferrer">
                  Open link ↗
                </a>
              </p>

              <div class="pending-actions">

                <button
                  class="approve"
                  data-approve="${escapeHtml(job.id)}">
                  ${escapeHtml(t("approve"))}
                </button>

                <button
                  class="reject"
                  data-reject="${escapeHtml(job.id)}">
                  ${escapeHtml(t("reject"))}
                </button>

              </div>

            </div>
          `).join("")
        : `<p class="tiny-empty">
             ${escapeHtml(t("pendingEmpty"))}
           </p>`;

    $("adminPublishedList").innerHTML =
      published.length
        ? published.map(job => `
            <div class="pending-card">

              <strong>
                ${escapeHtml(job.title)}
              </strong>

              <p>
                ${escapeHtml(job.department)}
                ·
                ${escapeHtml(
                  displayDate(job.deadline) || t("noDate")
                )}
              </p>

              <div class="pending-actions">

                <button
                  class="reject"
                  data-delete="${escapeHtml(job.id)}">
                  ${escapeHtml(t("delete"))}
                </button>

              </div>

            </div>
          `).join("")
        : `<p class="tiny-empty">
             ${escapeHtml(t("publishedEmpty"))}
           </p>`;

    $("pendingList")
      .querySelectorAll("[data-approve]")
      .forEach(button => {

        button.addEventListener("click", () => {

          changeStatus(
            button.dataset.approve,
            "published"
          );
        });
      });

    $("pendingList")
      .querySelectorAll("[data-reject]")
      .forEach(button => {

        button.addEventListener("click", () => {

          removeJob(
            button.dataset.reject
          );
        });
      });

    $("adminPublishedList")
      .querySelectorAll("[data-delete]")
      .forEach(button => {

        button.addEventListener("click", () => {

          removeJob(
            button.dataset.delete
          );
        });
      });
  }

  async function changeStatus(id, status) {
    try {
      if (!adminUser || !accessToken) throw new Error("Admin sign-in required.");
      await supa("/rest/v1/jobs?id=eq." + encodeURIComponent(id), {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status })
      }, true);
      await loadCloudJobs();
      toast(status === "published" ? t("approved") : t("submitted"));
    } catch (error) { toast("Update failed: " + error.message); }
  }

  async function removeJob(id) {
    try {
      if (!adminUser || !accessToken) throw new Error("Admin sign-in required.");
      await supa("/rest/v1/jobs?id=eq." + encodeURIComponent(id), {
        method: "DELETE", headers: { Prefer: "return=minimal" }
      }, true);
      saved = saved.filter(item => item !== id);
      persist();
      await loadCloudJobs();
      toast(t("rejected"));
    } catch (error) { toast("Delete failed: " + error.message); }
  }

  // Two live scrolling ticker lines, sourced only from admin-published records.
  function renderLatestJobTicker() {
    const governmentTrack = $("governmentTickerTrack");
    const privateTrack = $("privateTickerTrack");
    if (!governmentTrack || !privateTrack) return;

    const published = jobs.filter(job => job.status === "published");
    const isPrivate = job => String(job.category || "").toLowerCase() === "private jobs";
    const isGovernment = job => !isPrivate(job) &&
      !["results", "admit cards", "forms / admissions"].includes(String(job.category || "").toLowerCase());

    const makeItems = (items, emptyText, target) => {
      const latest = items.slice(0, 10);
      if (!latest.length) {
        target.innerHTML = '<span class="ticker-empty">' + escapeHtml(emptyText) + '</span>';
        target.classList.remove("ticker-moving");
        return;
      }
      const markup = latest.map(job =>
        '<a class="ticker-item" href="' + (isPrivate(job) ? '#privateJobsView' : '#jobsView') +
        '" title="' + escapeHtml(job.title || "Job update") + '">' +
        '<span aria-hidden="true">✦</span> ' + escapeHtml(job.title || "New job update") + '</a>'
      ).join('<span class="ticker-separator" aria-hidden="true">•</span>');
      target.innerHTML = '<span class="ticker-sequence">' + markup + '</span><span class="ticker-sequence" aria-hidden="true">' + markup + '</span>';
      target.classList.toggle("ticker-moving", latest.length > 1);
    };

    makeItems(published.filter(isGovernment), "ਨਵੀਆਂ ਸਰਕਾਰੀ ਨੌਕਰੀਆਂ ਦੀ ਜਾਣਕਾਰੀ ਜਲਦੀ ਅੱਪਡੇਟ ਹੋਵੇਗੀ।", governmentTrack);
    makeItems(published.filter(isPrivate), "ਨਵੀਆਂ ਪ੍ਰਾਈਵੇਟ ਨੌਕਰੀਆਂ ਜਲਦੀ ਇੱਥੇ ਦਿਖਣਗੀਆਂ।", privateTrack);
  }

  function renderAll() {
    renderLatestJobTicker();

    if ($("savedNavCount")) {
      $("savedNavCount").textContent =
        jobs.filter(job =>
          job.status === "published" &&
          saved.includes(job.id)
        ).length;
    }

    renderJobs();
    renderPrivateJobs();
    renderSaved();
    renderAdmitCards();
    renderResults();
    renderForms();
    renderAdmin();

    const sharedJobId = decodeURIComponent((window.location.hash || "").replace(/^#job-/, ""));
    if (window.location.hash.startsWith("#job-") && sharedJobId) {
      window.setTimeout(() => {
        const target = document.getElementById("job-" + sharedJobId);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    }
  }

  /*
   * AUTOMATIC GOVERNMENT JOB LOADER
   *
   * GitHub Actions creates:
   * data/pending_jobs.json
   *
   * This function reads that file and
   * adds new official sources to the
   * Pending section.
   */

  async function loadAutomaticJobs(showResult = false) {
    // Import discovered official-page links only into the admin review queue.
    // Never auto-publish: every candidate stays pending until the admin approves it.
    if (!adminUser || !accessToken) return;
    try {
      const dataUrl = new URL("./data/pending_jobs.json", document.baseURI);
      const response = await fetch(dataUrl.href + "?v=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("Job candidate feed request failed: " + response.status);
      const candidates = await response.json();
      if (!Array.isArray(candidates)) throw new Error("Job candidate feed is not a list.");

      const existingUrls = new Set(jobs.map(job => safeUrl(job.noticeUrl)).filter(Boolean));
      const seen = new Set();
      const rows = [];
      const today = localDateString();
      const hash = (value) => {
        let h = 2166136261;
        for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
        return (h >>> 0).toString(16);
      };

      for (const item of candidates) {
        // Import only fresh records from the new scheduled scanner.
        // Older JSON entries are intentionally ignored because they may be stale.
        if (!item || !item.title || !item.url || !item.sourceChecked || item.needsReview !== true) continue;
        // Ignore stale feed entries if a scheduled scan has stopped updating the candidate file.
        const checkedAt = Date.parse(String(item.sourceChecked) + "T00:00:00Z");
        const ageDays = (Date.now() - checkedAt) / 86400000;
        if (!Number.isFinite(checkedAt) || ageDays > 3 || ageDays < -1) continue;
        const titleForReview = String(item.title);
        if (/syllabus|shortlist|interview schedule|corrigendum|tender|auction|calendar|press release|annual report|objection|proposed answers|recruitment requisition/i.test(titleForReview)) continue;
        if (/^(recruitment|career|careers|career tools(?: & learning)?|career article|career schemes|career guidance|web advertisement|job opportunities|current openings|view all jobs|all jobs|advertisements)$/i.test(titleForReview.trim())) continue;
        const inferredType = item.noticeType || (/result|merit list|selection list|score ?card|marks list|answer key/i.test(titleForReview) ? "result" : /admit.?card|hall ticket|call letter|roll number|exam city slip/i.test(titleForReview) ? "admit_card" : /admission|entrance test|entrance examination|application form|online form|counselling|counseling|prospectus|neet|jee main|cuet/i.test(titleForReview) ? "form" : "job");
        if (inferredType === "job" && String(item.category || "").toLowerCase() !== "private jobs" && !/recruit|vacanc|advertisement|advt\.?\s*(no\.?|number)|apply online|career|posts? of|job opening|employment notice|centralised employment notice|\bCEN\s*\d|group[- ]?[CD]\b/i.test(titleForReview)) continue;
        const noticeUrl = safeUrl(item.url);
        if (!noticeUrl || existingUrls.has(noticeUrl) || seen.has(noticeUrl)) continue;
        seen.add(noticeUrl);
        const source = String(item.source || "Government").replace(/[^a-z0-9]/gi, "").slice(0, 18) || "Gov";
        rows.push({
          id: "auto-" + source + "-" + hash(noticeUrl),
          title: String(item.title).slice(0, 240),
          department: String(item.department || item.source || "Government department").slice(0, 240),
          location: item.location || "All India",
          category: inferredType === "result" ? "Results" : inferredType === "admit_card" ? "Admit Cards" : inferredType === "form" ? "Forms / Admissions" : (item.category || "Other"),
          eligibility: item.eligibility || "Auto-discovered candidate. Read the official notice and verify eligibility, dates and application link before publishing.",
          deadline: item.deadline || null,
          notice_url: noticeUrl,
          apply_url: safeUrl(item.applyUrl || (inferredType === "form" ? item.url : "")) || null,
          admit_card_url: safeUrl(item.admitCardUrl || (inferredType === "admit_card" ? item.url : "")) || null,
          source_checked: item.sourceChecked || today,
          status: "pending"
        });
      }

      if (rows.length) {
        await supa("/rest/v1/jobs?on_conflict=id", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify(rows)
        }, true);
        await loadCloudJobs();
        toast(rows.length + " job candidates added to Pending. Verify the official notice before approval.");
      } else {
        renderAdmin();
        if (showResult) {
          toast("No new candidates to add. Feed contains " + candidates.length + " candidate(s); check the scanner run and whether notices are already in Pending.");
        }
      }
      console.log("Official-page candidates checked:", candidates.length, "new rows:", rows.length);
      return { checked: candidates.length, added: rows.length };
    } catch (error) {
      console.error("Automatic candidate import failed:", error);
      toast("Could not load automatic job candidates: " + error.message);
    }
  }

  /* Navigation */

  document
    .querySelectorAll(".tab")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => switchView(button.dataset.view)
      );
    });

  /* Make every jobs shortcut switch views and scroll reliably. */
  document.querySelectorAll('a[href="#jobsView"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      switchView("jobsView");
      $("jobsView")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* Help visitors bookmark this website in their browser */
  if ($("siteBookmarkBtn")) {
    $("siteBookmarkBtn").addEventListener("click", () => {
      toast(language === "pa"
        ? "⭐ To bookmark this website, press Ctrl + D and confirm."
        : "⭐ Press Ctrl + D to bookmark this website, then choose Done.");
    });
  }

  /* Home dashboard shortcuts */
  document.querySelectorAll("[data-home-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.homeView;
      switchView(view);
      $(view)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* Homepage feature shortcuts: delegated so the cards keep working reliably */
  document.querySelectorAll("[data-benefit]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.benefit;

    if (action === "search") {
      switchView("jobsView");
      $("jobsView")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => $("searchInput")?.focus(), 350);
      return;
    }

    if (action === "notice") {
      switchView("jobsView");
      $("jobsView")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        const firstNotice = $("jobsList")?.querySelector(".apply-link");
        if (firstNotice) {
          firstNotice.focus({ preventScroll: true });
          firstNotice.click();
        } else {
          toast(language === "pa"
            ? "No approved jobs yet. Verified official notices will appear here."
            : "No approved jobs yet. Official notifications will appear here.");
        }
      }, 350);
      return;
    }

    if (action === "deadline") {
      deadlineSort = !deadlineSort;
      switchView("jobsView");
      renderJobs();
      $("jobsView")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast(language === "pa"
        ? (deadlineSort ? "Jobs sorted by application deadline." : "Jobs returned to the default order.")
        : (deadlineSort ? "Jobs sorted by closing date." : "Default job order restored."));
      return;
    }

      if (action === "language") {
        const nextLanguage = language === "en" ? "pa" : "en";
        setLanguage(nextLanguage);
        toast(nextLanguage === "pa" ? "Punjabi selected." : "English selected.");
      }
    });
  });

  /* Language */

  if ($("langBtn")) {

    $("langBtn").addEventListener(
      "click",
      () => {

        setLanguage(
          language === "en" ? "pa" : "en"
        );
      }
    );
  }

  /* Search */

  if ($("searchInput")) {

    $("searchInput").addEventListener(
      "input",
      renderJobs
    );
  }

  if ($("locationFilter")) {

    $("locationFilter").addEventListener(
      "change",
      renderJobs
    );
  }

  if ($("categoryFilter")) {

    $("categoryFilter").addEventListener(
      "change",
      renderJobs
    );
  }

  if ($("pendingCategoryFilter")) {
    $("pendingCategoryFilter").addEventListener("change", renderAdmin);
  }

  /* Manual Job Form */

  if ($("jobForm")) {

    $("jobForm").addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const noticeUrl =
          safeUrl(
            $("noticeUrl").value.trim()
          );

        const applyValue =
          $("applyUrl").value.trim();

        const applyUrl =
          applyValue
            ? safeUrl(applyValue)
            : "";

        const admitCardValue =
          $("admitCardUrl").value.trim();

        const admitCardUrl =
          admitCardValue
            ? safeUrl(admitCardValue)
            : "";

        if (
          !noticeUrl ||
          (applyValue && !applyUrl) ||
          (admitCardValue && !admitCardUrl)
        ) {

          toast(
            "Please enter valid http/https links."
          );

          return;
        }

        const sourceChecked =
          $("sourceChecked").value;
        const deadline = $("deadline").value;

        if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
          toast("Please select a valid last date.");
          return;
        }

        if (deadline && deadline < localDateString()) {
          const proceed = window.confirm("The last date is in the past. Save this job anyway?");
          if (!proceed) return;
        }

        if (!sourceChecked) {

          toast(
            "Please enter the date you checked the official notice."
          );

          return;
        }

        const job = {

          id:
            window.crypto &&
            crypto.randomUUID
              ? crypto.randomUUID()
              : String(Date.now()) +
                Math.random()
                  .toString(16)
                  .slice(2),

          title:
            $("jobTitle").value.trim(),

          department:
            $("department").value.trim(),

          location:
            $("location").value,

          category:
            $("category").value,

          eligibility:
            $("eligibility").value.trim(),

          ageLimit:
            $("ageLimit").value.trim(),

          deadline:
            deadline,

          noticeUrl:
            noticeUrl,

          applyUrl:
            applyUrl,

          admitCardUrl:
            admitCardUrl,

          sourceChecked:
            sourceChecked,

          status:
            "pending"
        };

        try {
          if (!adminUser || !accessToken) throw new Error("Admin sign-in required.");
          await supa("/rest/v1/jobs", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(jobRow(job)) }, true);
        } catch (error) {
          toast("Could not save the job: " + error.message);
          return;
        }

        $("jobForm").reset();

        if ($("sourceChecked")) {

          $("sourceChecked").value =
            localDateString();
        }

        await loadCloudJobs();

        toast(t("submitted"));
      }
    );
  }

  /* Reset */

  if ($("resetBtn")) {

    $("resetBtn").addEventListener(
      "click",
      () => {

        if (
          window.confirm(
            t("confirmReset")
          )
        ) {

          jobs = [];
          saved = [];

          persist();
          renderAll();

          toast(t("resetDone"));
        }
      }
    );
  }

  /* Footer year */

  if ($("year")) {
    $("year").textContent =
      new Date().getFullYear();
  }

  /* Date */

  if ($("sourceChecked")) {

    $("sourceChecked").value =
      localDateString();
  }

  // Record a privacy-conscious Apply Online click in the existing analytics table.
  // The database stores only a random browser key, date and job ID path; no personal details.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a.apply-online-link");
    if (!link) return;
    const jobId = String(link.dataset.jobId || "unknown").slice(0, 180);
    supa("/rest/v1/rpc/record_site_visit", {
      method: "POST",
      body: JSON.stringify({
        p_visitor_key: getVisitorKey(),
        p_visit_date: localDateString(),
        p_page_path: "/apply-click/" + encodeURIComponent(jobId)
      })
    }).catch(error => console.warn("Apply click analytics could not be recorded:", error));
  });

  /* Start website */

  const primaryLanguagePicker = $("siteLanguage");
  if (primaryLanguagePicker) {
    primaryLanguagePicker.addEventListener("change", () => {
      const googlePicker = document.querySelector(".goog-te-combo");
      if (googlePicker) {
        // Translate the complete page, not only the built-in text labels.
        googlePicker.value = primaryLanguagePicker.value === "en" ? "" : primaryLanguagePicker.value;
        googlePicker.dispatchEvent(new Event("change"));
        document.documentElement.lang = primaryLanguagePicker.value;
      } else {
        // Keep the built-in translations available if the Google widget is blocked.
        setLanguage(primaryLanguagePicker.value);
      }
    });
  }

  setLanguage("en");
  recordSiteVisit();
  const refreshAnalyticsButton = $("refreshAnalyticsBtn");
  if (refreshAnalyticsButton) refreshAnalyticsButton.addEventListener("click", loadPrivateAnalytics);

  const refreshCandidatesButton = $("refreshCandidatesBtn");
  if (refreshCandidatesButton) {
    refreshCandidatesButton.addEventListener("click", async () => {
      if (!adminUser || !accessToken) {
        toast("Please sign in to the Admin Panel first.");
        return;
      }
      refreshCandidatesButton.disabled = true;
      refreshCandidatesButton.textContent = "Checking…";
      try {
        await loadAutomaticJobs(true);
      } finally {
        refreshCandidatesButton.disabled = false;
        refreshCandidatesButton.textContent = "Import Latest Scan Results";
      }
    });
  }

  /* Load shared jobs from Supabase, not browser-local demo data. */
  initializeCloud();

})();


// Branded copies of supported official PDF notices; original source remains linked.
document.addEventListener("click", async function(event){
  const link = event.target.closest("a.watermark-notice-link");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const sourceUrl = link.href;
  if (!/^https:\/\//i.test(sourceUrl)) return;
  event.preventDefault(); const oldText = link.textContent; link.textContent = "Preparing branded copy…";
  try {
    const response = await fetch("https://kbebdetnhfkxnkpdiefd.supabase.co/functions/v1/watermark-notice", {method:"POST",headers:{"Content-Type":"application/json","apikey":"sb_publishable_51mCCN-NaaylwYSnLyFk2Q_Uovo2lY_"},body:JSON.stringify({url:sourceUrl})});
    if (!response.ok) throw new Error("Watermark unavailable");
    const blob = await response.blob(); if (blob.type !== "application/pdf") throw new Error("Not a PDF");
    const objectUrl=URL.createObjectURL(blob), a=document.createElement("a"); a.href=objectUrl; a.download="Jaimalwala-Govt-Jobs-Notice.pdf"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
  } catch (_) { window.open(sourceUrl,"_blank","noopener,noreferrer"); if(typeof toast==="function") toast("ਇਸ ਨੋਟੀਫਿਕੇਸ਼ਨ ਦੀ branded copy ਨਹੀਂ ਬਣ ਸਕੀ; ਅਸਲ ਨੋਟੀਫਿਕੇਸ਼ਨ ਖੋਲ੍ਹ ਦਿੱਤਾ ਹੈ।"); }
  finally { link.textContent=oldText; }
}, true);

// Accessible site-wide text size controls (persist for this browser).
(function setupFontSizeControls(){
  const key = "jg_font_scale_v1";
  const allowed = [1, 1.1, 1.2];
  let scale = 1;
  try { const saved = Number(localStorage.getItem(key)); if (allowed.includes(saved)) scale = saved; } catch (_) {}
  function apply(){ document.documentElement.style.setProperty("--site-font-scale", String(scale)); document.body.style.zoom = String(scale); }
  document.addEventListener("DOMContentLoaded", function(){
    apply();
    const smaller = document.getElementById("fontSmaller");
    const reset = document.getElementById("fontReset");
    const larger = document.getElementById("fontLarger");
    if (smaller) smaller.addEventListener("click", function(){ scale = allowed[Math.max(0, allowed.indexOf(scale)-1)]; apply(); try{localStorage.setItem(key,String(scale));}catch(_){} });
    if (reset) reset.addEventListener("click", function(){ scale = 1; apply(); try{localStorage.setItem(key,String(scale));}catch(_){} });
    if (larger) larger.addEventListener("click", function(){ scale = allowed[Math.min(allowed.length-1, allowed.indexOf(scale)+1)]; apply(); try{localStorage.setItem(key,String(scale));}catch(_){} });
  });
})();

 
// Persistent theme selector: blue (default), green, or dark.
(function setupThemeSelector(){
  const key = "jg_theme_v1";
  const valid = ["blue", "green", "dark", "midnight", "royal"];
  function apply(theme){
    const selected = valid.includes(theme) ? theme : "blue";
    document.documentElement.dataset.theme = selected;
    const picker = document.getElementById("themeSelect");
    if (picker) picker.value = selected;
    try { localStorage.setItem(key, selected); } catch (_) {}
  }
  function init(){
    let saved = "blue";
    try { saved = localStorage.getItem(key) || "blue"; } catch (_) {}
    apply(saved);
    const picker = document.getElementById("themeSelect");
    if (picker) picker.addEventListener("change", () => apply(picker.value));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
