#!/usr/bin/env python3
"""Discover job-notice candidates from official recruitment pages.
Everything produced here is REVIEW ONLY; the admin must verify each notice.
"""
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

SOURCES = [
    ("SSSC", "https://sssc.gov.in/", "Punjab"),
    ("UPSC", "https://www.upsc.gov.in/recruitment/recruitment-advertisement", "All India"),
    ("SSC", "https://ssc.gov.in/", "All India"),
    ("PPSC", "https://ppsc.gov.in/", "Punjab"),
]
JOB_TERMS = re.compile(r"recruit|vacanc|advertisement|advertisement no|apply online|career|post of|posts of|job opening|direct recruitment", re.I)
EXCLUDE = re.compile(r"result|answer key|admit card|syllabus|shortlist|interview|corrigendum|tender|auction|calendar|press release|annual report|objection|proposed answers|date of examination|examination date|exam date|roll number|status of|recruitment requisition", re.I)
MAX_PER_SOURCE = 20

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.href = None
        self.text = []
        self.items = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.href = dict(attrs).get("href")
            self.text = []
    def handle_data(self, data):
        if self.href is not None:
            self.text.append(data)
    def handle_endtag(self, tag):
        if tag == "a" and self.href is not None:
            title = " ".join(" ".join(self.text).split())
            self.items.append((title, self.href))
            self.href = None
            self.text = []

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "JaimalwalaGovtJobsBot/1.0 (official notice discovery; manual review required)"})
    with urllib.request.urlopen(req, timeout=25) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}")
        return response.read().decode("utf-8", "replace")

def main():
    candidates = []
    seen = set()
    checked = datetime.now(timezone.utc).date().isoformat()
    for source, page, location in SOURCES:
        try:
            parser = Links()
            parser.feed(fetch(page))
            count = 0
            host = urlparse(page).netloc.lower()
            for title, href in parser.items:
                if not title or len(title) < 8 or not href:
                    continue
                url = urljoin(page, href)
                parsed = urlparse(url)
                candidate_host = parsed.netloc.lower()
                source_host = host[4:] if host.startswith("www.") else host
                if parsed.scheme != "https" or not (
                    candidate_host == source_host or candidate_host == host or
                    candidate_host.endswith("." + source_host)
                ):
                    continue
                if not JOB_TERMS.search(title) or EXCLUDE.search(title):
                    continue
                if url in seen:
                    continue
                seen.add(url)
                candidates.append({
                    "source": source,
                    "title": title[:180],
                    "department": {"SSSC": "Society for Centralized Recruitment of Staff in Subordinate Courts", "UPSC": "Union Public Service Commission", "SSC": "Staff Selection Commission", "PPSC": "Punjab Public Service Commission"}[source],
                    "location": ("Haryana" if "SSSC/HR" in title.upper() or "haryana" in title.lower() else location),
                    "category": "Other",
                    "eligibility": "Auto-discovered candidate. Check the official notice for eligibility, fees and dates before publishing.",
                    "url": url,
                    "applyUrl": "",
                    "deadline": "",
                    "verified": False,
                    "needsReview": True,
                    "sourceChecked": checked
                })
                count += 1
                if count >= MAX_PER_SOURCE:
                    break
        except Exception as exc:
            print(f"Could not scan {source} ({page}): {exc}")
    Path("data").mkdir(exist_ok=True)
    Path("data/pending_jobs.json").write_text(json.dumps(candidates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(candidates)} review-only candidates.")
    if not candidates:
        print("Warning: no candidates found; inspect source pages and workflow logs.")

if __name__ == "__main__":
    main()
