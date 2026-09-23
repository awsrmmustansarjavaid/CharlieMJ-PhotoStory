← [Back to docs index](README.md)

# Architecture

GitHub renders the diagrams below automatically since they're plain
```mermaid``` code fences — no image files to keep in sync.

## 1. Project layout

```mermaid
flowchart TB
    subgraph Repo["CharlieMJ-PhotoStory (this repo)"]
        subgraph Web["web/  — the actual app"]
            HTML["index.html"]
            CSS["style.css"]
            JS["app.js<br/>(state + render + interaction)"]
        end
        subgraph Desktop["desktop-tauri/ — native wrapper"]
            Conf["src-tauri/tauri.conf.json<br/>points at ../../web"]
            Main["src-tauri/src/main.rs<br/>opens a native window"]
        end
        subgraph CI[".github/workflows/"]
            Wf["build-windows-exe.yml<br/>runs on windows-latest"]
        end
        Docs["docs/ — this documentation"]
    end
    Desktop -- "loads" --> Web
    Wf -- "builds" --> Desktop
```

The desktop app has **no copy** of the frontend — `tauri.conf.json`'s
`frontendDist` points straight at `../../web`, so the web app and the
desktop app are always running identical code.

## 2. Runtime data flow (either app)

```mermaid
flowchart LR
    User(("You")) -->|"click / drag / scroll<br/>pick a file"| DOM["DOM & Canvas<br/>event listeners"]
    DOM -->|"mutate"| State["state object<br/>(template, cells[], texts[])"]
    State -->|"renderToContext()"| Preview["Preview canvas<br/>540×960"]
    State -->|"pushHistory()"| History["History stack<br/>(undo/redo)"]
    State -->|"renderToContext()<br/>on Export click"| ExportC["Export canvas<br/>1080×1920"]
    ExportC -->|"toBlob(jpeg, 0.95)"| File["Downloaded .jpg"]
    State -->|"Save Project"| Proj[".cmjproj.json"]
    Proj -->|"Open Project"| State
```

Note there is **no server** anywhere in this diagram — every arrow stays
inside the browser (or, for the desktop build, inside the WebView2 window).

## 3. Render pipeline (per frame)

```mermaid
flowchart TD
    A["renderToContext(ctx, W, H, interactive)"] --> B["Fill background"]
    B --> C["cellRects(template, W, H)<br/>compute grid geometry"]
    C --> D{"For each cell"}
    D -->|"has photo"| E["Clip to cell rect<br/>apply CSS filter<br/>(brightness/contrast/saturation/grayscale)<br/>draw image: cover + pan + zoom + rotate + flip"]
    D -->|"empty"| F["Draw placeholder + dashed border"]
    E --> G{"For each text box"}
    F --> G
    G --> H["Translate to x,y (fraction of canvas)<br/>set font from bold/italic/family/size<br/>fillText()"]
    H --> I{"interactive?"}
    I -->|"yes"| J["Draw selection outline<br/>around active cell/text"]
    I -->|"no (export)"| K["Done — ready for toBlob()"]
    J --> K
```

The **same function** is used for the live preview and the final export —
only the canvas size and the `interactive` flag differ. This is the key
design decision that keeps "what you see" and "what you get" in sync.

## 4. Desktop packaging

```mermaid
flowchart LR
    Src["web/ source<br/>(HTML/CSS/JS)"] --> Tauri["Tauri build<br/>(Rust + WebView2 binding)"]
    Tauri --> Exe["charliemj-photostory.exe<br/>(portable, no installer)"]
    subgraph GH["GitHub Actions (windows-latest)"]
        Tauri
    end
    Exe --> User2(("End user's PC"))
```

On launch, the `.exe` opens a native window and points Windows'
built-in **WebView2** control at the local `web/` files bundled inside
the binary — the exact same HTML/CSS/JS that runs in a browser, with no
network access needed at runtime.

Continue to → [06 · Usage Guide](06-usage-guide.md)
