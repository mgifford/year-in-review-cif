#!/usr/bin/env python3
"""
Collect an organization's public contribution data from Drupal.org.

Everything here comes from the public api-d7 endpoint for the organization
node. Drupal.org does not allow the public API to filter issue credits by
organization (field_attribute_contribution_to returns 403), so the per-issue
detail is not available; the aggregate counters on the organization node are
the authoritative public figures and are what this script records.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

API = "https://www.drupal.org/api-d7"
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = REPO_ROOT / "src" / "_data" / "org.json"


def load_config(path: Path) -> dict:
    with path.open() as fh:
        return json.load(fh)


def fetch_org_node(session: requests.Session, nid=None, title=None) -> dict:
    """Fetch the organization node by node id, or look it up by title."""
    if nid:
        res = session.get(f"{API}/node/{nid}.json", timeout=30)
        res.raise_for_status()
        return res.json()

    if not title:
        raise ValueError("Provide either a Drupal.org node id or an organization title.")

    res = session.get(
        f"{API}/node.json", params={"type": "organization", "title": title}, timeout=30
    )
    res.raise_for_status()
    matches = res.json().get("list", [])
    if not matches:
        raise LookupError(f"No Drupal.org organization node titled {title!r}.")
    return matches[0]


def to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def office_locations(node: dict) -> list:
    seen, out = set(), []
    for loc in node.get("field_office_locations") or []:
        city = (loc.get("locality") or "").strip()
        region = (loc.get("administrative_area") or "").strip()
        country = (loc.get("country") or "").strip()
        label = ", ".join(p for p in (city, region or country) if p)
        if label and label not in seen:
            seen.add(label)
            out.append(label)
    return out


def collect(nid=None, title=None) -> dict:
    session = requests.Session()
    session.headers.update({"User-Agent": "year-in-review-metrics (+https://github.com)"})
    node = fetch_org_node(session, nid=nid, title=title)

    now = datetime.now(timezone.utc)
    return {
        "generatedAt": now.isoformat().replace("+00:00", "Z"),
        "source": "https://www.drupal.org/api-d7",
        "organization": {
            "title": node.get("title"),
            "nid": to_int(node.get("nid")),
            "url": node.get("url"),
            "headquarters": node.get("field_organization_headquarters"),
            "offices": office_locations(node),
            # e.g. certified_gold, drupalcares_2020_champion
            "badges": node.get("field_organization_support") or [],
        },
        "stats": {
            # Issue credits earned in the trailing year. This is the headline
            # figure Drupal.org itself reports for an organization.
            "issueCreditsYear": to_int(node.get("field_org_issue_credit_year")),
            # A shorter recent window; Drupal.org does not document the span,
            # so it is recorded but deliberately not labelled as a duration.
            "issueCreditsRecent": to_int(node.get("field_org_issue_credit_count")),
            # Higher is more contribution, despite the "rank" field name.
            "contributionScore": to_int(node.get("field_org_contribution_rank")),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output-dir", type=Path, default=REPO_ROOT / "metrics_data" / "drupal")
    args = parser.parse_args()

    drupal = load_config(args.config).get("drupal", {})
    if not drupal.get("enabled", False):
        print("Drupal.org collection is disabled in the org config; nothing to do.")
        return 0

    try:
        metrics = collect(nid=drupal.get("nid"), title=drupal.get("orgTitle"))
    except (requests.RequestException, LookupError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    args.output_dir.mkdir(parents=True, exist_ok=True)
    out = args.output_dir / "latest.json"
    out.write_text(json.dumps(metrics, indent=2) + "\n")

    stats = metrics["stats"]
    print(f"{metrics['organization']['title']}: {stats['issueCreditsYear']} issue credits in the past year")
    print(f"Saved to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
