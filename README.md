<div align="center">

# Charlie MJ PhotoStory

**[🔴 Live Demo](https://awsrmmustansarjavaid.github.io/CharlieMJ-PhotoStory/)** ·  <!-- replace with your actual GitHub Pages URL -->
[📖 Docs](docs/README.md) ·
[⬇️ Download for Windows](../../releases)

<img src="assets/thumbnail.jpg" width="320" alt="Charlie MJ PhotoStory" />

</div>

An open-source, **offline** photo-grid & story editor. Build a **2×2** or
**2×3** photo grid, add text, crop/rotate/zoom each photo, and export a
high-quality **1080×1920 (9:16)** JPG — Instagram Story size. No account,
no login, no upload, no backend.

## Quick start

- **Web:** open [`web/index.html`](web/index.html) in any browser, or use
  the live demo link above.
- **Windows:** grab the portable `.exe` from
  [Releases](../../releases) (or build it yourself — see
  [`desktop-tauri/BUILD-WINDOWS.md`](desktop-tauri/BUILD-WINDOWS.md)).
  No installer, no admin rights.

## Features at a glance

2×2 / 2×3 grids · add/replace/remove photos · drag & drop · pan/zoom/rotate/flip
per photo · text tool (font/size/color/bold/italic/align) · brightness/contrast/
saturation/grayscale · undo/redo · save & reopen projects · HD JPG export ·
100% offline · MIT licensed

**→ Full details, the "why," architecture diagrams, and a step-by-step guide
are all in [`/docs`](docs/README.md):**

| | |
|---|---|
| 📖 [What is this & why](docs/01-overview.md) | ✨ [Features](docs/02-features.md) |
| 🛠️ [Tech stack](docs/03-tech-stack.md) | ⚙️ [How it works](docs/04-how-it-works.md) |
| 🏗️ [Architecture diagrams](docs/05-architecture.md) | 🚀 [Usage guide](docs/06-usage-guide.md) |
| 📝 [Original concept notes](docs/07-original-concept-notes.md) | |

## Repo layout

```
web/              → the app itself (HTML/CSS/JS, no build step)
desktop-tauri/    → wraps web/ into a portable Windows .exe (Tauri)
docs/             → full documentation (linked above)
assets/           → thumbnail / promo image
.github/workflows/→ builds the .exe on GitHub's Windows runners
```

## License

MIT — see [LICENSE](LICENSE).
