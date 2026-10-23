#!/usr/bin/env python3
"""Discover government and private-sector job candidates.
All records are review-only. Nothing is ever published automatically.
"""
import json
import re
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

GOV_SOURCES = [
    ("SSSC", "https://sssc.gov.in/", "Punjab"),
    ("SSSC", "https://sssc.gov.in/notice-board", "Punjab"),
    ("UPSC", "https://www.upsc.gov.in/recruitment/recruitment-advertisement", "All India"),
    ("UPSC", "https://upsc.gov.in/examinations/active-exams", "All India"),
    ("SSC", "https://ssc.gov.in/", "All India"),
    ("PPSC", "https://ppsc.gov.in/", "Punjab"),
    ("HSSC", "https://hssc.gov.in/advertisement", "Haryana"),
    ("RRB Chandigarh", "https://www.rrbcdg.gov.in/employment-notices.php", "Chandigarh"),
    ("IBPS", "https://www.ibps.in/", "All India"),
    ("SBI Careers", "https://sbi.co.in/web/careers", "All India"),
    ("RBI Opportunities", "https://opportunities.rbi.org.in/Scripts/Vacancies.aspx", "All India"),
    ("UPSSSC", "https://upsssc.gov.in/", "Uttar Pradesh"),
    ("UPPSC", "https://uppsc.up.nic.in/", "Uttar Pradesh"),
    ("RSSB Rajasthan", "https://rssb.rajasthan.gov.in/", "Rajasthan"),
    ("BPSC Bihar", "https://bpsc.bihar.gov.in/", "Bihar"),
    ("MPESB", "https://esb.mp.gov.in/", "Madhya Pradesh"),
    ("OPSC Odisha", "https://www.opsc.gov.in/", "Odisha"),
    ("WBPSC", "https://psc.wb.gov.in/", "West Bengal"),
    ("GPSC Gujarat", "https://gpsc.gujarat.gov.in/", "Gujarat"),
    ("HPPSC", "https://hppsc.hp.gov.in/", "Himachal Pradesh"),
    ("DSSSB Delhi", "https://dsssb.delhi.gov.in/", "Delhi"),
    ("JKSSB", "https://jkssb.nic.in/", "Jammu and Kashmir"),
    ("Employment News", "https://employmentnews.gov.in/newemp/AllJobs.aspx?k=All", "All India"),
    ("India Post", "https://www.indiapost.gov.in/VAS/Pages/Content/Recruitments.aspx?Category=Recruitment", "All India"),
    ("ISRO", "https://www.isro.gov.in/Careers.html", "All India"),
    ("DRDO", "https://www.drdo.gov.in/drdo/ceptam/ceptam-notice-board", "All India"),
    ("NCS", "https://www.ncs.gov.in/pages/govt-job-vacancies.aspx", "All India"),
    ("Punjab Admissions", "https://admission.punjab.gov.in/", "Punjab"),
]
DEPARTMENTS = {
    "SSSC": "Punjab Subordinate Courts Recruitment",
    "UPSC": "Union Public Service Commission",
    "SSC": "Staff Selection Commission",
    "PPSC": "Punjab Public Service Commission",
    "HSSC": "Haryana Staff Selection Commission",
    "RRB Chandigarh": "Railway Recruitment Board, Chandigarh",
    "IBPS": "Institute of Banking Personnel Selection",
    "SBI Careers": "State Bank of India",
    "RBI Opportunities": "Reserve Bank of India",
    "UPSSSC": "Uttar Pradesh Subordinate Services Selection Commission",
    "UPPSC": "Uttar Pradesh Public Service Commission",
    "RSSB Rajasthan": "Rajasthan Staff Selection Board",
    "BPSC Bihar": "Bihar Public Service Commission",
    "MPESB": "Madhya Pradesh Employees Selection Board",
    "OPSC Odisha": "Odisha Public Service Commission",
    "WBPSC": "West Bengal Public Service Commission",
    "GPSC Gujarat": "Gujarat Public Service Commission",
    "HPPSC": "Himachal Pradesh Public Service Commission",
    "DSSSB Delhi": "Delhi Subordinate Services Selection Board",
    "JKSSB": "Jammu and Kashmir Services Selection Board",
    "Employment News": "Employment News, Government of India",
    "India Post": "Department of Posts, Government of India",
    "ISRO": "Indian Space Research Organisation",
    "DRDO": "Defence Research and Development Organisation",
    "NCS": "National Career Service, Ministry of Labour and Employment",
    "Punjab Admissions": "Punjab Department of Higher Education",
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

NOTICE_TYPES = {
    "result": re.compile(r"result|merit list|selection list|selected candidates|score card|scorecard|marks list|final answer key|answer key", re.I),
    "admit_card": re.compile(r"admit.?card|e-admit|hall ticket|call letter|download call letter|roll number|exam city slip|city intimation slip", re.I),
    "form": re.compile(r"admission|entrance test|entrance examination|application form|online form|registration open|counselling|counseling|prospectus|neet|jee main|cuet|ctet|tet application", re.I),
}
JOB_TERMS = re.compile(
    r"recruit|vacanc|advertisement|advt\\.?\\s*(no\\.?|number)|apply online|"
    r"posts? of|job opening|employment notice|centralised employment notice|"
    r"\\bCEN\\s*\\d|group[- ]?[CD]\\b|apprentice|fellowship|scientist|"
    r"technician|clerk|constable|assistant|engineer|officer|teacher|lecturer|"
    r"driver|staff nurse|trainee|intern|manager|analyst|developer|sales|support",
    re.I,
)
EXCLUDE = re.compile(
    r"syllabus|shortlist|interview schedule|corrigendum|tender|auction|calendar|press release|annual report|"
    r"objection|proposed answers|dates? of (the )?examination|"
    r"examination dates?|exam dates?|exam schedule|date sheet|roll number|"
    r"status of|recruitment requisition",
    re.I,
)
GENERIC_PAGE_TITLES = {
    "recruitment", "career", "careers", "career tools", "career tools & learning",
    "career article", "career schemes", "career guidance", "web advertisement",
    "job opportunities", "current openings", "view all jobs", "all jobs",
    "results", "result", "admit card", "admit cards", "admissions", "forms",
    "application forms", "notice board", "noticeboard", "examination", "examinations",
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

def is_india_relevant(location, default_location):
    loc = str(location or "").lower()
    india_markers = (
        "india", "bengaluru", "bangalore", "hyderabad", "pune", "chennai",
        "mumbai", "new delhi", "delhi", "gurugram", "gurgaon", "noida",
        "mohali", "chandigarh", "punjab", "ahmedabad", "kolkata", "kochi",
        "jaipur", "indore", "lucknow", "thiruvananthapuram"
    )
    if any(marker in loc for marker in india_markers):
        return True
    # Only accept a generic remote location for companies explicitly marked
    # as India-focused in the source list.
    return default_location == "India" and ("remote" in loc or not loc)

def add_private_candidate(candidates, seen, company, title, location, department, url, apply_url, checked, default_location="All India"):
    title = " ".join(str(title or "").split())
    url = str(url or "").strip()
    if not title or len(title) < 3 or not is_valid_https_url(url):
        return
    if not is_india_relevant(location, default_location):
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
            successful_sources.add(company)
            for job in data["jobs"][:MAX_PER_SOURCE]:
                loc = (job.get("location") or {}).get("name") or default_location
                depts = job.get("departments") or []
                dept = ", ".join(str(d.get("name", "")) for d in depts if d.get("name")) or company
                url = job.get("absolute_url") or ""
                add_private_candidate(candidates, seen, company, job.get("title"), loc, dept, url, url, checked, default_location)
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
                add_private_candidate(candidates, seen, company, job.get("title"), loc, dept, url, job.get("applyUrl") or url, checked, default_location)
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
                add_private_candidate(candidates, seen, company, job.get("text"), loc, dept, url, job.get("applyUrl") or url, checked, default_location)
            print(f"Scanned {company} (Lever): {len(data)} listing(s)")
        except Exception as exc:
            print(f"Skipped {company} (Lever): {exc}")

def main():
    candidates = []
    seen = set()
    checked = datetime.now(ZoneInfo("Asia/Kolkata")).date().isoformat()
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
                # Classify all useful notice types, not only recruitment ads.
                notice_type = next((kind for kind, pattern in NOTICE_TYPES.items() if pattern.search(title)), None)
                if notice_type is None:
                    if not JOB_TERMS.search(title) or EXCLUDE.search(title):
                        continue
                    notice_type = "job"
                elif notice_type == "form" and EXCLUDE.search(title):
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
                combined = (title + " " + DEPARTMENTS[source]).lower()
                if notice_type == "result":
                    category = "Results"
                elif notice_type == "admit_card":
                    category = "Admit Cards"
                elif notice_type == "form":
                    category = "Forms / Admissions"
                elif any(term in combined for term in ("railway", "rrb", "rrc", "locomotive")):
                    category = "Railway"
                elif any(term in combined for term in ("ibps", "sbi", "rbi", "bank", "probationary officer")):
                    category = "Banking"
                elif any(term in combined for term in ("b.tech", "btech", "engineer", "engineering", "diploma")):
                    category = "Engineering"
                elif any(term in combined for term in ("police", "constable", "sub inspector", "rpf")):
                    category = "Police"
                elif any(term in combined for term in ("teacher", "teaching", "lecturer", "professor", "tet", "ctet")):
                    category = "Teaching"
                elif any(term in combined for term in ("army", "navy", "air force", "defence", "agniveer", "drdo")):
                    category = "Defence"
                elif any(term in combined for term in ("nurse", "medical", "health", "pharmacist", "hospital")):
                    category = "Medical"
                elif any(term in combined for term in ("court", "judicial", "judiciary", "stenographer")):
                    category = "Courts"
                elif any(term in combined for term in ("agriculture", "horticulture", "veterinary")):
                    category = "Agriculture"
                elif any(term in combined for term in ("computer", "software", "developer", "programmer", "it officer")):
                    category = "IT"
                else:
                    category = "Other"
                candidates.append({
                    "source": source,
                    "title": title[:180],
                    "department": DEPARTMENTS[source],
                    "location": ("Haryana" if "haryana" in title.lower() or source == "HSSC" else location),
                    "category": category,
                    "noticeType": notice_type,
                    "eligibility": "Auto-discovered official-page notice. Check the source page for dates, eligibility and links before publishing.",
                    "url": url,
                    "applyUrl": url if notice_type == "form" else "",
                    "admitCardUrl": url if notice_type == "admit_card" else "",
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
    private_defaults = {company: default for company, _, default in GREENHOUSE_BOARDS + ASHBY_BOARDS + LEVER_BOARDS}
    for item in previous_candidates:
        source = item.get("source") if isinstance(item, dict) else None
        if not isinstance(item, dict):
            continue
        if item.get("category") == "Private Jobs" and not is_india_relevant(
                item.get("location"), private_defaults.get(source, "All India")):
            continue
        if (source not in successful_sources and item.get("url") and item["url"] not in seen):
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
