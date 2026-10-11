← [Docs index](README.md)

# Known limitations & roadmap

* **Filters need `CanvasRenderingContext2D.filter`** (Chrome, Edge, Firefox, the Windows app). Safari ignores brightness/contrast/saturation/blur; sharpness and warmth still work.
* **Folder picker / Open location:** the desktop app has both. In browsers, *Choose folder* works in Chromium-based browsers (File System Access API); otherwise files go to Downloads, and "Open location" cannot be done by a web page.
* **Capture date** uses the file's modified date, not EXIF.
* **Loaded fonts** are session-only and not embedded in project files.
* **Project files** embed full-size images as base64, so they can be large.
* **v1 projects** (`.cmjproj.json`) cannot be imported into v2.
* **Smart placement** is a lightweight edge-energy heuristic, not face detection.
* **Shortcuts** are fixed (not user-remappable yet).
* The Windows `.exe` is built by CI (`.github/workflows/build-windows-exe.yml`); the Rust shell was written but not compiled in the environment that produced this repo — run the workflow once to verify.
