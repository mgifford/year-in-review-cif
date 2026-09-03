#!/usr/bin/env python3
"""
Cache the organization logo into the repository.

The hero image would otherwise be fetched from github.com on every page view,
which is a third-party request the visitor did not ask for. Downloading it once
at data-refresh time keeps the built site self-contained.
"""

import argparse
import json
import sys
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = REPO_ROOT / "src" / "_data" / "org.json"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "metrics_data" / "org"

# Only formats a browser will render inline as an <img>.
EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/gif": ".gif",
}
MAX_BYTES = 2 * 1024 * 1024


def fetch_logo(url: str, output_dir: Path) -> Path:
    res = requests.get(url, timeout=30, stream=True)
    res.raise_for_status()

    content_type = res.headers.get("Content-Type", "").split(";")[0].strip().lower()
    if content_type not in EXTENSIONS:
        raise ValueError(f"{url} returned {content_type or 'no content type'}, which is not a supported image type.")

    body = res.raw.read(MAX_BYTES + 1, decode_content=True)
    if len(body) > MAX_BYTES:
        raise ValueError(f"{url} is larger than {MAX_BYTES // 1024} KB; refusing to cache it.")

    output_dir.mkdir(parents=True, exist_ok=True)
    # A single stable name, so a format change does not leave a stale file behind.
    for stale in output_dir.glob("logo.*"):
        stale.unlink()

    path = output_dir / f"logo{EXTENSIONS[content_type]}"
    path.write_bytes(body)
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    with args.config.open() as fh:
        org = json.load(fh)

    url = org.get("logo")
    if not url:
        print("No logo configured; the hero will show the organization name alone.")
        return 0
    if not url.startswith("https://"):
        print(f"Error: logo must be an https URL, got {url!r}", file=sys.stderr)
        return 1

    try:
        path = fetch_logo(url, args.output_dir)
    except (requests.RequestException, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    print(f"Cached {url} to {path.relative_to(REPO_ROOT)} ({path.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
