(() => {
  "use strict";
  const SUPABASE_URL = "https://kbebdetnhfkxnkpdiefd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_51mCCN-NaaylwYSnLyFk2Q_Uovo2lY_";
  const boxId = "jgJobAlertBox";

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  }

  async function rpc(path, body) {
    const response = await fetch(SUPABASE_URL + path, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) {}
    if (!response.ok) throw new Error(data?.message || data?.hint || "Subscription request failed.");
    return data;
  }

  function installStyles() {
    if (document.getElementById("jgJobAlertStyles")) return;
    const style = document.createElement("style");
    style.id = "jgJobAlertStyles";
    style.textContent = `
      #${boxId}{margin:22px auto;max-width:1100px;border:1px solid rgba(45,118,189,.18);border-radius:18px;padding:20px;background:linear-gradient(135deg,rgba(45,118,189,.08),rgba(255,255,255,.96));box-shadow:0 10px 28px rgba(15,35,60,.08)}
      #${boxId} .jg-alert-inner{display:grid;grid-template-columns:1.25fr 1fr;gap:18px;align-items:center}
      #${boxId} h2{margin:0 0 7px;font-size:1.35rem} #${boxId} p{margin:0 0 12px;color:#5b6675}
      #${boxId} form{display:flex;gap:8px} #${boxId} input{flex:1;min-width:0;padding:12px 13px;border:1px solid #cbd5e1;border-radius:11px;background:#fff}
      #${boxId} button{border:0;border-radius:11px;padding:12px 16px;background:#2d76bd;color:#fff;font-weight:700;cursor:pointer} #${boxId} button:disabled{opacity:.65;cursor:wait}
      #${boxId} .jg-alert-msg{margin-top:9px;font-size:.92rem;min-height:1.2em} #${boxId} small{color:#697586}
      @media(max-width:700px){#${boxId} .jg-alert-inner{grid-template-columns:1fr}#${boxId} form{flex-direction:column}#${boxId} button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function render() {
    if (document.getElementById(boxId)) return;
    installStyles();
    const host = document.querySelector("main") || document.body;
    const box = document.createElement("section");
    box.id = boxId;
    box.innerHTML = `
      <div class="jg-alert-inner">
        <div>
          <h2>🔔 New Job Alerts</h2>
          <p>Sign up with your email and get new government job updates with the official notification and apply link.</p>
          <small>Free alerts • You can unsubscribe anytime.</small>
        </div>
        <div>
          <form id="jgJobAlertForm">
            <input id="jgJobAlertEmail" type="email" autocomplete="email" placeholder="Enter your email address" required maxlength="254">
            <button type="submit">Get Job Alerts</button>
          </form>
          <div id="jgJobAlertMsg" class="jg-alert-msg" role="status" aria-live="polite"></div>
        </div>
      </div>`;
    host.prepend(box);

    document.getElementById("jgJobAlertForm").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector("button");
      const email = document.getElementById("jgJobAlertEmail").value.trim();
      const msg = document.getElementById("jgJobAlertMsg");
      button.disabled = true;
      msg.textContent = "Saving…";
      try {
        await rpc("/rest/v1/rpc/subscribe_job_alert", { p_email: email });
        form.reset();
        msg.textContent = "✓ You are subscribed. New job alerts will be sent to this email.";
      } catch (error) {
        msg.textContent = "Could not subscribe: " + error.message;
      } finally { button.disabled = false; }
    });
  }

  async function handleUnsubscribe() {
    const token = new URLSearchParams(location.search).get("unsubscribe");
    if (!token) return;
    const message = document.createElement("div");
    message.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9999;padding:14px 17px;border-radius:12px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.16);max-width:360px;font-weight:600";
    try {
      const ok = await rpc("/rest/v1/rpc/unsubscribe_job_alert", { p_token: token });
      message.textContent = ok ? "✓ Job alerts unsubscribed successfully." : "This unsubscribe link is no longer active.";
    } catch (_) { message.textContent = "Could not process the unsubscribe link."; }
    document.body.appendChild(message);
  }

  function start() { render(); handleUnsubscribe(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
