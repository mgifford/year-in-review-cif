// Points at one generated snapshot from metrics_data/data/ (see scripts/generate_metrics.py).
// Update this filename to feature a different run.
const DATA_FILE = "metrics_2026-06-08_to_2026-08-07.json";

// CivicActions metrics (fetch latest available)
const CIVICACTIONS_DIR = "metrics_data/civicactions";

const EMPTY_DATA = {
  period: { start: null, end: null },
  heat: { commits: 0, committers: 0 },
  light: { watchers: 0, stars: 0 },
  love: { forks: 0, prsMerged: 0 },
  topRepos: [],
  locations: [],
  error: true,
};

const EMPTY_CIVICACTIONS_DATA = {
  organization: "civicactions",
  period: { start: null, end: null, days: 365 },
  orgInfo: {},
  stats: {
    stars: 0,
    forks: 0,
    watchers: 0,
    repos_count: 0,
    commits: 0,
    contributors: 0,
    prs_merged: 0,
  },
  error: true,
};

function sumBy(repos, key) {
  return repos.reduce((total, repo) => total + (repo[key] || 0), 0);
}

function uniqueCommitterCount(repos) {
  const logins = new Set();
  repos.forEach((repo) => {
    (repo.contributors || []).forEach((c) => logins.add(c.name));
  });
  return logins.size;
}

function topReposByCommits(repos, limit = 10) {
  return [...repos]
    .sort((a, b) => b.total_commit_count - a.total_commit_count)
    .slice(0, limit)
    .map((repo) => ({ name: repo.name, commits: repo.total_commit_count }));
}

function uniqueLocations(repos) {
  const locations = new Set();
  repos.forEach((repo) => {
    (repo.contributors || []).forEach((c) => {
      if (c.location) locations.add(c.location);
    });
  });
  return [...locations];
}

export async function loadYearInReviewData() {
  try {
    const res = await fetch(`data/${DATA_FILE}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const repos = raw.repos || [];

    return {
      period: raw.period || { start: null, end: null },
      heat: {
        commits: sumBy(repos, "total_commit_count"),
        committers: uniqueCommitterCount(repos),
      },
      light: {
        watchers: sumBy(repos, "watchers_count"),
        stars: sumBy(repos, "stargazers_count"),
      },
      love: {
        forks: sumBy(repos, "forks_count"),
        prsMerged: sumBy(repos, "merged_pr_count"),
      },
      topRepos: topReposByCommits(repos),
      locations: uniqueLocations(repos),
      error: false,
    };
  } catch (e) {
    console.error("Failed to load Year in Review data:", e);
    return EMPTY_DATA;
  }
}

/**
 * Load latest CivicActions metrics from generated JSON.
 * Returns the most recent metrics file available.
 */
export async function loadCivicActionsMetrics() {
  try {
    // Try to fetch the latest metrics
    // Since we generate daily, we check a range of recent dates
    const today = new Date();
    
    for (let daysBack = 0; daysBack < 7; daysBack++) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysBack);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const res = await fetch(`civicactions/metrics_${dateStr}.json`);
        if (res.ok) {
          const data = await res.json();
          return { ...data, error: false };
        }
      } catch {
        // Try next date
        continue;
      }
    }
    
    // If no recent data found, return empty
    console.warn("No recent CivicActions metrics found");
    return EMPTY_CIVICACTIONS_DATA;
  } catch (e) {
    console.error("Failed to load CivicActions metrics:", e);
    return EMPTY_CIVICACTIONS_DATA;
  }
}
