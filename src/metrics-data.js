// The build resolves the newest snapshot in metrics_data/data/ and exposes the
// filename on window. There is deliberately no hardcoded fallback: a stale name
// could belong to a different organization, so no data means the error state.
const DATA_FILE = window.YIR_DATA_FILE || null;

const EMPTY_DATA = {
  period: { start: null, end: null },
  heat: { commits: 0, committers: 0 },
  light: { watchers: 0, stars: 0 },
  love: { forks: 0, prsMerged: 0 },
  topRepos: [],
  locations: [],
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
    if (!DATA_FILE) throw new Error("No metrics snapshot was built into this site.");
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
