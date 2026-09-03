#!/usr/bin/env python3
"""
Fetch CivicActions organization metrics from GitHub API.
Aggregates stats across all public repositories for a rolling 1-year period.
Outputs JSON for visualization in year-in-review page.

Usage:
  python scripts/civicactions_metrics.py [--output-dir metrics_data/civicactions]
  
Environment:
  GITHUB_TOKEN (optional): For higher rate limits. Uses 5000 req/hr with token
                          vs 60 req/hr without. GitHub Actions provides this.
"""

import requests
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path


class GitHubMetricsCollector:
    """Collect metrics from GitHub API for an organization."""
    
    def __init__(self, org: str = "civicactions", token: str = None):
        self.org = org
        self.base_url = "https://api.github.com"
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if token:
            self.headers["Authorization"] = f"token {token}"
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def fetch_org_info(self) -> dict:
        """Get organization metadata."""
        url = f"{self.base_url}/orgs/{self.org}"
        resp = self.session.get(url)
        resp.raise_for_status()
        data = resp.json()
        return {
            "name": data.get("name"),
            "login": data.get("login"),
            "public_repos": data.get("public_repos"),
            "followers": data.get("followers"),
            "created_at": data.get("created_at"),
        }
    
    def fetch_all_repos(self) -> list:
        """Get all public repositories for organization (paginated)."""
        repos = []
        page = 1
        per_page = 100
        
        while True:
            url = f"{self.base_url}/orgs/{self.org}/repos"
            params = {
                "type": "public",
                "sort": "updated",
                "direction": "desc",
                "page": page,
                "per_page": per_page,
            }
            resp = self.session.get(url, params=params)
            resp.raise_for_status()
            batch = resp.json()
            
            if not batch:
                break
            
            repos.extend(batch)
            page += 1
        
        return repos
    
    def fetch_org_stats_graphql(self, days: int = 365) -> dict:
        """
        Use GraphQL to get aggregated stats for the organization.
        Includes: commits, contributors, merged PRs in the past N days.
        """
        since_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat().replace("+00:00", "Z")
        
        query = f"""
        query {{
          organization(login: "{self.org}") {{
            repositories(first: 100, privacy: PUBLIC) {{
              nodes {{
                name
                stargazers {{
                  totalCount
                }}
                forks {{
                  totalCount
                }}
                watchers {{
                  totalCount
                }}
                defaultBranchRef {{
                  target {{
                    ... on Commit {{
                      history(first: 0, since: "{since_date}") {{
                        totalCount
                      }}
                    }}
                  }}
                }}
                collaborators(first: 1, affiliation: ALL) {{
                  totalCount
                }}
                pullRequests(first: 0, states: MERGED, orderBy: {{field: UPDATED_AT, direction: DESC}}) {{
                  totalCount
                }}
              }}
            }}
          }}
        }}
        """
        
        url = f"{self.base_url}/graphql"
        payload = {"query": query}
        resp = self.session.post(url, json=payload)
        resp.raise_for_status()
        
        data = resp.json()
        if "errors" in data:
            raise Exception(f"GraphQL error: {data['errors']}")
        
        # Aggregate stats across all repos
        repos = data.get("data", {}).get("organization", {}).get("repositories", {}).get("nodes", [])
        
        stats = {
            "stars": 0,
            "forks": 0,
            "watchers": 0,
            "commits": 0,
            "contributors": 0,
            "prs_merged": 0,
            "repos_count": len(repos),
        }
        
        for repo in repos:
            stats["stars"] += repo.get("stargazers", {}).get("totalCount", 0)
            stats["forks"] += repo.get("forks", {}).get("totalCount", 0)
            stats["watchers"] += repo.get("watchers", {}).get("totalCount", 0)
            
            # Commits in past N days
            history = repo.get("defaultBranchRef", {}).get("target", {}).get("history", {})
            stats["commits"] += history.get("totalCount", 0)
            
            # PRs merged
            prs = repo.get("pullRequests", {})
            stats["prs_merged"] += prs.get("totalCount", 0)
        
        # Note: collaborators field may not give us unique contributors across org
        # This is a known limitation; would need to query each repo's contributors
        stats["contributors"] = len(set(
            c for repo in repos
            for c in repo.get("collaborators", {}).get("nodes", [])
        ))
        
        return stats
    
    def collect(self, days: int = 365) -> dict:
        """Collect all metrics for the organization."""
        print(f"Fetching metrics for {self.org}...")
        
        org_info = self.fetch_org_info()
        print(f"  Organization: {org_info['name']} ({org_info['public_repos']} repos)")
        
        try:
            stats = self.fetch_org_stats_graphql(days=days)
            print(f"  Commits (1y): {stats['commits']}")
            print(f"  Contributors: {stats['contributors']}")
            print(f"  Merged PRs (1y): {stats['prs_merged']}")
            print(f"  Stars: {stats['stars']}")
            print(f"  Forks: {stats['forks']}")
        except Exception as e:
            print(f"  Warning: GraphQL query failed, using REST API fallback: {e}")
            repos = self.fetch_all_repos()
            stats = {
                "stars": sum(r.get("stargazers_count", 0) for r in repos),
                "forks": sum(r.get("forks_count", 0) for r in repos),
                "watchers": sum(r.get("watchers_count", 0) for r in repos),
                "repos_count": len(repos),
                "commits": 0,  # Not available in REST API without per-repo detail
                "contributors": 0,
                "prs_merged": 0,
            }
            print(f"  Stars: {stats['stars']}")
            print(f"  Forks: {stats['forks']}")
        
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=days)
        
        return {
            "generatedAt": now.isoformat().replace("+00:00", "Z"),
            "period": {
                "days": days,
                "start": since.isoformat().replace("+00:00", "Z"),
                "end": now.isoformat().replace("+00:00", "Z"),
            },
            "organization": self.org,
            "orgInfo": org_info,
            "stats": stats,
        }


def save_metrics(metrics: dict, output_dir: str = "metrics_data/civicactions") -> str:
    """Save metrics to JSON file with date stamp."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    file_path = output_path / f"metrics_{date_str}.json"
    
    with open(file_path, "w") as f:
        json.dump(metrics, f, indent=2)
    
    print(f"\nMetrics saved to: {file_path}")
    return str(file_path)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Fetch CivicActions GitHub metrics for 1-year rolling window"
    )
    parser.add_argument(
        "--output-dir",
        default="metrics_data/civicactions",
        help="Output directory for metrics JSON (default: metrics_data/civicactions)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=365,
        help="Days to look back (default: 365)",
    )
    args = parser.parse_args()
    
    # Get GitHub token from environment (set by GitHub Actions)
    token = os.environ.get("GITHUB_TOKEN")
    
    try:
        collector = GitHubMetricsCollector(token=token)
        metrics = collector.collect(days=args.days)
        save_metrics(metrics, output_dir=args.output_dir)
        print("\n✓ Success")
        return 0
    except Exception as e:
        print(f"\n✗ Error: {e}", file=__import__("sys").stderr)
        return 1


if __name__ == "__main__":
    exit(main())
