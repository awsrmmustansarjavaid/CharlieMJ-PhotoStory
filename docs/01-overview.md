← [Back to docs index](README.md)

# 1. What Is This Project?

**Charlie MJ PhotoStory** is a small, focused, open-source photo editor for
one specific job: turning a handful of photos into a single **Instagram
Story-shaped** image — a **2×2** or **2×3** photo grid, with text on top,
exported as a high-quality **1080×1920 (9:16) JPG**.

It ships as two things built from the same codebase:

- A **web app** — plain HTML/CSS/JS, runs in any browser, nothing to install.
- A **portable Windows `.exe`** — the same app in a native window, built
  with [Tauri](https://tauri.app), no installer, no admin rights, no account.

Both run **100% offline**. Photos never leave the device — there is no
backend, no upload, no login, no analytics.

## 2. Why This Was Built

Instagram, Canva, and similar tools can make a photo-grid story, but they
all come with trade-offs this project avoids on purpose:

- They usually require an **account** and an **internet connection**.
- Photos are **uploaded** to someone else's server to be processed.
- The tool tries to do *everything* (filters, stickers, templates, ads),
  which makes the one thing you actually want — "put 4 photos in a grid,
  add text, export at story size" — slower to get to.
- None of them are **open source**, so you can't fix, extend, or fully
  trust what happens to your photos.

Charlie MJ PhotoStory is the opposite of that: a small, single-purpose,
transparent tool. You can read every line of code that touches your
photos, because there are only three files in the web app
(`index.html`, `style.css`, `app.js`) and no network calls in any of them.

## 3. Who It's For

- Anyone who regularly makes 4-photo or 6-photo story collages and is
  tired of doing it through a bloated app or a phone app with ads.
  Anyone who wants a **portable**, no-install tool they can carry on a
  USB stick and run on any Windows PC.
- Anyone who cares that their photos stay on their own device.
- Developers who want a small, readable open-source Canvas-editor
  codebase to learn from or build on.

Continue to → [02 · Features](02-features.md)
