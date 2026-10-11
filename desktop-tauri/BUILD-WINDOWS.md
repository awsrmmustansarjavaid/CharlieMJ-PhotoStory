# Get the portable Windows app (v2)

## Automatic (recommended)
1. Push this repo to GitHub **including the hidden `.github` folder** (check that `.github/workflows/build-windows-exe.yml` shows up in the repo).
2. Open the **Actions** tab. You should see TWO workflows: `deploy-web` (the website) and **`build-windows-exe`** (the .exe).
   It starts by itself on each push; or click `build-windows-exe` -> **Run workflow**.
3. Wait ~10-15 min (first build compiles Rust). When it turns green:
   * **Releases** page (right side of repo home) -> `CharlieMJ-PhotoStory-v2-Portable.exe`, or
   * open the finished run -> **Artifacts** -> `CharlieMJ-PhotoStory-v2-Portable`.
4. Double-click the exe. No installer. `settings.json` is created beside it.

If the run is red, open it, expand the red step and send me the error text.

## Locally (Windows)
Install Node 20+, Rust (stable, MSVC); WebView2 ships with Windows 10/11.
```
cd desktop-tauri
npm install
npx tauri build --no-bundle
```
Result: `desktop-tauri/src-tauri/target/release/charliemj-photostory.exe`.
