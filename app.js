(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const KEYS = {
    jobs: "jg_jobs_v1",
    saved: "jg_saved_v1"
  };

  let language = "pa";
  let jobs = read(KEYS.jobs, []).filter(job => !/official jobs\/notifications/i.test(String(job?.title || "")));
  let saved = read(KEYS.saved, []);

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
    write(KEYS.jobs, jobs);
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
        "ਇਹ ਵੈੱਬਸਾਈਟ ਸ਼ੁਰੂਆਤੀ ਵਰਜਨ ਹੈ। ਹਰ ਨੌਕਰੀ ਲਈ official notification ਅਤੇ last date ਖੁਦ verify ਕਰੋ।",
      jobsTab: "ਨੌਕਰੀਆਂ",
      savedTab: "ਸੇਵ ਕੀਤੀਆਂ",
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
        "This website is an early version. Always verify the official notification and deadline.",
      jobsTab: "Jobs",
      savedTab: "Saved",
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
      lang === "pa" ? "pa" : "en";

    const map = {
      tagline: "tagline",
      eyebrow: "eyebrow",
      heroTitle: "heroTitle",
      heroText: "heroText",
      browseBtn: "browseBtn",
      noticeTitle: "noticeTitle",
      noticeText: "noticeText",
      jobsTab: "jobsTab",
      savedTab: "savedTab",
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
        lang === "pa" ? "English" : "ਪੰਜਾਬੀ";
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

  function switchView(id) {
    document.querySelectorAll(".view").forEach(view => {
      view.classList.toggle(
        "hidden",
        view.id !== id
      );
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

    if (id === "adminView") {
      renderAdmin();
    }
  }

  function jobCard(job) {
    const isSaved = saved.includes(job.id);

    const notice = safeUrl(job.noticeUrl);
    const apply = safeUrl(job.applyUrl);

    return `
      <article class="job-card">

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

        <div class="job-meta">
          <span>
            ⌖ ${escapeHtml(job.location || "India")}
          </span>

          <span>
            ◷ ${escapeHtml(t("deadline"))}: ${escapeHtml(job.deadline || t("noDate"))}
          </span>
        </div>

        ${
          job.eligibility
            ? `<p class="job-description">
                ${escapeHtml(job.eligibility)}
               </p>`
            : ""
        }

        <p class="job-meta">
          <span>
            ${escapeHtml(t("checked"))}:
            ${escapeHtml(
              job.sourceChecked || t("noDate")
            )}
          </span>
        </p>

        <div class="job-actions">

          ${
            notice
              ? `<a
                   class="apply-link"
                   href="${escapeHtml(notice)}"
                   target="_blank"
                   rel="noopener noreferrer">
                   ${escapeHtml(t("notification"))}
                 </a>`
              : ""
          }

          ${
            apply && apply !== notice
              ? `<a
                   href="${escapeHtml(apply)}"
                   target="_blank"
                   rel="noopener noreferrer">
                   ${escapeHtml(t("applyOnline"))}
                 </a>`
              : ""
          }

          ${!apply || apply === notice ? `<span class="apply-unavailable">${escapeHtml(t("applyUnavailable"))}</span>` : ""}

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

  function attachSaveButtons(container) {
    if (!container) return;

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

  function renderJobs() {
    if (!$("jobsList")) return;

    const q =
      $("searchInput")
        ? $("searchInput").value.trim().toLowerCase()
        : "";

    const loc =
      $("locationFilter")
        ? $("locationFilter").value
        : "";

    const cat =
      $("categoryFilter")
        ? $("categoryFilter").value
        : "";

    const visible = jobs
      .filter(job => job.status === "published")
      .filter(job => {

        const text = [
          job.title,
          job.department,
          job.eligibility,
          job.location,
          job.category
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!q || text.includes(q)) &&
          (!loc || job.location === loc) &&
          (!cat || job.category === cat)
        );
      });

    if ($("publishedCount")) {
      $("publishedCount").textContent =
        jobs.filter(
          job => job.status === "published"
        ).length;
    }

    $("jobsList").innerHTML =
      visible.map(jobCard).join("");

    if ($("emptyJobs")) {
      $("emptyJobs").classList.toggle(
        "hidden",
        visible.length > 0
      );
    }

    if (!visible.length && $("emptyText")) {
      setText(
        "emptyText",
        q || loc || cat
          ? t("noResults")
          : t("emptyText")
      );
    }

    attachSaveButtons($("jobsList"));
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

  function renderAdmin() {
    if (!$("pendingList")) return;

    const pending = jobs.filter(
      job => job.status === "pending"
    );

    const published = jobs.filter(
      job => job.status === "published"
    );

    if ($("pendingCount")) {
      $("pendingCount").textContent =
        pending.length;
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
                  job.deadline || t("noDate")
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

  function changeStatus(id, status) {

    jobs = jobs.map(job =>
      job.id === id
        ? { ...job, status }
        : job
    );

    persist();
    renderAll();

    toast(
      status === "published"
        ? t("approved")
        : t("submitted")
    );
  }

  function removeJob(id) {

    jobs = jobs.filter(
      job => job.id !== id
    );

    saved = saved.filter(
      item => item !== id
    );

    persist();
    renderAll();

    toast(t("rejected"));
  }

  function renderAll() {

    if ($("savedNavCount")) {
      $("savedNavCount").textContent =
        jobs.filter(job =>
          job.status === "published" &&
          saved.includes(job.id)
        ).length;
    }

    renderJobs();
    renderSaved();
    renderAdmin();
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

  async function loadAutomaticJobs() {

    try {

      const response = await fetch(
        "./data/pending_jobs.json",
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        console.log(
          "pending_jobs.json could not be loaded."
        );
        return;
      }

      const candidates = await response.json();

      if (!Array.isArray(candidates)) {
        console.log(
          "pending_jobs.json is not an array."
        );
        return;
      }

      let changed = false;

      candidates.forEach(item => {

        if (!item || !item.url || !item.title || /official jobs\/notifications/i.test(item.title)) return;

        const source =
          item.source || "Government";

        const id =
          "auto-" +
          source +
          "-" +
          item.url;

        const exists =
          jobs.some(job => job.id === id);

        if (!exists) {

          jobs.unshift({

            id: id,

            title:
              item.title,

            department:
              item.department || source,

            location:
              item.location || "India",

            category:
              item.category || "Other",

            eligibility:
              item.eligibility || "Eligibility ਅਤੇ ਹੋਰ ਸ਼ਰਤਾਂ ਲਈ official notification ਪੜ੍ਹੋ।",

            deadline:
              item.deadline || "",

            noticeUrl:
              safeUrl(item.url),

            applyUrl:
              safeUrl(item.applyUrl),

            sourceChecked:
              new Date()
                .toISOString()
                .slice(0, 10),

            status:
              item.verified === true ? "published" : "pending"
          });

          changed = true;
        }
      });

      if (changed) {
        persist();
        renderAll();
      }

      console.log(
        `Automatic job check loaded ${candidates.length} candidate(s).`
      );

    } catch (error) {

      console.log(
        "Automatic jobs could not be loaded:",
        error
      );
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

  /* Language */

  if ($("langBtn")) {

    $("langBtn").addEventListener(
      "click",
      () => {

        setLanguage(
          language === "pa"
            ? "en"
            : "pa"
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

  /* Manual Job Form */

  if ($("jobForm")) {

    $("jobForm").addEventListener(
      "submit",
      event => {

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

        if (
          !noticeUrl ||
          (applyValue && !applyUrl)
        ) {

          toast(
            "Please enter valid http/https links."
          );

          return;
        }

        const sourceChecked =
          $("sourceChecked").value;

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

          deadline:
            $("deadline").value,

          noticeUrl:
            noticeUrl,

          applyUrl:
            applyUrl,

          sourceChecked:
            sourceChecked,

          status:
            "pending"
        };

        jobs.unshift(job);

        persist();

        $("jobForm").reset();

        if ($("sourceChecked")) {

          $("sourceChecked").value =
            new Date()
              .toISOString()
              .slice(0, 10);
        }

        renderAll();

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
      new Date()
        .toISOString()
        .slice(0, 10);
  }

  /* Start website */

  setLanguage("pa");

  /* Load automatic government jobs */

  loadAutomaticJobs();

})();
