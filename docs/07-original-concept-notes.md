← [Back to docs index](README.md)

# Original Concept Notes

These are the original planning notes this project was built from —
kept here as a historical reference so the reasoning behind V1's scope
(and ideas for later versions) isn't lost.

> Note: the two sections below ("Desktop-first plan" and "Web app plan")
> were originally written about slightly different tech choices than the
> ones actually used in this repo. See [03 · Tech Stack](03-tech-stack.md)
> for what was actually built and why it differs (plain JS + Tauri
> instead of React + Electron/Tauri, no PySide6/Python build).

## Desktop-first plan

This app is an offline **Instagram-Story-style photo collage + editor**:
add photos, build a **2×2 (4-photo)** or **2×3 (6-photo)** grid, remove
or replace any photo, crop/rotate/zoom/reposition each one so faces never
get cut off, add text with font/size/color control, apply basic
brightness/contrast/saturation/grayscale adjustments, and export as an
**HD JPG at Instagram Story size (1080×1920, 9:16)** — regardless of how
many photos are in the grid. It needs to work completely offline, be
portable (no installation), require no account or login, and be fully
open source under the MIT license.

The original plan recommended a small set of **essential** editing tools
for V1 (crop, rotate 90°, flip, zoom, brightness, contrast, saturation,
sharpness, blur, grayscale) and left richer tools (vignette, exposure,
highlights/shadows, temperature, hue, background blur) for later
versions — the guiding principle being **"don't build a Photoshop
clone, build a focused, fast vertical photo-story/grid editor first."**

It also called out separating the interactive **preview** (rendered
smaller, for responsiveness) from the **final export** (rendered at full
1080×1920 quality only when exporting) — the same idea this project's
render pipeline uses (see [04 · How It Works](04-how-it-works.md)).

A **project save** feature (remembering photos, positions, crops,
rotation, grid, text, fonts, and adjustments so a project can be reopened
and continued later) was called out as important rather than optional —
this became the `.cmjproj.json` format.

**Suggested roadmap stages:** V0.1 basic canvas + grids + export → V0.2
photo controls (crop/zoom/position/rotate/flip/replace) → V0.3 text tool
→ V0.4 adjustments → V0.5 project system (save/open/undo/redo) → V1.0
portable release (exe, icon, GitHub repo, docs, license, GitHub Release).

A later idea worth keeping in mind: a **Template Designer**, so instead
of being limited to 2×2 and 2×3, a user could define custom layouts
(e.g. one large photo on top, two side-by-side below, one wide photo at
the bottom).

## Web app plan

The web version was planned as a frontend-only build — HTML, CSS,
JavaScript, Canvas API, the browser's File API, and optionally
`localStorage`/IndexedDB for project saving — with no backend required,
able to implement nearly the full feature set (grids, add/remove/replace,
drag & drop, crop/zoom/move/rotate/flip, text boxes with fonts/colors,
basic adjustments, undo/redo, HD JPG export) entirely client-side. The
plan was to build this once and reuse the same frontend for the portable
desktop build via Tauri or Electron, rather than maintaining two
separate codebases — which is exactly what this repo does (`desktop-tauri/`
just points at `/web`, it doesn't duplicate it).

Later ideas noted for a richer version: stickers/GIF-style elements, a
drawing/pen tool, and background colors/gradients — while being careful
to reproduce only *similar functionality and interaction patterns*, not
Instagram's actual proprietary UI or assets, which is also why the app
name deliberately avoids the word "Instagram."

## Naming

The name **Charlie MJ PhotoStory** was chosen from a shortlist that also
included *Charlie MJ Story Studio*, *Charlie MJ StoryGrid*, *Charlie MJ
PhotoCanvas*, and *Charlie MJ PhotoCraft* — "PhotoStory" was picked for
being immediately understandable about what the app does, while leaving
room to describe it generally as *"an open-source desktop photo collage
and vertical story editor"* rather than tying it to one platform's name.
