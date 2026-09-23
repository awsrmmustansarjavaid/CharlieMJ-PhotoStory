# Charlie MJ PhotoStory

An open-source, offline photo-grid & story editor. Build a **2×2** or
**2×3** photo grid, add text, crop/rotate/zoom each photo, and export a
high-quality **1080×1920 (9:16)** JPG — the same size Instagram Stories use.

No accounts. No login. No uploads. No backend. Everything runs on your
own device.

## What's in this repo

```
CharlieMJ-PhotoStory/
├── web/                 → the actual app (plain HTML/CSS/JS + Canvas)
│    ├── index.html
│    ├── style.css
│    └── app.js
├── desktop-tauri/        → wraps /web into a native portable Windows .exe
│    ├── src-tauri/
│    └── BUILD-WINDOWS.md → step-by-step build instructions
├── LICENSE               → MIT
└── README.md
```

There is **no GitHub Actions workflow** in this repo, by design — you can
run the web app by just opening `web/index.html`, or host it yourself
(GitHub Pages, Netlify, a plain static server, anything), with no CI
required.

## Features (V1)

- 2×2 (4 photo) and 2×3 (6 photo) grid templates
- Fixed 1080×1920 / 9:16 canvas, matching Instagram Story size
- Add / replace / remove photos, drag-and-drop supported
- Per-photo pan (drag) and zoom (scroll wheel) so faces never get cut off
- Rotate 90°, flip horizontal/vertical, reset transform
- Text tool: add, drag to move, edit content, font, size, color, bold/italic, alignment
- Basic adjustments per photo: brightness, contrast, saturation, grayscale
- Undo / redo
- Save/open a project file (`.cmjproj.json`) to keep editing later
- Export a high-quality 1080×1920 JPG (95% quality)
- 100% offline, no network calls, no analytics

## Running the web app

Just open `web/index.html` in a browser — no build step, no npm install.
(Chrome, Edge, or Firefox recommended for best Canvas/File API support.)

If you want to host it (e.g. GitHub Pages), the `web/` folder alone is a
complete, self-contained static site.

## Building the portable Windows .exe

See [`desktop-tauri/BUILD-WINDOWS.md`](desktop-tauri/BUILD-WINDOWS.md).
Short version: it uses [Tauri](https://tauri.app) to wrap the exact same
`web/` app in a native window using Windows' built-in WebView2 runtime.
The result is a single small `.exe` — no installer, no admin rights.

**Why isn't a ready-built `.exe` included in this zip?** Compiling a
native Windows binary requires a Windows machine with the Rust + MSVC
toolchain, which isn't available in the environment that generated this
repo. The build instructions get you a working portable exe in about
10–15 minutes on any Windows PC. If you'd like, this can also be
automated later with a GitHub Actions release workflow that attaches the
built `.exe` to a GitHub Release automatically — just say the word,
since you said you didn't want a workflow on the web app, it's kept out
by default here.

## What was reused from your original idea doc

The grid sizes, 1080×1920/9:16 output, per-photo positioning, text tool,
basic adjustments, undo/redo, project save, and MIT license all come
straight from your original notes. Two changes from the very first draft
you were given:

- **Vanilla HTML/CSS/JS + Canvas instead of React.** For a single-file,
  no-build-step app like this, plain JS keeps the whole thing readable,
  fast, and trivially portable into a Tauri window — no bundler required.
  React can be layered in later if you want a more component-driven
  codebase, but it isn't necessary for this feature set.
- **Tauri instead of Electron.** Tauri produces a dramatically smaller
  `.exe` (a few MB vs. 100+ MB) because it reuses the WebView2 runtime
  already built into Windows, rather than shipping a full Chromium copy.

## Roadmap ideas (not in V1)

- Free-form/custom grid layouts beyond 2×2 and 2×3
- More filters (vignette, exposure, temperature, highlights/shadows)
- IndexedDB auto-save so you never lose work-in-progress
- A proper Windows installer + Start Menu shortcut (optional, see
  `BUILD-WINDOWS.md`)

## License

MIT — see [`LICENSE`](LICENSE).
