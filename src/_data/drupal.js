const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "..", "metrics_data", "drupal", "latest.json");

const BADGE_LABELS = {
  certified_gold: "Certified Drupal Gold Partner",
  certified_silver: "Certified Drupal Silver Partner",
  drupalcares_2020_champion: "Drupal Cares Champion",
  drupal_ai_gold_sponsor: "Drupal AI Gold Sponsor",
};

module.exports = function () {
  if (!fs.existsSync(FILE)) return null;
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  return {
    ...data,
    badgeLabels: (data.organization.badges || []).map(
      (b) => BADGE_LABELS[b] || b.replace(/_/g, " ")
    ),
  };
};
