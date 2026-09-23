← [Back to docs index](README.md)

# Usage Guide

## A. Opening the app

- **Web:** double-click `web/index.html` (or open your hosted link, e.g.
  GitHub Pages) in Chrome, Edge, or Firefox.
- **Desktop:** double-click `charliemj-photostory.exe`. No install, no
  admin rights, no account.

Either way you land on the same screen: a dark editor with a **Tools**
panel on the left, the **canvas** in the middle, and a **Properties**
panel on the right.

## B. Build a story, step by step

1. **Pick a template.** In the left panel under **Template**, choose
   **2 × 2** (4 photos) or **2 × 3** (6 photos).
2. **Add your photos.** Click any empty (dashed) cell — a file picker
   opens; choose a photo. Repeat for every cell, or drag image files
   straight from your file explorer onto the cells.
3. **Reposition a photo.** Click a filled cell to select it, then:
   - **Drag** inside the cell to move the photo around.
   - **Scroll** to zoom in/out.
   - Use the **Transform** buttons (left panel) to **Rotate 90°**,
     **Flip Horizontal**, **Flip Vertical**, or **Reset Position**.
4. **Adjust a photo.** With a photo cell selected, the right-hand
   **Properties** panel shows sliders for **Zoom, Brightness, Contrast,
   Saturation, Grayscale** — drag any slider to taste.
5. **Add text.** Click **+ Add Text** in the left panel. A text box
   appears in the middle of the canvas:
   - **Drag** it to wherever you want.
   - Use the **Properties** panel to edit its content, font, size,
     color, bold/italic, and alignment.
   - Click **Delete Selected Text** to remove it.
6. **Replace or remove a photo** any time: select its cell, then use
   **+ Add / Replace Photo** or **Remove Photo** in the left panel.
7. **Undo / Redo** using the top-bar buttons, or `Ctrl+Z` / `Ctrl+Y`.
8. **Export.** Click **Export JPG** in the top bar. A `CharlieMJ-Story.jpg`
   file downloads — 1080×1920, 95% quality, ready to post.

## C. Saving your work for later

Unlike a plain JPG export, a **project file** remembers every photo,
position, adjustment, and text box so you can come back and keep editing.

- Click **Save** (top bar) → downloads `CharlieMJ-Project.cmjproj.json`.
- Click **Open** (top bar) → pick that file → your whole canvas is restored.

Keep the `.cmjproj.json` file if you might want to tweak the story again
later; you only need the exported `.jpg` for actually posting it.

## D. Starting over

Click **New** in the top bar (it will ask you to confirm) to reset to a
blank 2×2 canvas.

## E. Building the portable `.exe` yourself

If you've changed the code and want a fresh build, see
[`desktop-tauri/BUILD-WINDOWS.md`](../desktop-tauri/BUILD-WINDOWS.md) —
the short version is: push to GitHub, run the **build-windows-exe**
GitHub Action, and download the compiled `.exe` from that run's Artifacts.

---

Back to → [Docs Index](README.md) · [Main README](../README.md)
