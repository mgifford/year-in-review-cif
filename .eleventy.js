module.exports = function (config) {
  config.addPassthroughCopy({ "metrics_data/data": "data" });
  config.addPassthroughCopy({ "metrics_data/civicactions": "civicactions" });
  config.addPassthroughCopy("src/metrics-data.js");

  // Set pathPrefix from environment (set by GitHub Actions deploy workflow)
  // For local dev: / (root)
  // For GitHub Pages: /year-in-review-cif/
  let pathPrefix = process.env.BASEURL || '/';

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },

    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
    pathPrefix,
  };
};
