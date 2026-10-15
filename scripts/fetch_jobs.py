import json
import os
from urllib.parse import urljoin, urldefrag

import requests
from bs4 import BeautifulSoup

# Official recruitment pages. This script collects possible notice links only;
# it does NOT claim that a vacancy is verified or currently open.
SOURCES = [
    {"name": "UPSC", "url": "https://upsc.gov.in/examinations/active-exams"},
    {"name": "SSC", "url": "https://ssc.gov.in/"},
]

NOTICE_WORDS = (
    "notification", "advertisement", "recruitment", "vacancy",
    "examination", "exam notice", "notice", "employment notice",
    "corrigendum", "important notice"
)
SKIP_WORDS = ("apply online", "application form", "login", "register", "home")

candidates = []
seen_urls = set()

for source in SOURCES:
    try:
        response = requests.get(
            source["url"],
            timeout=20,
            headers={"User-Agent": "Mozilla/5.0 (compatible; JaimalwalaGovtJobs/1.0)"}
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        for anchor in soup.find_all("a", href=True):
            title = " ".join(anchor.get_text(" ", strip=True).split())
            lowered = title.lower()
            if len(title) < 8 or any(word in lowered for word in SKIP_WORDS):
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
    json.dump(candidates, output, ensure_ascii=False, indent=2)

print(f"Saved {len(candidates)} possible notice links for manual review.")
