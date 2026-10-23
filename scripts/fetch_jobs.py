import json
import os
import re
from datetime import date, datetime
from urllib.parse import urljoin, urldefrag

import requests
from bs4 import BeautifulSoup

# Keep a small, verified seed so the site always has at least the manually
# checked active listing. Automated candidates are never published directly.
CURATED_JOBS = [
    {
        "source": "SSSC",
        "title": "Clerk — District Courts of Punjab (1270 posts)",
        "department": "Society for Centralized Recruitment of Staff in Subordinate Courts (SSSC)",
        "location": "Punjab",
        "category": "Other",
        "eligibility": "BA/BSc or equivalent degree, Matriculation with Punjabi, and computer proficiency. Read the official notice for full eligibility and category-wise conditions.",
        "url": "https://sssc.gov.in/storage/notices/Advt%20dated%2003.10.2026%20Pb%20Clerk.pdf",
        "applyUrl": "https://www.sssc.gov.in/",
        "deadline": "2026-11-04",
        "sourceChecked": str(date.today()),
        "verified": True,
        "needsReview": False
    }
]

SOURCES = [
    {"name": "UPSC", "url": "https://www.upsc.gov.in/recruitment/recruitment-advertisement", "location": "All India"},
    {"name": "SSC", "url": "https://ssc.gov.in/", "location": "All India"},
    {"name": "SSSC", "url": "https://www.sssc.gov.in/notice-board", "location": "Punjab"},
    {"name": "HSSC", "url": "https://hssc.gov.in/advertisement", "location": "Haryana"},
    {"name": "Haryana Government", "url": "https://www.haryana.gov.in/job-opportunities/", "location": "Haryana"},
    {"name": "HPPSC", "url": "https://hppsc.hp.gov.in/Home/Advertisement", "location": "Himachal Pradesh"},
    {"name": "Chandigarh Administration", "url": "https://www.chandigarh.gov.in/public-notices/vacancies", "location": "Chandigarh"},
    {"name": "Chandigarh Public Notices", "url": "https://chandigarh.gov.in/public-notice", "location": "Chandigarh"},
    {"name": "Chandigarh Transport Undertaking", "url": "https://www.chdctu.gov.in/recruitment", "location": "Chandigarh"},
    {"name": "GMCH Chandigarh", "url": "https://gmch.gov.in/jobs-and-training", "location": "Chandigarh"},
]

NOTICE_WORDS = (
    "notification", "advertisement", "recruitment", "vacancy", "vacancies",
    "employment notice", "posts of", "direct recruitment", "applications are invited",
    "walk-in-interview", "walk in interview", "hiring", "engagement"
)
SKIP_WORDS = (
    "apply online", "application form", "login", "register", "home",
    "answer key", "result", "admit card", "objection", "exam date",
    "corrigendum", "recruitment rules", "seniority", "eligible/ineligible",
    "syllabus", "press note", "schedule", "shortlist", "rejected", "rejection"
)
GENERIC_LABELS = {"recruitment", "advertisement", "view all", "official website", "portal"}
CURRENT_YEAR = date.today().year
MAX_CANDIDATES_PER_SOURCE = 20


def normal_url(url):
    return urldefrag(str(url or "").strip()).url.rstrip("/").lower()


def extract_deadline(text):
    """Extract common DD/MM/YYYY or YYYY-MM-DD deadlines from notice text."""
    text = str(text or "")
    patterns = [
        r"\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b",
        r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        try:
            a, b, c = map(int, match.groups())
            if c >= 2000:  # DD/MM/YYYY
                return date(c, b, a).isoformat()
            return date(a, b, c).isoformat()  # YYYY-MM-DD
        except ValueError:
            pass
    return ""


def is_expired(deadline):
    if not deadline:
        return False
    try:
        return date.fromisoformat(deadline) < date.today()
    except ValueError:
        return False


candidates = []
seen_urls = {normal_url(job["url"]) for job in CURATED_JOBS}
seen_titles = set()
checked_at = str(date.today())

for source in SOURCES:
    try:
        response = requests.get(
            source["url"],
            timeout=25,
            headers={"User-Agent": "Mozilla/5.0 (compatible; JaimalwalaGovtJobs/1.0)"}
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        added_for_source = 0

        for anchor in soup.find_all("a", href=True):
            if added_for_source >= MAX_CANDIDATES_PER_SOURCE:
                break
            title = " ".join(anchor.get_text(" ", strip=True).split())
            lowered = title.lower()
            if len(title) < 10 or lowered in GENERIC_LABELS or any(word in lowered for word in SKIP_WORDS):
                continue
            if not any(word in lowered for word in NOTICE_WORDS):
                continue

            years = [int(y) for y in re.findall(r"\b(20\d{2})\b", title)]
            if years and max(years) < CURRENT_YEAR:
                continue

            url = normal_url(urljoin(response.url, anchor["href"]))
            if not url.startswith("https://") or url in seen_urls:
                continue
            if url == normal_url(source["url"]):
                continue

            deadline = extract_deadline(title)
            if is_expired(deadline):
                continue

            title_key = re.sub(r"\s+", " ", lowered)
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)
            seen_urls.add(url)

            candidates.append({
                "source": source["name"],
                "title": title,
                "department": source["name"],
                "location": source["location"],
                "category": "Other",
                "url": url,
                "applyUrl": "",
                "deadline": deadline,
                "sourceChecked": checked_at,
                "verified": False,
                "needsReview": True
            })
            added_for_source += 1

    except Exception as error:
        print(f"Could not fetch {source['name']}: {error}")

# Final safety pass: never write duplicate URLs, duplicate source+title pairs,
# or candidates whose explicit deadline has already passed.
cleaned = []
seen_keys = set()
for job in CURATED_JOBS + candidates:
    url_key = normal_url(job.get("url"))
    title_key = re.sub(r"\s+", " ", str(job.get("title", "")).strip().lower())
    key = (url_key, str(job.get("source", "")).strip().lower(), title_key)
    if key in seen_keys or is_expired(job.get("deadline", "")):
        continue
    seen_keys.add(key)
    cleaned.append(job)

os.makedirs("data", exist_ok=True)
with open("data/pending_jobs.json", "w", encoding="utf-8") as output:
    json.dump(cleaned, output, ensure_ascii=False, indent=2)

print(f"Saved {len(cleaned)} fresh/active candidates for admin review.")
