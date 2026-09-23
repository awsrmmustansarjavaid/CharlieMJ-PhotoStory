# Building the portable Windows .exe

This wraps the exact same offline app from `/web` in a native window using
Tauri + the Windows WebView2 runtime (already built into Windows 10/11).
There is no bundler, no installer step, and no telemetry — the produced
`.exe` is the portable app itself.

## Option A (easiest): let GitHub build it for you

No Windows PC, no Rust install needed on your side. This repo includes
`.github/workflows/build-windows-exe.yml`, which builds the exe on a real
Windows machine (GitHub's own runner) whenever you trigger it.

1. Push this repo to GitHub.
2. Go to the **Actions** tab → **build-windows-exe** → **Run workflow**.
3. Wait ~3–5 minutes for it to finish.
4. Open the finished run → under **Artifacts**, download
   `CharlieMJ-PhotoStory-Windows-Portable` → unzip it → that's your
   `charliemj-photostory.exe`. Rename it if you like and run it directly,
   no installer.

This workflow only builds the desktop app — it's separate from any web
deployment and won't touch GitHub Pages.

## Option B: build it yourself on a Windows machine

1. Install [Rust](https://rustup.rs) (choose the default MSVC toolchain).
2. Install [Node.js LTS](https://nodejs.org).
3. Open a terminal in `desktop-tauri/` and run:
   ```
   npm install
   ```

## Build the portable exe

```
npm run build -- --no-bundle
```

Tauri compiles a single native binary at:

```
desktop-tauri/src-tauri/target/release/charliemj-photostory.exe
```

That file **is** the portable app. Copy it anywhere (a USB stick, a zip,
a folder) and double-click to run — no installer, no admin rights, no
account, and it never touches the network. Rename it to whatever you like,
e.g. `CharlieMJ-PhotoStory.exe`.

## Try it before building (optional)

```
npm run dev
```

This opens the app in a native window for testing without producing a
release binary.

## Notes

- `bundle.active` is set to `false` in `tauri.conf.json` on purpose, so a
  plain `cargo build --release` / `tauri build` only produces the raw
  `.exe` above and skips creating an installer (`.msi`/`.exe` setup
  wizard). That raw binary is already portable.
- If you'd rather have a proper installer later (Start Menu entry, uninstall
  entry, etc.), flip `bundle.active` to `true` and set
  `bundle.targets` to `["nsis"]`, then add an `.ico` file under
  `src-tauri/icons/icon.ico` (Tauri needs an icon to build an installer).
- The app itself never calls out to the internet — all photo work happens
  locally in the WebView, exactly like the web version.
