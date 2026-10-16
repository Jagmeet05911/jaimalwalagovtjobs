#!/usr/bin/env python3
"""Discover government and private-sector job candidates.
All records are review-only. Nothing is ever published automatically.
"""
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

GOV_SOURCES = [
    ("SSSC", "https://sssc.gov.in/", "Punjab"),
    ("UPSC", "https://www.upsc.gov.in/recruitment/recruitment-advertisement", "All India"),
    ("SSC", "https://ssc.gov.in/", "All India"),
    ("PPSC", "https://ppsc.gov.in/", "Punjab"),
    ("HSSC", "https://hssc.gov.in/advertisement", "Haryana"),
    ("RRB Chandigarh", "https://www.rrbcdg.gov.in/employment-notices.php", "Chandigarh"),
    ("Employment News", "https://employmentnews.gov.in/newemp/AllJobs.aspx?k=All", "All India"),
    ("India Post", "https://www.indiapost.gov.in/VAS/Pages/Content/Recruitments.aspx?Category=Recruitment", "All India"),
    ("ISRO", "https://www.isro.gov.in/Careers.html", "All India"),
    ("DRDO", "https://www.drdo.gov.in/drdo/ceptam/ceptam-notice-board", "All India"),
    ("NCS", "https://www.ncs.gov.in/pages/govt-job-vacancies.aspx", "All India"),
]
DEPARTMENTS = {
    "SSSC": "Society for Centralized Recruitment of Staff in Subordinate Courts",
    "UPSC": "Union Public Service Commission",
    "SSC": "Staff Selection Commission",
    "PPSC": "Punjab Public Service Commission",
    "HSSC": "Haryana Staff Selection Commission",
    "RRB Chandigarh": "Railway Recruitment Board, Chandigarh",
    "Employment News": "Employment News, Government of India",
    "India Post": "Department of Posts, Government of India",
    "ISRO": "Indian Space Research Organisation",
    "DRDO": "Defence Research and Development Organisation",
    "NCS": "National Career Service, Ministry of Labour and Employment",
}

# Public job-board identifiers. A source is accepted only when its official
# ATS API returns a real listing with a hosted application/notice URL.
GREENHOUSE_BOARDS = [
    ("Coinbase", "coinbase", "All India"),
    ("Cloudflare", "cloudflare", "All India"),
    ("Figma", "figma", "All India"),
    ("Datadog", "datadog", "All India"),
    ("Reddit", "reddit", "All India"),
    ("Discord", "discord", "All India"),
    ("DoorDash", "doordash", "All India"),
    ("GitLab", "gitlab", "All India"),
    ("Duolingo", "duolingo", "All India"),
    ("Instacart", "instacart", "All India"),
    ("Plaid", "plaid", "All India"),
    ("Airtable", "airtable", "All India"),
    ("Brex", "brex", "All India"),
    ("Razorpay", "razorpay", "India"),
    ("Meesho", "meesho", "India"),
    ("PhonePe", "phonepe", "India"),
    ("Swiggy", "swiggy", "India"),
    ("Zomato", "zomato", "India"),
]
ASHBY_BOARDS = [
    ("OpenAI", "openai", "All India"),
    ("Linear", "linear", "All India"),
    ("Notion", "notion", "All India"),
    ("Anthropic", "anthropic", "All India"),
    ("Cursor", "cursor", "All India"),
    ("Perplexity", "perplexity", "All India"),
    ("Vercel", "vercel", "All India"),
    ("Supabase", "supabase", "All India"),
    ("Mercury", "mercury", "All India"),
    ("Deel", "deel", "All India"),
    ("Ramp", "ramp", "All India"),
]
LEVER_BOARDS = [
    ("Canva", "canva", "All India"),
    ("Shopify", "shopify", "All India"),
    ("Lyft", "lyft", "All India"),
    ("Flexport", "flexport", "All India"),
    ("Twitch", "twitch", "All India"),
]

