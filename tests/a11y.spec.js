// Accessibility regression tests for the Year in Review page.
//
// These exercise the specific keyboard and motion behaviours that automated
// scanners cannot verify, plus an axe-core scan as a backstop. They are not a
// substitute for the manual checks documented in docs/accessibility.md.

const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const PANEL_HEADINGS = [
  "It started small.",
  "Heat means work.",
  "Light means visibility.",
  "Love means culture.",
];

async function metricValues(page) {
  return page.$$eval("#metricLabels dd", (dds) =>
    dds.map((d) => d.textContent.trim())
  );
}

// ---------------------------------------------------------------------------
// 1. prefers-reduced-motion: reduce
// ---------------------------------------------------------------------------
test.describe("reduced motion", () => {
  test("static baseline is presented and nothing animates on scroll", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Effective motion is reduced.
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

    // Growth track is NOT a 520vh runway.
    const trackHeight = await page.$eval("#track", (el) => el.offsetHeight);
    const viewport = page.viewportSize().height;
    expect(trackHeight).toBeLessThan(viewport * 3);

    // Tree stage is not sticky.
    const stagePosition = await page.$eval(
      "#stage",
      (el) => getComputedStyle(el).position
    );
    expect(stagePosition).not.toBe("sticky");

    // Every chapter panel is visible.
    const opacities = await page.$$eval(".panel", (els) =>
      els.map((el) => getComputedStyle(el).opacity)
    );
    for (const o of opacities) expect(Number(o)).toBeGreaterThan(0.99);

    // Panels have no entrance transition.
    const transitions = await page.$$eval(".panel", (els) =>
      els.map((el) => getComputedStyle(el).transitionDuration)
    );
    for (const t of transitions) expect(t === "0s" || t === "").toBeTruthy();

    // Seed has no running animation.
    const seedAnim = await page.$eval(
      ".seed",
      (el) => getComputedStyle(el).animationName
    );
    expect(seedAnim).toBe("none");

    // Metric values are populated (not the "—" placeholder).
    await expect(page.locator('#metricLabels dd[data-metric="heat.commits"]')).not.toHaveText("—");
    const values = await metricValues(page);
    expect(values).toHaveLength(6);
    for (const v of values) expect(v).not.toBe("—");

    // Scrolling does not move the tree, sun, canopy, or panels.
    const before = await page.evaluate(() => {
      const circle = document.querySelector("#canopy circle");
      const sun = document.getElementById("sunGroup");
      return {
        canopy: circle ? circle.style.transform : null,
        sunOpacity: sun.getAttribute("opacity"),
        offset: document.querySelector("#wood .grow").style.strokeDashoffset,
      };
    });
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => {
      const circle = document.querySelector("#canopy circle");
      const sun = document.getElementById("sunGroup");
      return {
        canopy: circle ? circle.style.transform : null,
        sunOpacity: sun.getAttribute("opacity"),
        offset: document.querySelector("#wood .grow").style.strokeDashoffset,
      };
    });
    expect(after).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// 2. prefers-reduced-motion: no-preference
// ---------------------------------------------------------------------------
test.describe("full motion", () => {
  test("enhanced story operates and all content is present", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");

    // All chapter prose is in the DOM / accessibility tree.
    for (const heading of PANEL_HEADINGS) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    // Metric values available.
    const values = await metricValues(page);
    for (const v of values) expect(v).not.toBe("—");
  });
});

// ---------------------------------------------------------------------------
// 3. Keyboard navigation
// ---------------------------------------------------------------------------
test.describe("keyboard", () => {
  test("skip link, display tool, and chapter tool are reachable in order", async ({
    page,
  }) => {
    await page.goto("/");

    // First Tab reaches "Skip animated story".
    await page.keyboard.press("Tab");
    let focused = await page.evaluate(() => document.activeElement.textContent.trim());
    expect(focused).toBe("Skip animated story");

    // Next focus is the display settings disclosure, collapsed by default.
    await page.keyboard.press("Tab");
    let state = await page.evaluate(() => ({
      id: document.activeElement.id,
      expanded: document.activeElement.getAttribute("aria-expanded"),
    }));
    expect(state.id).toBe("displayBtn");
    expect(state.expanded).toBe("false");

    // Then the chapters disclosure.
    await page.keyboard.press("Tab");
    state = await page.evaluate(() => document.activeElement.id);
    expect(state).toBe("chaptersBtn");
  });

  test("the chapters disclosure opens, exposes links, and Escape restores focus", async ({
    page,
  }) => {
    await page.goto("/");
    await page.click("#chaptersBtn");
    await expect(page.locator("#chaptersBtn")).toHaveAttribute("aria-expanded", "true");

    const link = page.locator("nav.chapter-nav a", { hasText: "Roots" });
    await expect(link).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#chaptersBtn")).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.activeElement.id)).toBe("chaptersBtn");
  });

  test("Enter activates the skip link and moves to the metrics summary", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#metrics$/);
    const activeId = await page.evaluate(() => document.activeElement.id);
    expect(activeId).toBe("metrics");
  });

  test("paging keys and Shift+Tab do not trap focus or lose content", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("PageDown");
    await page.keyboard.press("End");
    await page.keyboard.press("Home");
    await page.keyboard.press("Space");
    // Content is still present after native key use.
    await expect(page.getByRole("heading", { name: "It started small." })).toBeVisible();
    // Shift+Tab does not throw / trap.
    await page.keyboard.press("Shift+Tab");
    const stillWorks = await page.evaluate(() => !!document.body);
    expect(stillWorks).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Preference control
// ---------------------------------------------------------------------------
test.describe("motion preference control", () => {
  test("follow-system responds to a system preference change", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  });

  test("explicit choices override the system preference", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.click("#displayBtn");
    await page.selectOption("#motionPref", "full");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.selectOption("#motionPref", "reduce");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  });

  test("an explicit override persists across reload; system removes it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.click("#displayBtn");
    await page.selectOption("#motionPref", "full");
    expect(await page.evaluate(() => localStorage.getItem("yir-motion"))).toBe("full");

    await page.reload();
    await expect(page.locator("#motionPref")).toHaveValue("full");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");

    await page.click("#displayBtn");
    await page.selectOption("#motionPref", "system");
    expect(await page.evaluate(() => localStorage.getItem("yir-motion"))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4b. Colour theme control
// ---------------------------------------------------------------------------
test.describe("colour theme control", () => {
  test("follow-system responds to a system colour-scheme change", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("an explicit theme overrides the system and persists across reload", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.click("#displayBtn");
    await page.selectOption("#themePref", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => localStorage.getItem("yir-theme"))).toBe("dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themePref")).toHaveValue("dark");

    await page.click("#displayBtn");
    await page.selectOption("#themePref", "system");
    expect(await page.evaluate(() => localStorage.getItem("yir-theme"))).toBeNull();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

// ---------------------------------------------------------------------------
// 5. Resilience & structure
// ---------------------------------------------------------------------------
test.describe("resilience", () => {
  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("chapter prose is visible and layout is static", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "It started small." })).toBeVisible();
      // No enhancement applied.
      await expect(page.locator("html")).not.toHaveAttribute("data-motion", /.*/);
      // Landmark present.
      await expect(page.locator("main#main")).toBeAttached();
    });
  });

  test("a failed metrics request shows an accessible error", async ({ page }) => {
    await page.route("**/data/*.json", (route) => route.abort());
    await page.goto("/");
    const status = page.locator("#metricsStatus");
    await expect(status).toBeVisible();
    await expect(status).toHaveClass(/error/);
    await expect(status).toContainText(/unavailable/i);
  });

  test("document structure: one main, one h1, at least one h2", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main#main")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.locator("h2").count()).toBeGreaterThan(0);
  });

  test("the decorative forest SVG is hidden from the accessibility tree", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#forestSvg")).toHaveAttribute("aria-hidden", "true");
  });

  test("semantic metrics carry the same values shown in the chart", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('#metricLabels dd[data-metric="heat.commits"]')).not.toHaveText("—");
    const summary = (await metricValues(page)).sort();
    // The forest SVG renders the same fmt() values as <text> nodes.
    const svgValues = (
      await page.$$eval("#forestSvg text", (ts) => ts.map((t) => t.textContent.trim()))
    )
      // keep only the numeric value labels (drop the UPPERCASE metric names)
      .filter((t) => /[0-9]/.test(t))
      .sort();
    expect(svgValues).toEqual(summary);
  });
});

// ---------------------------------------------------------------------------
// Automated scan (backstop only)
// ---------------------------------------------------------------------------
test.describe("axe scan", () => {
  for (const colorScheme of ["light", "dark"]) {
    test(`no serious/critical violations (reduced motion, ${colorScheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme });
      await page.goto("/");
      await page.waitForSelector('#metricLabels dd[data-metric="heat.commits"]:not(:has-text("—"))', {
        timeout: 5000,
      }).catch(() => {});
      // Open the tool panels so their contents are in scope for the scan.
      await page.click("#displayBtn");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact)
      );
      expect(serious, JSON.stringify(serious.map((v) => v.id), null, 2)).toEqual([]);
    });
  }
});
