
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

OUTPUT_FILE = Path("data/pending_jobs.json")
TIMEOUT = 25

# Official recruitment sources to scan.
SOURCES = [
    {
        "name": "Punjab Government",
        "url": "https://punjab.gov.in/recruitments/",
        "region": "Punjab",
    },
    {
        "name": "Punjab Government Recruitment Archive",
        "url": "https://punjab.gov.in/archive/?archivepost=recruitment",
        "region": "Punjab",
    },
    {
        "name": "Punjab Public Service Commission",
        "url": "https://ppsc.gov.in/",
        "region": "Punjab",
    },
    {
        "name": "Punjab Subordinate Services Selection Board",
        "url": "https://sssb.punjab.gov.in/",
        "region": "Punjab",
    },
    {
        "name": "UPSC",
        "url": "https://upsc.gov.in/",
        "region": "Central Government",
    },
    {
        "name": "Staff Selection Commission",
        "url": "https://ssc.gov.in/",
        "region": "Central Government",
    },
    {
        "name": "National Career Service",
        "url": "https://www.ncs.gov.in/latest-update",
        "region": "All India",
    },
    {
        "name": "Sashastra Seema Bal Recruitment",
        "url": "https://www.recruitment.ssb.gov.in/",
        "region": "Central Government",
    },
    {
        "name": "e-Pariksha Recruitment Portal",
        "url": "https://pariksha.nic.in/",
        "region": "Other States / Central",
    },
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 Chrome/124 Safari/537.36"
    )
}

KEYWORDS = re.compile(
    r"\b(recruitment|recruitments|vacanc(?:y|ies)|"
    r"advertisement|advertisements|notification|"
    r"apply online|application form|job opening|"
    r"career|appointment|selection process|"
    r"direct recruitment|employment|latest jobs|"
    r"post of|posts of|engagement of)\b",
    re.IGNORECASE,
)

IGNORE_TEXT = re.compile(
    r"^(home|about us|contact us|privacy policy|"
    r"terms and conditions|accessibility|sitemap|"
    r"login|register|feedback|help|skip to content)$",
    re.IGNORECASE,
)


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def load_pending():
    if not OUTPUT_FILE.exists():
        return []

    try:
        data = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
    except (OSError, json.JSONDecodeError) as error:
        print(f"Warning: Could not read pending file: {error}")

    return []


def page_context(anchor):
    """Get nearby text, such as a table row or list item."""
    node = anchor

    for _ in range(5):
        if node is None:
            break

        if getattr(node, "name", None) in (
            "tr", "li", "article", "section"
        ):
            text = clean(node.get_text(" ", strip=True))
            if text:
                return text[:1500]

        node = getattr(node, "parent", None)

    return clean(anchor.get_text(" ", strip=True))


def find_candidates(source, html):
    soup = BeautifulSoup(html, "html.parser")
    results = []

    for anchor in soup.find_all("a", href=True):
        link_text = clean(anchor.get_text(" ", strip=True))
        context = page_context(anchor)

        if not context or IGNORE_TEXT.fullmatch(link_text):
            continue

        # Skip general navigation links without recruitment context.
        if not KEYWORDS.search(link_text + " " + context):
            continue

        target_url = urljoin(source["url"], anchor["href"].strip())
        parsed = urlparse(target_url)

        if parsed.scheme not in ("http", "https"):
            continue
        if not parsed.netloc:
            continue

        # Do not save links back to the same page as job notices.
        if target_url.rstrip("/") == source["url"].rstrip("/"):
            continue

        title = link_text
        if len(title) < 4 or IGNORE_TEXT.fullmatch(title):
            title = context[:180]

        # Avoid huge text blobs being used as titles.
        title = clean(title)[:180]
        if not title:
            continue

        results.append({
            "title": title,
            "department": source["name"],
            "region": source["region"],
            "location": "",
            "eligibility": "",
            "age": "",
            "fee": "",
            "deadline": "",
            "notice_url": target_url,
            "apply_url": "",
            "source_url": source["url"],
            "source_text": context[:1500],
            "date_checked": datetime.now(
                timezone.utc
            ).strftime("%Y-%m-%d"),
            "status": "pending",
            "needs_manual_verification": True,
        })

    return results


def main():
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    existing = load_pending()
    seen = {
        item.get("notice_url", "").strip()
        for item in existing
        if item.get("notice_url")
    }

    total_found = 0
    total_added = 0
    failed_sources = []

    session = requests.Session()
    session.headers.update(HEADERS)

    for source in SOURCES:
        print(f"Checking: {source['name']}")

        try:
            response = session.get(
                source["url"],
                timeout=TIMEOUT,
                allow_redirects=True,
            )
            response.raise_for_status()

            content_type = response.headers.get(
                "Content-Type", ""
            ).lower()

            if "html" not in content_type:
                print("Skipped: response was not HTML.")
                failed_sources.append(source["name"])
                continue

            candidates = find_candidates(source, response.text)
            total_found += len(candidates)

            added_here = 0

            for job in candidates:
                url = job["notice_url"]

                if url in seen:
                    continue

                existing.append(job)
                seen.add(url)
                total_added += 1
                added_here += 1

            print(
                f"Candidates: {len(candidates)}; "
                f"new: {added_here}"
            )

        except requests.RequestException as error:
            print(f"Source unavailable: {error}")
            failed_sources.append(source["name"])
            continue

    OUTPUT_FILE.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\nScan complete.")
    print(f"Candidates found: {total_found}")
    print(f"New pending links: {total_added}")
    print(f"Total pending links: {len(existing)}")
    print(f"Saved to: {OUTPUT_FILE}")

    if failed_sources:
        print("Sources needing attention:")
        for name in failed_sources:
            print(f"- {name}")

    # Fail the workflow if every source failed.
    if len(failed_sources) == len(SOURCES):
        sys.exit("All sources failed. Check URLs or network access.")


if __name__ == "__main__":
    main()
