#!/usr/bin/env python3
"""Email newly discovered job candidates after they are scanned.

The workflow only sends mail when SMTP secrets are configured. No credentials are
stored in the repository.
"""
import hashlib
import json
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

PENDING = Path("data/pending_jobs.json")
NOTIFIED = Path("data/notified_job_keys.json")


def key(job):
    raw = str(job.get("url") or job.get("title") or "").strip().lower()
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def main():
    jobs = json.loads(PENDING.read_text(encoding="utf-8")) if PENDING.exists() else []
    old = set(json.loads(NOTIFIED.read_text(encoding="utf-8"))) if NOTIFIED.exists() else set()
    current = {key(job) for job in jobs if isinstance(job, dict) and key(job)}
    new_keys = current - old

    required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "EMAIL_TO"]
    if not all(os.getenv(name) for name in required):
        print("Email notification skipped: SMTP secrets are not configured yet.")
        return
    if not new_keys:
        NOTIFIED.parent.mkdir(parents=True, exist_ok=True)
        NOTIFIED.write_text(json.dumps(sorted(current), indent=2) + "\n", encoding="utf-8")
        print("No new job candidates to email.")
        return

    by_key = {key(job): job for job in jobs if isinstance(job, dict) and key(job)}
    fresh = [by_key[k] for k in sorted(new_keys) if k in by_key][:10]

    lines = ["New job candidates found on Jaimalwala Govt Jobs", "", f"New candidates: {len(new_keys)}", ""]
    for job in fresh:
        title = str(job.get("title") or "Untitled")
        location = str(job.get("location") or "India")
        source = str(job.get("source") or "Official source")
        url = str(job.get("url") or "")
        apply_url = str(job.get("applyUrl") or url)
        lines += [f"• {title}", f"  Location: {location}", f"  Source: {source}", f"  Notice: {url}", f"  Apply: {apply_url}", ""]

    msg = EmailMessage()
    msg["Subject"] = f"Jaimalwala Govt Jobs: {len(new_keys)} new job candidate(s)"
    msg["From"] = os.environ["SMTP_FROM"] if os.getenv("SMTP_FROM") else os.environ["SMTP_USERNAME"]
    msg["To"] = os.environ["EMAIL_TO"]
    msg.set_content("\n".join(lines))

    host = os.environ["SMTP_HOST"]
    port = int(os.environ["SMTP_PORT"])
    use_ssl = os.getenv("SMTP_SSL", "false").lower() == "true"
    if use_ssl:
        with smtplib.SMTP_SSL(host, port, timeout=30) as server:
            server.login(os.environ["SMTP_USERNAME"], os.environ["SMTP_PASSWORD"])
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.ehlo()
            if os.getenv("SMTP_STARTTLS", "true").lower() == "true":
                server.starttls()
                server.ehlo()
            server.login(os.environ["SMTP_USERNAME"], os.environ["SMTP_PASSWORD"])
            server.send_message(msg)

    NOTIFIED.parent.mkdir(parents=True, exist_ok=True)
    NOTIFIED.write_text(json.dumps(sorted(current), indent=2) + "\n", encoding="utf-8")
    print(f"Email sent for {len(new_keys)} new job candidate(s).")


if __name__ == "__main__":
    main()
