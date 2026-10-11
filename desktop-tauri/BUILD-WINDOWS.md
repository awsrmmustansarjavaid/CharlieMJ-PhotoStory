# Build the portable Windows app (v2)

**Easiest:** push the repo to GitHub → *Actions → build-windows-exe → Run workflow* → the finished `CharlieMJ-PhotoStory-v2-Portable.exe` appears on the **Releases** page (and as a run artifact).

**Locally (Windows):** install Node 20+, Rust (stable, MSVC) and WebView2, then:

```
cd desktop-tauri
npm install
npx tauri build --no-bundle
```
The exe is at `desktop-tauri/src-tauri/target/release/charliemj-photostory.exe`. Put it in any folder; `settings.json` is created beside it.

Native helpers (see `src-tauri/src/main.rs`): `pick_folder`, `save_file`, `reveal_file`, `read_settings`, `write_settings`.
