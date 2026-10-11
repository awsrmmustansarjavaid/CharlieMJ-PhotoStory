← [Docs index](README.md)

# Architecture

```mermaid
flowchart LR
  UI[ui.js panels] -->|mutate| State[(core.js state + assets)]
  Editor[editor.js pointer/keys] -->|mutate| State
  State -->|repaint| Render[render.js]
  Layout[layouts.js] --> Render
  Filters[filters.js] --> Render
  Stamp[stamp.js] --> Render
  Render --> Preview[Preview canvas]
  Render -->|any resolution| Export[services.js export]
  Export --> Out[(JPG / PNG / WebP)]
  State --> Project[services.js projects/templates]
  State --> Recovery[settings.js IndexedDB]
  Notify[notify.js] -.-> UI
  Desktop[Tauri main.rs] -.folder picker / files / settings.json.-> Export
```

* **State** is plain JSON (layers, layout, background). Images live in `PS.assets`; state stores only ids, so undo snapshots stay small.
* **Rendering** is one function, `PS.render(ctx, outWidth, state, opts)`. All coordinates are in design units (1080 wide); the context is scaled to the target width, so exports are rendered natively.
* Scripts are classic `<script>` files sharing a `PS` namespace, so the app runs from `file://`, GitHub Pages and the Tauri window alike.
