← [Back to docs index](README.md)

# Features

## Shipped in V1 (this repo)

**Canvas & templates**
- Fixed output canvas: **1080 × 1920 px**, **9:16** — matches Instagram Story size exactly
- **2×2** grid template (4 photos)
- **2×3** grid template (6 photos)
- Switching templates keeps whatever photos already fit in the new grid

**Photo controls**
- Add a photo by clicking an empty cell, or via the **+ Add / Replace Photo** button
- **Replace** a photo without losing its position in the grid
- **Remove** a single photo
- **Drag & drop** an image file straight onto a cell
- **Pan**: drag a photo inside its cell to reposition it (so faces don't get cut off)
- **Zoom**: scroll to zoom a photo in/out inside its cell (1×–4×)
- **Rotate** 90° at a time
- **Flip** horizontal / vertical
- **Reset** a cell back to its default position/zoom/rotation

**Text tool**
- Add unlimited text boxes
- Drag any text box anywhere on the canvas
- Edit content, font family (8 web-safe fonts), size, color
- Bold / italic toggles
- Left / center / right alignment

**Basic photo adjustments** (per photo)
- Brightness
- Contrast
- Saturation
- Grayscale

**Project & export**
- **Undo / redo** (up to 60 steps)
- **Save project** to a `.cmjproj.json` file (keeps every photo, position,
  rotation, adjustment, and text box so you can reopen and keep editing)
- **Open project** from that same file
- **Export** a **1080×1920 JPG at 95% quality**

**Distribution**
- Web app: open `web/index.html` directly, or host the `web/` folder anywhere
  (GitHub Pages, Netlify, a plain static server) — it's a complete static site
- Desktop: a **portable Windows `.exe`** (Tauri) — no installer, no admin
  rights, no account, works offline
- MIT licensed, fully open source

## Roadmap (not in V1)

These were noted in the original planning doc as good V2+ candidates:

- Free-form / custom grid layouts beyond 2×2 and 2×3 (a "template designer")
- More filters: vignette, exposure, temperature, highlights/shadows, blur, sharpness
- Stickers / GIF-style elements, a drawing/pen tool, background colors/gradients
- IndexedDB auto-save so in-progress work is never lost on refresh
- PNG export alongside JPG
- A proper Windows installer (Start Menu entry, uninstall entry) as an
  alternative to the raw portable `.exe`

Continue to → [03 · Tech Stack](03-tech-stack.md)
