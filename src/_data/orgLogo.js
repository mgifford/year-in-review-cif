const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "..", "metrics_data", "org");

// Prefer the copy cached by scripts/fetch_org_logo.py so the page makes no
// third-party request. Falls back to the configured URL if it was never run.
module.exports = function () {
  if (!fs.existsSync(DIR)) return null;
  const file = fs.readdirSync(DIR).find((f) => f.startsWith("logo."));
  return file ? `org/${file}` : null;
};
