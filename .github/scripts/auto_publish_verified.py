#!/usr/bin/env python3
"""Safely auto-publish clearly identified government recruitment notices.
Only allowlisted official government domains are eligible. Expired, duplicate,
non-HTTPS and non-recruitment candidates remain in review.
"""
import json
import re
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

PATH = Path("data/pending_jobs.json")
OFFICIAL_HOSTS = {
    "sssc.gov.in", "www.sssc.gov.in", "upsc.gov.in", "www.upsc.gov.in",
    "ssc.gov.in", "www.ssc.gov.in", "ppsc.gov.in", "www.ppsc.gov.in",
    "hssc.gov.in", "www.hssc.gov.in", "hppsc.hp.gov.in", "www.hppsc.hp.gov.in",
    "rrbcdg.gov.in", "www.rrbcdg.gov.in", "ibps.in", "www.ibps.in",
    "sbi.co.in", "www.sbi.co.in", "opportunities.rbi.org.in",
    "upsssc.gov.in", "www.upsssc.gov.in", "uppsc.up.nic.in", "rssb.rajasthan.gov.in",
    "bpsc.bihar.gov.in", "esb.mp.gov.in", "www.opsc.gov.in", "psc.wb.gov.in",
    "gpsc.gujarat.gov.in", "dsssb.delhi.gov.in", "jkssb.nic.in",
    "employmentnews.gov.in", "www.indiapost.gov.in", "isro.gov.in", "www.isro.gov.in",
    "drdo.gov.in", "www.drdo.gov.in", "www.ncs.gov.in", "www.chandigarh.gov.in",
    "chandigarh.gov.in", "www.chdctu.gov.in", "gmch.gov.in", "www.haryana.gov.in",
}
JOB_RE = re.compile(r"recruit|recruitment|vacanc|advertisement|employment notice|posts? of|applications? (are )?invited|direct recruitment|walk.?in|hiring|engagement|apprentice|constable|clerk|assistant|engineer|officer|teacher|nurse|technician|scientist|driver", re.I)
BAD_RE = re.compile(r"result|admit.?card|answer key|syllabus|corrigendum|tender|auction|press release|calendar|exam date|date sheet|shortlist|rejected|objection", re.I)

def parse_date(value):
    value = str(value or "").strip()[:10]
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            pass
    return None

def official(url):
    try:
        p = urlparse(str(url or ""))
        return p.scheme == "https" and p.hostname in OFFICIAL_HOSTS
    except Exception:
        return False

items = json.loads(PATH.read_text(encoding="utf-8")) if PATH.exists() else []
seen = set()
published = []
review = []
today = date.today()

for item in items:
    if not isinstance(item, dict):
        continue
    url = str(item.get("url", "")).strip()
    title = " ".join(str(item.get("title", "")).split())
    key = (url.lower(), title.lower())
    if not url or key in seen:
        continue
    seen.add(key)
    deadline = parse_date(item.get("deadline"))
    text = f"{title} {url}"
    eligible = official(url) and bool(JOB_RE.search(text)) and not BAD_RE.search(title)
    if deadline and deadline < today:
        eligible = False
    if eligible:
        item["verified"] = True
        item["needsReview"] = False
        item["applyUrl"] = item.get("applyUrl") or url
        item["verificationMethod"] = "allowlisted official government domain + recruitment notice checks"
        published.append(item)
    else:
        item["verified"] = bool(item.get("verified", False))
        item["needsReview"] = True
        review.append(item)

PATH.write_text(json.dumps(published + review, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Auto-published: {len(published)} | Kept for review: {len(review)}")