JOB_TERMS = re.compile(
    r"recruit|vacanc|advertisement|advt\\.?\\s*(no\\.?|number)|apply online|"
    r"posts? of|job opening|employment notice|centralised employment notice|"
    r"\\bCEN\\s*\\d|group[- ]?[CD]\\b|apprentice|fellowship|scientist|"
    r"technician|clerk|constable|assistant|engineer|officer|teacher|lecturer|"
    r"driver|staff nurse|trainee|intern|manager|analyst|developer|sales|support",
    re.I,
)
EXCLUDE = re.compile(
    r"result|answer key|admit card|syllabus|shortlist|interview schedule|"
    r"corrigendum|tender|auction|calendar|press release|annual report|"
    r"objection|proposed answers|dates? of (the )?examination|"
    r"examination dates?|exam dates?|exam schedule|date sheet|roll number|"
    r"status of|recruitment requisition",
    re.I,
)
GENERIC_PAGE_TITLES = {
    "recruitment", "career", "careers", "career tools", "career tools & learning",
    "career article", "career schemes", "career guidance", "web advertisement",
    "job opportunities", "current openings", "view all jobs", "all jobs",
}
MAX_PER_SOURCE = 25

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
    req = urllib.request.Request(url, headers={
        "User-Agent": "JaimalwalaGovtJobsBot/1.1 (public job discovery; manual review required)",
        "Accept": "application/json,text/html,*/*",
    })
    with urllib.request.urlopen(req, timeout=7) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}")
        return response.read().decode("utf-8", "replace")

def is_valid_https_url(value):
    try:
        parsed = urlparse(value or "")
        return parsed.scheme == "https" and bool(parsed.netloc)
    except Exception:
        return False

def add_private_candidate(candidates, seen, company, title, location, department, url, apply_url, checked):
    title = " ".join(str(title or "").split())
    url = str(url or "").strip()
    if not title or len(title) < 3 or not is_valid_https_url(url):
        return
    if EXCLUDE.search(title) or title.lower().strip(" -") in GENERIC_PAGE_TITLES:
        return
    if url in seen:
        return
    seen.add(url)
    candidates.append({
        "source": company,
        "title": title[:180],
        "department": str(department or company)[:180],
        "location": str(location or "See official posting")[:120],
        "category": "Private Jobs",
        "eligibility": "Check the employer's official posting for required education, experience, age, salary and other criteria.",
        "url": url,
        "applyUrl": apply_url if is_valid_https_url(apply_url) else url,
        "deadline": "",
        "verified": False,
        "needsReview": True,
        "sourceChecked": checked,
    })

def scan_private(candidates, seen, successful_sources, checked):
    # Greenhouse public job-board API
    for company, board, default_location in GREENHOUSE_BOARDS:
        source = "Private:" + company
        api = f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"
        try:
            data = json.loads(fetch(api))
            if not isinstance(data, dict) or not isinstance(data.get("jobs"), list):
                raise ValueError("Unexpected Greenhouse response")
            successful_sources.add(source)
            for job in data["jobs"][:MAX_PER_SOURCE]:
                loc = (job.get("location") or {}).get("name") or default_location
                depts = job.get("departments") or []
                dept = ", ".join(str(d.get("name", "")) for d in depts if d.get("name")) or company
                url = job.get("absolute_url") or ""
                add_private_candidate(candidates, seen, company, job.get("title"), loc, dept, url, url, checked)
            print(f"Scanned {company} (Greenhouse): {len(data['jobs'])} listing(s)")
        except Exception as exc:
            print(f"Skipped {company} (Greenhouse): {exc}")

    # Ashby public job-board API
    for company, board, default_location in ASHBY_BOARDS:
        source = "Private:" + company
        api = f"https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true"
        try:
            data = json.loads(fetch(api))
            if not isinstance(data, dict) or not isinstance(data.get("jobs"), list):
                raise ValueError("Unexpected Ashby response")
            successful_sources.add(source)
            for job in data["jobs"][:MAX_PER_SOURCE]:
                loc = job.get("location") or default_location
                if job.get("isRemote") and "remote" not in str(loc).lower():
                    loc = str(loc) + " (Remote)"
                dept = job.get("departmentName") or job.get("teamName") or company
                url = job.get("jobUrl") or ""
                add_private_candidate(candidates, seen, company, job.get("title"), loc, dept, url, job.get("applyUrl") or url, checked)
            print(f"Scanned {company} (Ashby): {len(data['jobs'])} listing(s)")
        except Exception as exc:
            print(f"Skipped {company} (Ashby): {exc}")

    # Lever public postings API
    for company, board, default_location in LEVER_BOARDS:
        source = "Private:" + company
        api = f"https://api.lever.co/v0/postings/{board}?mode=json"
        try:
            data = json.loads(fetch(api))
            if not isinstance(data, list):
                raise ValueError("Unexpected Lever response")
            successful_sources.add(source)
            for job in data[:MAX_PER_SOURCE]:
                categories = job.get("categories") or {}
                loc = categories.get("location") or default_location
                dept = categories.get("team") or categories.get("department") or company
                url = job.get("hostedUrl") or ""
                add_private_candidate(candidates, seen, company, job.get("text"), loc, dept, url, job.get("applyUrl") or url, checked)
            print(f"Scanned {company} (Lever): {len(data)} listing(s)")
        except Exception as exc:
            print(f"Skipped {company} (Lever): {exc}")

