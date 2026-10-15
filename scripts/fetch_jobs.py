import json
import os
from urllib.parse import urljoin, urldefrag

import requests
from bs4 import BeautifulSoup

# Curated active listings. Keep only when official source and closing date
# Updated 2026-10-15: refresh public listings after improving the homepage loader.
# have been checked; dates use YYYY-MM-DD.
CURATED_JOBS = [
    {
        "source": "SSSC",
        "title": "Clerk — District Courts of Punjab (1270 posts)",
        "department": "Society for Centralized Recruitment of Staff in Subordinate Courts (SSSC)",
        "location": "Punjab",
        "category": "Other",
        "eligibility": "BA/BSc or equivalent degree, Matriculation with Punjabi, and computer proficiency. Read the official notice for full eligibility and category-wise conditions.",
        "url": "https://www.sssc.gov.in/notice-board",
        "applyUrl": "https://www.sssc.gov.in/",
        "deadline": "2026-11-04",
        "verified": True,
        "needsReview": False
    },
    {
        "source": "UPSC",
        "title": "Direct Recruitment to Various Government of India Posts — Advertisement 12/2026",
        "department": "Union Public Service Commission (UPSC)",
        "location": "All India",
        "category": "Other",
        "eligibility": "Posts, qualifications, age limits and other conditions vary. Read the detailed official advertisement before applying.",
        "url": "https://www.upsc.gov.in/recruitment/recruitment-advertisement",
        "applyUrl": "https://upsconline.nic.in/",
        "deadline": "2026-10-16",
        "verified": True,
        "needsReview": False
    }
]

# Extra notices discovered on official pages are added for manual review.
SOURCES = [
    {"name": "UPSC", "url": "https://www.upsc.gov.in/recruitment/recruitment-advertisement"},
    {"name": "SSC", "url": "https://ssc.gov.in/"},
    {"name": "SSSC", "url": "https://www.sssc.gov.in/notice-board"},
]

NOTICE_WORDS = (
    "notification", "advertisement", "recruitment", "vacancy", "vacancies",
    "employment notice", "posts of", "direct recruitment"
)
SKIP_WORDS = (
    "apply online", "application form", "login", "register", "home",
    "answer key", "result", "admit card", "objection", "exam date"
)

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
            if len(title) < 10 or any(word in lowered for word in SKIP_WORDS):
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
