#!/usr/bin/env python3
"""Sync verified auto-published candidates into Supabase public.jobs."""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

SUPABASE_URL = "https://kbebdetnhfkxnkpdiefd.supabase.co"
PENDING = Path("data/pending_jobs.json")


def request(method, path, payload=None):
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured")
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    req = urllib.request.Request(SUPABASE_URL + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            text = response.read().decode("utf-8", "replace")
            return json.loads(text) if text else []
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(f"Supabase {error.code}: {detail}") from error


def main():
    if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip():
        print("Supabase sync skipped: SUPABASE_SERVICE_ROLE_KEY is not configured yet.")
        return

    items = json.loads(PENDING.read_text(encoding="utf-8")) if PENDING.exists() else []
    published = [
        x for x in items
        if isinstance(x, dict) and x.get("verified") is True and x.get("needsReview") is False
    ]
    if not published:
        print("No verified jobs to sync.")
        return

    synced = 0
    for job in published:
        notice = str(job.get("url") or "").strip()
        if not notice:
            continue

        row = {
            "title": str(job.get("title") or "Untitled")[:300],
            "department": str(job.get("department") or job.get("source") or "Government")[:300],
            "location": str(job.get("location") or "India")[:200],
            "category": str(job.get("category") or "Other")[:120],
            "eligibility": str(job.get("eligibility") or "Check the official notification.")[:2000],
            "deadline": job.get("deadline") or None,
            "notice_url": notice,
            "apply_url": str(job.get("applyUrl") or notice),
            "admit_card_url": job.get("admitCardUrl") or None,
            "source_checked": str(job.get("sourceChecked") or "")[:40],
            "status": "published",
        }

        encoded = urllib.parse.quote(notice, safe="")
        existing = request("GET", f"/rest/v1/jobs?select=id&notice_url=eq.{encoded}&limit=1")
        if existing:
            existing_id = urllib.parse.quote(str(existing[0]["id"]), safe="")
            request("PATCH", f"/rest/v1/jobs?id=eq.{existing_id}", row)
        else:
            # The current jobs table has a NOT NULL id without a database default.
            # Use a deterministic UUID so retries do not create a new id per run.
            row["id"] = str(uuid.uuid5(uuid.NAMESPACE_URL, notice))
            request("POST", "/rest/v1/jobs", row)
        synced += 1

    print(f"Supabase published jobs synced: {synced}")


if __name__ == "__main__":
    main()