def main():
    candidates = []
    seen = set()
    checked = datetime.now(timezone.utc).date().isoformat()
    feed_path = Path("data/pending_jobs.json")
    try:
        previous_candidates = json.loads(feed_path.read_text(encoding="utf-8"))
        if not isinstance(previous_candidates, list):
            previous_candidates = []
    except (OSError, json.JSONDecodeError):
        previous_candidates = []

    successful_sources = set()
    for source, page, location in GOV_SOURCES:
        try:
            parser = Links()
            parser.feed(fetch(page))
            successful_sources.add(source)
            count = 0
            host = urlparse(page).netloc.lower()
            source_host = host[4:] if host.startswith("www.") else host
            for title, href in parser.items:
                if not title or len(title) < 6 or not href:
                    continue
                title = " ".join(title.split())
                if title.lower().strip(" -") in GENERIC_PAGE_TITLES:
                    continue
                if not JOB_TERMS.search(title) or EXCLUDE.search(title):
                    continue
                url = urljoin(page, href)
                parsed = urlparse(url)
                candidate_host = parsed.netloc.lower()
                if parsed.scheme != "https" or not (
                    candidate_host == source_host or candidate_host == host or
                    candidate_host.endswith("." + source_host)
                ):
                    continue
                if url in seen:
                    continue
                seen.add(url)
                candidates.append({
                    "source": source,
                    "title": title[:180],
                    "department": DEPARTMENTS[source],
                    "location": ("Haryana" if "SSSC/HR" in title.upper() or "haryana" in title.lower() else location),
                    "category": "Other",
                    "eligibility": "Auto-discovered candidate. Check the official notice for eligibility, fees and dates before publishing.",
                    "url": url,
                    "applyUrl": "",
                    "deadline": "",
                    "verified": False,
                    "needsReview": True,
                    "sourceChecked": checked,
                })
                count += 1
                if count >= MAX_PER_SOURCE:
                    break
        except Exception as exc:
            print(f"Could not scan {source} ({page}): {exc}")

    scan_private(candidates, seen, successful_sources, checked)

    # Keep older entries only when their source could not be reached, avoiding
    # stale deletions during temporary outages. Fresh entries are always deduped.
    preserved = 0
    for item in previous_candidates:
        source = item.get("source") if isinstance(item, dict) else None
        if (isinstance(item, dict) and source not in successful_sources and
                item.get("url") and item["url"] not in seen):
            candidates.append(item)
            seen.add(item["url"])
            preserved += 1

    Path("data").mkdir(exist_ok=True)
    feed_path.write_text(json.dumps(candidates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    private_count = sum(1 for item in candidates if item.get("category") == "Private Jobs")
    print("Successful sources:", ", ".join(sorted(successful_sources)) or "none")
    print(f"Preserved {preserved} candidate(s) from sources that could not be scanned.")
    print(f"Wrote {len(candidates)} review-only candidates, including {private_count} private-job candidate(s).")
    print("Nothing was published. Admin approval is required for every listing.")

if __name__ == "__main__":
    main()
