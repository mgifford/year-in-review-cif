const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

// The site is static, so the browser cannot list a directory. Resolve the
// newest snapshot at build time and hand the filename to the client.
function newest(dir, prefix) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return null;
  const files = fs
    .readdirSync(full)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort();
  return files.length ? files[files.length - 1] : null;
}

module.exports = function () {
  return {
    github: newest("metrics_data/data", "metrics_"),
    drupal: fs.existsSync(path.join(ROOT, "metrics_data/drupal/latest.json"))
      ? "latest.json"
      : null,
  };
};
