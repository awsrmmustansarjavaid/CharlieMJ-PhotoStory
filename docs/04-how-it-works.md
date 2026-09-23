← [Back to docs index](README.md)

# How It Works

Everything in the editor revolves around one JavaScript object, `state`,
and one function that turns it into pixels, `renderToContext()`. That
split — **state in, pixels out** — is the whole architecture.

## The state

```js
state = {
  template: "2x2" | "2x3",
  cells: [ { src, img, offX, offY, zoom, rotation, flipH, flipV,
             brightness, contrast, saturation, grayscale }, ... ],
  texts: [ { content, x, y, fontSize, fontFamily, color, bold, italic, align }, ... ]
}
```

- `cells` has 4 entries for a 2×2 grid, 6 for a 2×3 grid. Each cell knows
  its own photo (`src`/`img`) and its own transform — nothing is global,
  so every photo can be zoomed, panned, rotated, and adjusted independently.
- `offX` / `offY` are stored as **fractions of the cell size**, not pixels.
  That's what lets the exact same state render correctly at preview size
  (540×960) and at export size (1080×1920) — everything scales together.
- `texts` positions (`x`, `y`) are similarly stored as **fractions of the
  full canvas** (0–1), for the same reason.

## Rendering a frame

`renderToContext(ctx, width, height, interactive)` is called on every
change (drag, zoom, slider move, template switch, undo, …):

1. Fill the background.
2. Compute each cell's rectangle for the current template (`cellRects()`).
3. For each cell with a photo: clip to the cell rectangle, apply a CSS
   `filter` string built from that cell's brightness/contrast/saturation/
   grayscale, then draw the image scaled to **cover** the cell (like
   `background-size: cover`), offset by `offX`/`offY` and multiplied by
   `zoom`, rotated by `rotation`, flipped by `flipH`/`flipV`.
4. For each text box: translate to its `x,y` position, set the font string
   from its bold/italic/family/size, and draw it.
5. If `interactive` is true (the on-screen preview, not the export), also
   draw a selection outline around whatever cell or text is currently selected.

Because the **preview canvas** (540×960) and the **hidden export canvas**
(1080×1920) both go through this exact same function, what you see while
editing is guaranteed to match what gets exported — just at 2× the
resolution.

## Interaction model

- **Click an empty cell** → opens the file picker for that cell.
- **Click a cell with a photo** → selects it (shows its sliders in the
  right-hand panel) and arms it for dragging.
- **Drag on a cell** → updates that cell's `offX`/`offY`.
- **Scroll on a cell** → updates that cell's `zoom` (clamped 1×–4×).
- **Click a text box** → selects it and arms it for dragging.
- **Drag a text box** → updates its `x`/`y`.
- Every drag/scroll/slider action calls `render()` continuously for
  instant feedback, and calls `pushHistory()` once the interaction ends
  (mouse-up, or a short pause after scrolling) — so undo/redo captures
  meaningful steps rather than every intermediate pixel of a drag.

## Undo / redo

`pushHistory()` serializes `state` (minus the actual `Image` objects,
which aren't JSON-safe) into a history array. `undo()`/`redo()` move a
pointer through that array and rebuild `state` from the chosen snapshot,
re-creating `Image` objects from their stored `src` (a data URL, which
the browser has already cached, so this is effectively instant).

## Saving/opening a project

"Save" serializes the same `state` shape (template, cells, texts) —
**including each photo's data URL** — to a single `.cmjproj.json` file.
"Open" reads that file back, recreates every `Image`, and restores
`state` exactly. Because the photos are embedded in the file, a project
file is fully self-contained — it opens correctly on a different machine
with no missing-image links.

## Exporting

"Export JPG" runs `renderToContext()` once more, this time against the
hidden `1080×1920` canvas with `interactive = false` (so no selection
outlines get baked into the image), then calls `canvas.toBlob(..., "image/jpeg", 0.95)`
and triggers a browser download.

Continue to → [05 · Architecture](05-architecture.md)
