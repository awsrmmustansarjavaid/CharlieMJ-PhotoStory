# Build the portable Windows app (v2)

**Easiest:** push the repo to GitHub → *Actions → build-windows-exe → Run workflow* → download the artifact `CharlieMJ-PhotoStory-Windows-Portable` (a single `.exe`, no installer).

**Locally (Windows):** install Node 20+, Rust (stable, MSVC) and WebView2, then:

```
cd desktop-tauri
npm install
npx tauri build --no-bundle
```
The exe is at `desktop-tauri/src-tauri/target/release/charliemj-photostory.exe`. Put it in any folder; `settings.json` is created beside it.

Native helpers (see `src-tauri/src/main.rs`): `pick_folder`, `save_file`, `reveal_file`, `read_settings`, `write_settings`.
