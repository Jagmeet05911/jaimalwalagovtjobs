#!/usr/bin/env python3
"""Send newly published jobs to active visitor subscribers through Resend."""
import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SUPABASE_URL = "https://kbebdetnhfkxnkpdiefd.supabase.co"
PENDING = Path("data/pending_jobs.json")


def request(method, url, payload=None, headers=None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        text = response.read().decode("utf-8", "replace")
        return json.loads(text) if text else []


def key(job):
    raw = str(job.get("url") or job.get("title") or "").strip().lower()
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def main():
    service = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    resend = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("RESEND_FROM", "onboarding@resend.dev").strip()
    if not service or not resend:
        print("Subscriber alerts skipped: RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY is missing.")
        return

    jobs = json.loads(PENDING.read_text(encoding="utf-8")) if PENDING.exists() else []
    jobs = [j for j in jobs if isinstance(j, dict) and j.get("verified") is True and j.get("needsReview") is False]
    if not jobs:
        print("No verified jobs available for subscriber alerts.")
        return

    headers = {"apikey": service, "Authorization": f"Bearer {service}"}
    try:
        subscribers = request("GET", SUPABASE_URL + "/rest/v1/job_alert_subscribers?select=email&active=eq.true", headers=headers)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            print("Subscriber alerts skipped: Supabase table job_alert_subscribers is not set up yet; job publishing and sync remain successful.")
            return
        raise

    if not subscribers:
        print("No active job-alert subscribers.")
        return

    sent = 0
    for job in jobs:
        job_key = key(job)
        encoded = urllib.parse.quote(job_key, safe="")
        for subscriber in subscribers:
            email = str(subscriber.get("email") or "").strip()
            if not email:
                continue
            check = request("GET", SUPABASE_URL + f"/rest/v1/job_alert_deliveries?select=id&subscriber_email=eq.{urllib.parse.quote(email, safe='')}&job_key=eq.{encoded}&limit=1", headers=headers)
            if check:
                continue

            title = str(job.get("title") or "New government job")
            location = str(job.get("location") or "India")
            notice = str(job.get("url") or "")
            apply = str(job.get("applyUrl") or notice)
            html = (
                f"<h2>New Government Job</h2>"
                f"<p><strong>{title}</strong></p>"
                f"<p>Location: {location}</p>"
                f"<p><a href=\"{notice}\">Official Notification</a> &nbsp; "
                f"<a href=\"{apply}\">Apply</a></p>"
                f"<p>Jaimalwala Govt Jobs</p>"
            )
            email_payload = {"from": sender, "to": [email], "subject": f"New Job: {title}", "html": html}
            resend_headers = {"Authorization": f"Bearer {resend}", "Content-Type": "application/json"}
            request("POST", "https://api.resend.com/emails", email_payload, resend_headers)
            request("POST", SUPABASE_URL + "/rest/v1/job_alert_deliveries", {"subscriber_email": email, "job_key": job_key}, {**headers, "Content-Type": "application/json", "Prefer": "return=minimal"})
            sent += 1
    print(f"Subscriber job alerts sent: {sent}")


if __name__ == "__main__":
    main()
