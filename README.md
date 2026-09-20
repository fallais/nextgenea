# Geneanext

Turns a GEDCOM file into a print-ready ancestor poster. Runs entirely in the
browser; the file is never uploaded.

```bash
npm install
npm run fonts   # subset the poster typefaces into public/fonts
npm run dev
```

Drop `sample.ged` on the landing page to try it (`npm run sample` regenerates
it; pass a depth: `node scripts/make-sample-gedcom.mjs 12 > deep.ged`).

## Things that will bite you

**One component draws the poster.** `components/PosterSvg.tsx` renders an SVG in
real millimetres — `width="420mm"` against a matching `viewBox`. The preview is
that element sized down; the PDF is that element handed to svg2pdf. Never add a
second drawing path.

**Poster colours must be literal, never `var(--x)`.** svg2pdf reads presentation
attributes and never calls `getComputedStyle`, so a custom property reaches the
PDF unresolved. CSS variables are fine for the app chrome, which the theme no
longer touches anyway.

**`letter-spacing` is ignored by svg2pdf; `textLength` is honoured.** Tracked
lines carry an explicit `textLength` and anchor at `start` — see `TextLine`.

**No SVG filters.** They rasterise.

**Text is measured with a width table** (`lib/text.ts`), not the DOM, so
truncation is baked into the SVG and can't depend on webfont timing. Surnames
are never abbreviated — the card grows instead. Only places may be clipped.

**The page is an output.** It equals its content; nothing is clamped to fit a
format. SVG export has no ceiling. PDF stops at 14400pt a side, then uses
`/UserUnit` (which some viewers ignore), then gives up and the button disables.

**Font weights are only 400 and 700.** svg2pdf collapses SVG weights onto
`normal`/`bold`; a 600 is looked up under a style that was never registered and
silently falls back to Times.

## Layout

Ahnentafel: root is 1, parents of `n` are `2n` and `2n+1`. Leaves take a slot in
turn, every other node centres between its outermost parents, and a node wider
than its band pushes its ancestors apart. With placeholders on this reproduces
an even grid; with them off the gaps close.

`lib/tree/layout.ts` resolves all geometry and typography. `PosterSvg` only maps
the result onto elements.

## Themes

One object in `lib/themes/`, registered in `themes/index.ts`. Nothing refers to
a theme by name. The lion in `themes/lion.ts` is from Wikimedia Commons ("Lion
héraldique" by Zigeuner, CC BY-SA 2.5), reduced to six silhouette paths.
