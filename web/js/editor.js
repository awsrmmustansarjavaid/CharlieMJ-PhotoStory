/* editor.js — Editing Engine: preview canvas, hit-testing, drag/zoom/resize, layer actions, keyboard */
(function (PS) {
  const cv = () => document.getElementById('preview');
  PS.view = { zoom: 1 };
  let guides = [], raf = 0;

  /* ---------- canvas sizing + repaint ---------- */
  PS.layoutCanvas = function () {
    const c = cv(), st = document.getElementById('stage'), D = PS.DESIGNS[PS.state.design];
    const fit = Math.min((st.clientWidth - 48) / D.w, (st.clientHeight - 90) / D.h), k = Math.max(0.05, fit * PS.view.zoom), dpr = window.devicePixelRatio || 1;
    const cssW = D.w * k, cssH = D.h * k;
    c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
    c.width = Math.round(Math.min(cssW * dpr, 2200)); c.height = Math.round(c.width * D.h / D.w);
    document.getElementById('zoomPct').textContent = Math.round(k / fit * 100 * (fit > 0 ? 1 : 1)) + '%';
    PS.touch();
  };
  PS.on('repaint', () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const c = cv(); if (!c) return;
    PS.render(c.getContext('2d'), c.width, PS.state, { preview: true, selectedId: PS.selectedId, safe: PS.settings.safeArea, guides });
    PS.scheduleRecovery(); }); });
  setInterval(() => { if (PS.state.layers.some(l => l.type === 'stamp' && l.live && !l.hidden)) PS.touch(); }, 1000);

  /* ---------- geometry helpers ---------- */
  function toDesign(e) { const r = cv().getBoundingClientRect(), D = PS.DESIGNS[PS.state.design];
    return { x: (e.clientX - r.left) / r.width * D.w, y: (e.clientY - r.top) / r.height * D.h }; }
  function local(b, p) { const a = -b.rot * Math.PI / 180, dx = p.x - b.cx, dy = p.y - b.cy;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) }; }
  function hit(p) {
    const L = PS.state.layers;
    for (let i = L.length - 1; i >= 0; i--) { const l = L[i], b = PS.bounds[l.id]; if (l.hidden || !b) continue;
      const q = local(b, p); if (Math.abs(q.x) <= b.w / 2 && Math.abs(q.y) <= b.h / 2) return l; }
    return null;
  }
  function onHandle(p) {
    const s = PS.selected(), b = s && PS.bounds[s.id]; if (!s || s.type === 'cell' || s.locked || !b) return false;
    const q = local(b, p), D = PS.DESIGNS[PS.state.design], tol = 22 * D.w / cv().getBoundingClientRect().width;
    return Math.hypot(q.x - b.w / 2, q.y - b.h / 2) < tol;
  }
  const sizeKey = l => (l.type === 'cell' ? 'zoom' : 'size');

  /* ---------- pointer interaction ---------- */
  let drag = null;
  function down(e) {
    cv().setPointerCapture(e.pointerId); const p = toDesign(e);
    if (onHandle(p)) { const s = PS.selected(), b = PS.bounds[s.id]; drag = { mode: 'resize', s, d0: Math.hypot(p.x - b.cx, p.y - b.cy), size0: s.size, moved: false }; return; }
    const l = hit(p); PS.select(l ? l.id : null); PS.emit('panels:right');
    if (!l) { drag = null; return; }
    drag = { mode: 'move', s: l, p0: p, x0: l.x, y0: l.y, ox0: l.offX, oy0: l.offY, moved: false, bw: PS.bounds[l.id].w, bh: PS.bounds[l.id].h };
  }
  function move(e) {
    if (!drag) { cv().style.cursor = onHandle(toDesign(e)) ? 'nwse-resize' : (hit(toDesign(e)) ? 'grab' : 'default'); return; }
    const p = toDesign(e), s = drag.s; if (s.locked) return;
    if (drag.mode === 'resize') { const b = PS.bounds[s.id]; s.size = PS.clamp(drag.size0 * Math.hypot(p.x - b.cx, p.y - b.cy) / drag.d0, 8, 3000); drag.moved = true; PS.touch(); return; }
    const dx = p.x - drag.p0.x, dy = p.y - drag.p0.y; if (!drag.moved && Math.hypot(dx, dy) < 3) return; drag.moved = true;
    if (s.type === 'cell') { s.offX = drag.ox0 + dx / drag.bw; s.offY = drag.oy0 + dy / drag.bh; }
    else { const D = PS.DESIGNS[PS.state.design]; let x = drag.x0 + dx, y = drag.y0 + dy; guides = [];
      if (Math.abs(x - D.w / 2) < 10) { x = D.w / 2; guides.push({ x }); } if (Math.abs(y - D.h / 2) < 10) { y = D.h / 2; guides.push({ y }); }
      s.x = x; s.y = y; }
    PS.touch();
  }
  function up() {
    if (!drag) return; const d = drag; drag = null; guides = [];
    if (d.moved) { PS.commit('edit'); PS.emit('panels:right'); }
    else if (d.s.type === 'cell' && !d.s.assetId) PS.pickPhotoForCell(d.s);
    PS.touch();
  }
  let wheelT;
  function wheel(e) {
    const p = toDesign(e), l = hit(p) || PS.selected(); if (!l || l.locked) return; e.preventDefault();
    const f = e.deltaY < 0 ? 1.05 : 1 / 1.05, k = sizeKey(l);
    l[k] = PS.clamp(l[k] * f, k === 'zoom' ? 0.1 : 8, k === 'zoom' ? 10 : 3000); PS.touch();
    clearTimeout(wheelT); wheelT = setTimeout(() => { PS.commit('zoom'); PS.emit('panels:right'); }, 350);
  }

  /* ---------- layer / photo actions ---------- */
  PS.pickPhotoForCell = cell => { PS.pendingCell = cell.id; document.getElementById('fileInput').click(); };
  PS.importFiles = async function (files, targetCellId) {
    const imgs = [...files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name));
    if (!imgs.length) return PS.notify('No supported image files found.', 'warn');
    const added = []; let bad = 0;
    for (const f of imgs) { try { added.push(await PS.addAsset(f, f.name, (await PS.exifDate(f)) || f.lastModified)); } catch (e) { bad++; } }
    if (!added.length) return PS.notify('Could not read the selected image(s).', 'error');
    const rects = PS.cellRects(PS.state), cells = PS.cells(); let rest = added.map(a => a.id);
    const tgt = targetCellId && PS.getLayer(targetCellId);
    if (tgt && tgt.type === 'cell') { PS.placePhoto(tgt, added[0], rects[tgt.slot]); rest = rest.slice(1); }
    const placed = PS.autoFill(PS.state, rest, true) + (tgt ? 1 : 0);
    PS.commit('add photos'); PS.emit('panels');
    PS.notify('Added ' + added.length + ' photo' + (added.length > 1 ? 's' : '') + (placed ? ' • placed ' + placed : '') + (bad ? ' • ' + bad + ' failed' : ''), bad ? 'warn' : 'success');
  };
  PS.assignAsset = function (assetId, cell) {
    cell = cell || (PS.selected() && PS.selected().type === 'cell' ? PS.selected() : PS.cells().find(c => !c.assetId) || PS.cells()[0]);
    PS.placePhoto(cell, PS.assets[assetId], PS.cellRects(PS.state)[cell.slot]); PS.commit('place'); PS.select(cell.id); PS.emit('panels');
    PS.notify('Photo placed in ' + cell.name, 'info');
  };
  PS.clearCell = function (c) { c.assetId = null; PS.commit(); PS.emit('panels'); PS.notify('Photo removed from ' + c.name, 'info'); };
  PS.removeAsset = function (id) {
    PS.cells().forEach(c => { if (c.assetId === id) c.assetId = null; });
    const a = PS.assets[id]; if (a) URL.revokeObjectURL(a.url); delete PS.assets[id]; PS.photoOrder = PS.photoOrder.filter(x => x !== id);
    PS.commit(); PS.emit('panels'); PS.notify('Photo removed from library', 'info');
  };
  PS.resetPhoto = function (c, quiet) { Object.assign(c, { zoom: 1, offX: 0, offY: 0, rot: 0, flipH: false, flipV: false, fit: 'fill' }); c.adj = PS.clone(PS.PRESETS.None);
    if (c.assetId) PS.placePhoto(c, PS.assets[c.assetId], PS.cellRects(PS.state)[c.slot]); if (!quiet) { PS.commit(); PS.emit('panels:right'); PS.notify('Photo reset', 'info'); } };
  PS.resetLayout = function () { const s = PS.state; Object.assign(s, { gap: 12, margin: 0, radius: 0, borderW: 0 }); s.rowW = []; s.colW = []; PS.syncCells(s);
    PS.cells().forEach(c => { PS.resetPhoto(c, true); }); PS.commit(); PS.emit('panels'); PS.notify('Layout reset', 'info'); };
  PS.addLayer = function (l, msg) { PS.state.layers.push(l); PS.commit(); PS.select(l.id); PS.emit('panels'); PS.notify(msg || 'Layer added', 'success'); };
  PS.duplicateLayer = function (id) {
    const l = PS.getLayer(id); if (!l || l.type === 'cell') return PS.notify('Photo slots cannot be duplicated — use another layout instead.', 'info');
    const c = Object.assign(PS.clone(l), { id: PS.uid(), name: l.name + ' copy', x: l.x + 40, y: l.y + 40 });
    PS.state.layers.splice(PS.state.layers.indexOf(l) + 1, 0, c); PS.commit(); PS.select(c.id); PS.emit('panels'); PS.notify('Duplicated ' + l.name, 'success');
  };
  PS.deleteLayer = function (id) {
    const l = PS.getLayer(id); if (!l) return; if (l.type === 'cell') return PS.clearCell(l);
    PS.state.layers.splice(PS.state.layers.indexOf(l), 1); if (PS.selectedId === id) PS.selectedId = null;
    PS.commit(); PS.emit('panels'); PS.notify('Deleted ' + l.name, 'info');
  };
  PS.moveLayer = function (id, dir) {
    const L = PS.state.layers, i = L.findIndex(l => l.id === id), j = i + dir; if (j < 0 || j >= L.length) return;
    [L[i], L[j]] = [L[j], L[i]]; PS.commit(); PS.emit('panels');
  };
  PS.newProject = function () {
    if (!confirm('Start a new Story? Unsaved changes will be lost.')) return;
    Object.values(PS.assets).forEach(a => URL.revokeObjectURL(a.url)); PS.assets = {}; PS.photoOrder = [];
    PS.state = PS.newState(); PS.selectedId = null; PS.resetHistory(); PS.emit('panels'); PS.notify('New Story started', 'info');
  };
  PS.duplicateStory = function () {   // keep design + text, drop photos so new ones can be dropped in
    PS.cells().forEach(c => { c.assetId = null; c.zoom = 1; c.offX = c.offY = 0; });
    PS.commit(); PS.emit('panels'); PS.notify('Design duplicated — photos cleared. Add new photos to fill it.', 'success');
  };

  /* ---------- keyboard ---------- */
  function key(e) {
    const t = e.target, typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'range', ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (ctrl && k === 's') { e.preventDefault(); return PS.saveProject(); }
    if (ctrl && k === 'e') { e.preventDefault(); return PS.exportCurrent(); }
    if (ctrl && k === 'o') { e.preventDefault(); return document.getElementById('projectInput').click(); }
    if (typing) return;
    if (ctrl && k === 'z') { e.preventDefault(); return e.shiftKey ? PS.redo() : PS.undo(); }
    if (ctrl && k === 'y') { e.preventDefault(); return PS.redo(); }
    if (ctrl && k === 'd') { e.preventDefault(); return PS.selectedId && PS.duplicateLayer(PS.selectedId); }
    if (k === 'escape') return PS.select(null), PS.emit('panels:right');
    const l = PS.selected(); if (!l) return;
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); return PS.deleteLayer(l.id); }
    if (/^arrow/.test(k) && !l.locked) { e.preventDefault(); const st = e.shiftKey ? 10 : 1, dx = k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, dy = k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0;
      if (l.type === 'cell') { const b = PS.bounds[l.id]; l.offX += dx / b.w; l.offY += dy / b.h; } else { l.x += dx; l.y += dy; }
      PS.touch(); clearTimeout(wheelT); wheelT = setTimeout(() => PS.commit('nudge'), 400); }
    if ((k === '+' || k === '=') && l.type === 'cell') { l.zoom = Math.min(10, l.zoom * 1.05); PS.touch(); }
    if (k === '-' && l.type === 'cell') { l.zoom = Math.max(0.1, l.zoom / 1.05); PS.touch(); }
  }

  PS.initEditor = function () {
    const c = cv(); c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up); c.addEventListener('wheel', wheel, { passive: false });
    document.addEventListener('keydown', key); window.addEventListener('resize', PS.layoutCanvas);
    const st = document.getElementById('stage');
    st.addEventListener('dragover', e => { e.preventDefault(); st.classList.add('drop'); });
    st.addEventListener('dragleave', () => st.classList.remove('drop'));
    st.addEventListener('drop', e => { e.preventDefault(); st.classList.remove('drop'); const l = hit(toDesign(e));
      PS.importFiles(e.dataTransfer.files, l && l.type === 'cell' ? l.id : null); });
  };
})(window.PS);
