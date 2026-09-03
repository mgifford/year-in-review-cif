# Accessibility

This page is built for WCAG 2.2 AA and additionally targets **SC 2.3.3 Animation
from Interactions (AAA)**: the scroll-driven growth animation is motion triggered
by interaction, and it can always be turned off.

## How it works

- **Static baseline first.** With no JavaScript — or before the motion preference
  is resolved — the page is plain document flow: chapter prose is visible, the tree
  is a single complete/stationary illustration, there is no `520vh` runway and no
  sticky stage. The scroll-driven story is layered on only when full motion is
  permitted (`html[data-motion="full"]`).
- **Motion preference control.** A native `Motion` `<select>` near the top of the
  page offers *Follow system* (default), *Reduce motion*, and *Full motion*. An
  explicit choice is stored in `localStorage` (`yir-motion`) and overrides the
  system setting; *Follow system* stores nothing and reacts live to
  `prefers-reduced-motion` changes. If storage is unavailable the page still works.
- **The numbers are real HTML.** The six primary metrics live in a semantic
  `<dl>`; the forest/tree SVGs are decorative (`aria-hidden="true"`). The repository
  ranking is an `<ol>` and the location chips are a `<ul>`, both keeping list
  semantics. Colour is never the only signal — every value is shown as text.
- **Resilience.** If the metrics request fails, an inline, plain-language error is
  shown instead of empty figures. Numeric placeholders never remain blank.

## Automated tests

```bash
npm install
npx playwright install chromium firefox   # first run only
npm test                                   # runs tests/a11y.spec.js in both browsers
```

The suite covers reduced-motion layout and no-scroll-animation, the full-motion
enhancement, keyboard order/activation, the preference control (system response,
explicit override, persistence, and clearing), JS-disabled resilience, the metrics
error state, document structure, the decorative SVG, and an axe-core scan.

The axe scan is a backstop only. It does **not** replace the manual checks below,
and passing automated tests is **not** a claim of full WCAG conformance.

## Manual verification checklist

Perform these on the built site (`npm run build` then serve `_site/`, or
`npm start`):

- [ ] **Keyboard only — Chrome and Firefox.** First `Tab` reaches *Skip animated
      story*; then the `Motion` control; then the four chapter links. `Enter`
      activates the skip and chapter links and lands on meaningful content. Focus
      is always visible and never hidden behind the sticky tree stage.
      `Page Down`, `Space`, arrow keys, `Home`, `End`, and `Shift+Tab` behave
      natively and do not trap focus.
- [ ] **Screen reader — VoiceOver with Safari (and/or Chrome).** Headings form a
      logical `h1 → h2 → h3` outline. The six metrics read from the `<dl>`. The
      forest and tree SVGs are silent. The repo ranking reads as an ordered list.
- [ ] **Windows High Contrast / forced-colours mode.** Text, borders, and panel
      separation remain; focus indicators stay visible; translucency is dropped.
- [ ] **Zoom 200% and 400%.** No clipped caption, controls, headings, or metric
      values; content reflows without horizontal scrolling at 400% / 320px width.
- [ ] **Narrow viewport reflow.** Chapters and the detail grid stack cleanly.
- [ ] **Toggle the OS reduced-motion setting while the page is open** with the
      control on *Follow system*: the layout and motion update without a reload.
- [ ] **`prefers-contrast: more` and `prefers-reduced-transparency: reduce`**
      strengthen borders/contrast and remove translucent cards respectively.

## Known limitations

- The animated tree and forest illustrations are decorative; their exact shapes
  are not described in text because the same information is available as numbers.
- Without JavaScript the live metric values cannot be fetched; the prose remains
  and a `<noscript>` note explains this. The values are not inlined at build time.
