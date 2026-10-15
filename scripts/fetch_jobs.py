import json
import os
import requests
from bs4 import BeautifulSoup

# Official source URLs — ਬਾਅਦ ਵਿੱਚ ਹੋਰ official sources ਜੋੜ ਸਕਦੇ ਹਾਂ
SOURCES = [
    {
        "name": "UPSC",
        "url": "https://upsc.gov.in/examinations/active-exams"
    },
    {
        "name": "SSC",
        "url": "https://ssc.gov.in/"
    }
]

jobs = []

for source in SOURCES:
    try:
        response = requests.get(
            source["url"],
            timeout=20,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        jobs.append({
            "source": source["name"],
            "url": source["url"],
            "title": f"{source['name']} - Official Jobs/Notifications",
            "verified": True
        })

    except Exception as e:
        print(f"Could not fetch {source['name']}: {e}")

os.makedirs("data", exist_ok=True)

with open("data/pending_jobs.json", "w", encoding="utf-8") as f:
    json.dump(jobs, f, ensure_ascii=False, indent=2)

print(f"Saved {len(jobs)} official source candidates.")
