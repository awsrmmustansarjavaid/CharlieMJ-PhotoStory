← [Back to docs index](README.md)

# Technologies, Languages & Frameworks

## Web app (`/web`)

| Piece | Choice | Why |
|---|---|---|
| Markup / styling | **HTML5 + CSS3** | No build step, opens directly in a browser |
| Logic & rendering | **Vanilla JavaScript (ES2020+)** | See note below on why not React |
| Drawing engine | **Canvas 2D API** | Native, fast, exactly what's needed for grids, image transforms, and text |
| File access | **Browser File API** (`<input type=file>`, drag & drop, `FileReader`) | Reads photos locally — nothing is ever uploaded |
| Project persistence | **JSON file download/upload** (`Blob`, `<a download>`) | Simple, portable, human-inspectable project format |

### Why plain JavaScript instead of React?

The original plan (see [07 · Original Concept Notes](07-original-concept-notes.md))
suggested React. For this specific app — a single Canvas-driven editor with
no routing, no component tree of meaningful depth, and no server state —
plain JS keeps things simpler in three concrete ways:

1. **No build step.** `web/index.html` can be opened directly, or dropped
   into any static host, with zero `npm install` / bundler config.
2. **No React ceremony around the Canvas.** The Canvas API is imperative
   by nature (`ctx.drawImage`, `ctx.fillText`, …); wrapping it in React's
   declarative render cycle mostly adds indirection here, since the canvas
   itself is the one thing being drawn to.
3. **Simpler desktop packaging.** The desktop build just points Tauri at
   the same static folder — no separate production build artifact to keep
   in sync.

If the project grows a genuinely component-heavy UI later (multiple
panels, a plugin system, etc.), migrating the *shell* to React while
keeping the Canvas rendering code as-is is a reasonable next step — the
rendering functions in `app.js` don't depend on anything React would
replace.

## Desktop app (`/desktop-tauri`)

| Piece | Choice | Why |
|---|---|---|
| Native shell | **[Tauri](https://tauri.app) v2** (Rust) | Wraps the same `/web` app in a native window |
| Rendering engine | **Windows WebView2** (built into Windows 10/11) | Tauri reuses it instead of shipping a full Chromium copy |
| Build tool | **Cargo** (Rust's package manager) + **Tauri CLI** | Compiles the native `.exe` |
| CI build | **GitHub Actions**, `windows-latest` runner | Builds the exe on a real Windows machine so no local Windows install is required |

### Why Tauri instead of Electron?

Both were mentioned as options. Tauri was chosen because it produces a
dramatically smaller binary (a few MB vs. 100+ MB) by reusing the OS's
own WebView2 runtime rather than bundling a full copy of Chromium plus
Node.js, which matters for a "portable, no-install" tool that's meant to
be small enough to carry around.

## Licensing & tooling

- **License:** MIT
- **Version control / hosting:** GitHub
- **CI:** GitHub Actions (desktop build only — no workflow runs against the
  web app, by design)

Continue to → [04 · How It Works](04-how-it-works.md)
