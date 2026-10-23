import json
import os
from urllib.parse import urljoin, urldefrag

import requests
from bs4 import BeautifulSoup

# Curated active listings. Keep only when official source and closing date
# have been checked; dates use YYYY-MM-DD.
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
        "verified": True,
        "needsReview": False
    }
]

# Official recruitment / vacancy pages. Candidates discovered here are sent
# to review rather than published automatically without a verified deadline.
SOURCES = [
    {"name": "UPSC", "url": "https://www.upsc.gov.in/recruitment/recruitment-advertisement", "location": "All India"},
    {"name": "SSC", "url": "https://ssc.gov.in/", "location": "All India"},
    {"name": "SSSC", "url": "https://www.sssc.gov.in/notice-board", "location": "Punjab"},
    {"name": "HSSC", "url": "https://hssc.gov.in/advertisement", "location": "Haryana"},
    {"name": "Haryana Government", "url": "https://www.haryana.gov.in/job-opportunities/", "location": "Haryana"},
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
    "corrigendum", "recruitment rules", "seniority", "eligible/ineligible"
)
GENERIC_LABELS = {"recruitment", "advertisement", "view all", "official website", "portal"}

candidates = []
seen_urls = {job["url"] for job in CURATED_JOBS}

for source in SOURCES:
    try:
        response = requests.get(
            source["url"],
            timeout=25,
            headers={"User-Agent": "Mozilla/5.0 (compatible; JaimalwalaGovtJobs/1.0)"}
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        for anchor in soup.find_all("a", href=True):
            title = " ".join(anchor.get_text(" ", strip=True).split())
            lowered = title.lower()
            if len(title) < 10 or lowered in GENERIC_LABELS or any(word in lowered for word in SKIP_WORDS):
                continue
            if not any(word in lowered for word in NOTICE_WORDS):
                continue

            url = urldefrag(urljoin(response.url, anchor["href"])).url
            if not url.startswith("https://") or url in seen_urls:
                continue
            if url.rstrip("/") == source["url"].rstrip("/"):
                continue

            seen_urls.add(url)
            candidates.append({
                "source": source["name"],
                "title": title,
                "department": source["name"],
                "location": source["location"],
                "category": "Other",
                "url": url,
                "applyUrl": "",
                "deadline": "",
                "verified": False,
                "needsReview": True
            })

    except Exception as error:
        print(f"Could not fetch {source['name']}: {error}")

os.makedirs("data", exist_ok=True)
with open("data/pending_jobs.json", "w", encoding="utf-8") as output:
    json.dump(CURATED_JOBS + candidates, output, ensure_ascii=False, indent=2)

print(f"Saved {len(CURATED_JOBS)} curated active job(s) and {len(candidates)} notice candidate(s) for review.")
