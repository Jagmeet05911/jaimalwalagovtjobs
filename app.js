async function loadAutomaticJobs() {
  try {
    const response = await fetch("./data/pending_jobs.json", {
      cache: "no-store"
    });

    if (!response.ok) return;

    const candidates = await response.json();

    candidates.forEach(item => {
      if (!item.url) return;

      const id = "auto-" + item.source + "-" + item.url;

      if (!jobs.some(j => j.id === id)) {
        jobs.unshift({
          id: id,
          title: item.title || `${item.source} - Official Jobs/Notifications`,
          department: item.source || "Government",
          location: "India",
          category: "Government",
          eligibility: "Check the official notification for eligibility.",
          deadline: "",
          noticeUrl: item.url,
          applyUrl: item.url,
          sourceChecked: new Date().toISOString().slice(0, 10),
          status: "pending"
        });
      }
    });

    persist();
    renderAll();

  } catch (error) {
    console.log("Automatic jobs could not be loaded:", error);
  }
}
