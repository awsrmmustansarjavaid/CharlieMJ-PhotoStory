/* services.js — Export Service, Project Service, Template Service, Palette */
(function (PS) {
  const p2 = n => String(n).padStart(2, '0');
  const stamp = () => { const d = new Date(); return d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds()); };
  const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  PS.lastSaved = null; // {path|name}

  /* ---------------- file output ---------------- */
  PS.chooseFolder = async function () {
    try {
      if (PS.isTauri()) { const p = await PS.invoke('pick_folder'); if (p) { PS.settings.exportDir = p; PS.saveSettings(); PS.emit('settings'); PS.notify('Export folder: ' + p, 'success'); } return; }
      if (window.showDirectoryPicker) { PS.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        PS.settings.exportDir = PS.dirHandle.name; PS.saveSettings(); PS.emit('settings'); PS.notify('Export folder: ' + PS.dirHandle.name, 'success'); return; }
      PS.notify('Folder picking is not supported in this browser — files go to your Downloads folder.', 'warn');
    } catch (e) { if (e.name !== 'AbortError') PS.notify('Could not choose folder: ' + e.message, 'error'); }
  };
  /* returns a human-readable location */
  PS.saveBlob = async function (blob, filename) {
    if (PS.isTauri() && PS.settings.exportDir) {
      const b64 = (await PS.blobToDataUrl(blob)).split(',')[1];
      const path = await PS.invoke('save_file', { folder: PS.settings.exportDir, filename, dataBase64: b64 });
      PS.lastSaved = { path }; return path;
    }
    if (PS.dirHandle) {
      const fh = await PS.dirHandle.getFileHandle(filename, { create: true }), w = await fh.createWritable(); await w.write(blob); await w.close();
      PS.lastSaved = { name: filename }; return PS.dirHandle.name + '/' + filename;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); PS.lastSaved = { name: filename }; return 'Downloads/' + filename;
  };
  PS.revealLast = function () {
    if (PS.isTauri() && PS.lastSaved && PS.lastSaved.path) PS.invoke('reveal_file', { path: PS.lastSaved.path }).catch(e => PS.notify('Cannot open location: ' + e, 'error'));
    else PS.notify('Opening a folder is only available in the Windows desktop app. In the browser, check your chosen folder or Downloads.', 'info');
  };

  /* ---------------- export ---------------- */
  PS.exportSize = (s) => { const D = PS.DESIGNS[(s || PS.state).design], k = PS.settings.resolution; return { w: Math.round(D.w * k), h: Math.round(D.h * k) }; };
  PS.renderToBlob = function (s) {
    const { w, h } = PS.exportSize(s), fmt = PS.settings.format;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
    if (fmt === 'jpg') { c.fillStyle = PS.settings.jpgBg; c.fillRect(0, 0, w, h); }  // JPEG has no alpha: paint a backdrop first
    PS.render(c, w, s, { preview: false });
    return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('This browser cannot encode ' + fmt.toUpperCase())), MIME[fmt], PS.settings.quality / 100));
  };
  PS.exportCurrent = async function () {
    try {
      PS.notify('Export started…', 'progress'); await new Promise(r => setTimeout(r, 30));
      const blob = await PS.renderToBlob(PS.state), fmt = PS.settings.format, name = (PS.settings.baseName || 'Story') + '-' + stamp() + '.' + fmt;
      if (fmt === 'webp' && blob.type !== MIME.webp) PS.notify('WebP is not supported here; a ' + blob.type + ' file was produced instead.', 'warn');
      const where = await PS.saveBlob(blob, name), sz = PS.exportSize();
      PS.notify('Export complete: ' + name + ' (' + sz.w + '×' + sz.h + ', ' + (blob.size / 1048576).toFixed(2) + ' MB) → ' + where, 'success',
        { actions: PS.isTauri() ? [{ label: 'Open location', fn: PS.revealLast }] : [] });
      PS.emit('exported', name);
    } catch (e) { PS.notify('Export failed: ' + e.message, 'error'); }
  };
  /* batch: split the (sorted) photo library into Stories using the current layout/design as template */
  PS.batchExport = async function () {
    const ids = PS.sortedPhotoIds(PS.settings.sortMode), per = PS.state.rows * PS.state.cols;
    if (!ids.length) return PS.notify('Add photos to the library first.', 'warn');
    const chunks = []; for (let i = 0; i < ids.length; i += per) chunks.push(ids.slice(i, i + per));
    const prog = document.getElementById('batchProg'), bar = prog.querySelector('i'), txt = prog.querySelector('span'); prog.hidden = false;
    let ok = 0, fail = 0; PS.notify('Batch export started: ' + chunks.length + ' Stories', 'progress');
    for (let i = 0; i < chunks.length; i++) {
      try {
        const s = PS.clone(PS.state); PS.cells(s).forEach(c => { c.assetId = null; }); PS.autoFill(s, chunks[i], false);
        const blob = await PS.renderToBlob(s), name = (PS.settings.baseName || 'Story') + '-' + stamp() + '-' + String(i + 1).padStart(3, '0') + '.' + PS.settings.format;
        await PS.saveBlob(blob, name); ok++;
      } catch (e) { fail++; console.error(e); }
      bar.style.width = ((i + 1) / chunks.length * 100) + '%'; txt.textContent = (i + 1) + '/' + chunks.length + ' • ✔ ' + ok + ' • ✖ ' + fail;
      await new Promise(r => setTimeout(r, 20));
    }
    setTimeout(() => { prog.hidden = true; }, 3500);
    PS.notify('Batch finished: ' + ok + ' saved, ' + fail + ' failed', fail ? 'warn' : 'success', { actions: PS.isTauri() ? [{ label: 'Open location', fn: PS.revealLast }] : [] });
  };

  /* ---------------- projects ---------------- */
  PS.saveProject = async function () {
    try {
      const used = new Set(); PS.state.layers.forEach(l => l.assetId && used.add(l.assetId)); if (PS.state.bg.assetId) used.add(PS.state.bg.assetId);
      Object.values(PS.assets).forEach(a => { if (a.kind === 'photo') used.add(a.id); });
      const assets = []; for (const id of used) { const a = PS.assets[id]; if (a) assets.push({ id, name: a.name, date: a.date, kind: a.kind, data: await PS.blobToDataUrl(a.blob) }); }
      const json = JSON.stringify({ app: 'CharlieMJ-PhotoStory', version: 2, state: PS.state, order: PS.photoOrder, assets });
      const name = (PS.settings.baseName || 'Story') + '-' + stamp() + '.cmjstory.json';
      const where = await PS.saveBlob(new Blob([json], { type: 'application/json' }), name);
      PS.notify('Project saved: ' + name + ' → ' + where, 'success');
    } catch (e) { PS.notify('Could not save project: ' + e.message, 'error'); }
  };
  PS.openProjectFile = async function (file) {
    try {
      const j = JSON.parse(await file.text());
      if (j.app !== 'CharlieMJ-PhotoStory' || !j.state) throw new Error('Not a CharlieMJ PhotoStory v2 project file');
      await PS.restoreRecord(j.state, j.assets.map(a => ({ id: a.id, name: a.name, date: a.date, kind: a.kind, blob: PS.dataUrlToBlob(a.data) })), j.order);
      PS.notify('Project opened: ' + file.name, 'success');
    } catch (e) { PS.notify('Could not open project: ' + e.message, 'error'); }
  };

  /* ---------------- templates ---------------- */
  const T = (name, o) => Object.assign({ name, design: 'story', layout: '2x2', gap: 12, margin: 0, radius: 0, borderW: 0, borderColor: '#ffffff',
    bg: { type: 'solid', color: '#15161d' }, items: [] }, o);
  const title = (text, y, o) => ({ k: 'text', text, y, size: 96, ...o });
  PS.BUILTIN_TEMPLATES = [
    T('✈️ Travel', { layout: '3x1', gap: 16, margin: 40, radius: 24, bg: { type: 'gradient', c1: '#0ea5e9', c2: '#1e1b4b', angle: 160 }, items: [title('Travel Diary', 120, { font: 'Impact', outlineW: 3 }), { k: 'emoji', char: '📍', x: 150, y: 1830, size: 90 }, { k: 'stamp', y: 1830, x: 600 }] }),
    T('📸 Memories', { layout: '2x2', gap: 14, margin: 50, radius: 8, borderW: 8, borderColor: '#fff', bg: { type: 'solid', color: '#f5efe6' }, items: [title('Memories', 1790, { color: '#3b2f2f', font: 'Georgia', italic: true, bold: false })] }),
    T('🎂 Birthday', { layout: '2x1', gap: 20, margin: 40, radius: 40, bg: { type: 'gradient', c1: '#f472b6', c2: '#8b5cf6', angle: 150 }, items: [title('Happy Birthday!', 130, { font: 'Comic Sans MS', shadowBlur: 12 }), { k: 'emoji', char: '🎉', x: 160, y: 1800, size: 160 }, { k: 'emoji', char: '🎂', x: 920, y: 1800, size: 160 }] }),
    T('👨‍👩‍👧 Family', { layout: '2x2', gap: 16, margin: 36, radius: 28, bg: { type: 'gradient', c1: '#fde68a', c2: '#fb923c', angle: 180 }, items: [title('Family Time', 1790, { color: '#7c2d12', font: 'Georgia' }), { k: 'emoji', char: '❤️', x: 540, y: 120, size: 110 }] }),
    T('🤝 Friends', { layout: '3x2', gap: 10, margin: 30, radius: 16, bg: { type: 'solid', color: '#0f172a' }, items: [title('Squad Goals', 1810, { font: 'Impact', color: '#facc15', outlineW: 2 }), { k: 'emoji', char: '🔥', x: 900, y: 120, size: 120 }] }),
    T('🌿 Nature', { layout: '1x1', margin: 0, bg: { type: 'solid', color: '#052e16' }, items: [title('Into the Wild', 1650, { font: 'Georgia', italic: true, shadowBlur: 20, bold: false }), { k: 'emoji', char: '✨', x: 880, y: 1500, size: 120 }] }),
    T('🍔 Food', { layout: '2x1', gap: 0, margin: 0, bg: { type: 'solid', color: '#7f1d1d' }, items: [title('Tasty Bites', 960, { font: 'Impact', bgOn: true, bgColor: '#000000', bgAlpha: 0.6, size: 110 }), { k: 'emoji', char: '🔥', x: 880, y: 960, size: 140 }] }),
    T('📚 Study', { layout: '3x1', gap: 14, margin: 40, radius: 12, bg: { type: 'solid', color: '#1e293b' }, items: [title('Study Session', 110, { font: 'Courier New', color: '#a5f3fc' }), { k: 'stamp', y: 1800, fmt: 'dddd • HH:mm', live: true, x: 540 }] }),
    T('☀️ Daily life', { layout: '2x2', gap: 12, margin: 30, radius: 20, bg: { type: 'gradient', c1: '#fef3c7', c2: '#c7d2fe', angle: 170 }, items: [title('My Day', 1800, { color: '#312e81' }), { k: 'stamp', y: 130, fmt: 'D MMM YYYY • dddd', color: '#312e81', x: 540 }] })
  ];
  PS.userTemplates = () => { try { return JSON.parse(localStorage.getItem('cmj-templates') || '[]'); } catch (e) { return []; } };
  PS.saveUserTemplate = function (name) {
    const t = PS.templateFromState(name), list = PS.userTemplates(); list.push(t);
    localStorage.setItem('cmj-templates', JSON.stringify(list)); PS.notify('Template saved: ' + name, 'success');
  };
  PS.deleteUserTemplate = i => { const l = PS.userTemplates(); l.splice(i, 1); localStorage.setItem('cmj-templates', JSON.stringify(l)); };
  PS.templateFromState = function (name) {
    const s = PS.state;
    return { name, user: true, design: s.design, layout: s.layout, rows: s.rows, cols: s.cols, gap: s.gap, margin: s.margin, radius: s.radius, borderW: s.borderW, borderColor: s.borderColor,
      bg: Object.assign({}, s.bg, { assetId: null }), rowW: s.rowW.slice(), colW: s.colW.slice(), cellAdj: PS.cells(s).map(c => ({ fit: c.fit, adj: c.adj })),
      layers: PS.clone(s.layers.filter(l => l.type !== 'cell' && l.type !== 'image')) };
  };
  PS.applyTemplate = function (t) {
    const s = PS.state, old = PS.cells(s).map(c => c.assetId), L = PS.LAYOUTS[t.layout] || PS.LAYOUTS['2x2'];
    s.design = t.design; s.layout = t.layout; s.rows = t.rows || L.rows; s.cols = t.cols || L.cols; s.rowW = t.rowW || []; s.colW = t.colW || [];
    ['gap', 'margin', 'radius', 'borderW', 'borderColor'].forEach(k => { s[k] = t[k]; });
    s.bg = Object.assign({ type: 'solid', color: '#15161d', c1: '#8b5cf6', c2: '#1e1b4b', angle: 160, blur: 40, assetId: null }, t.bg);
    s.layers = s.layers.filter(l => l.type === 'cell'); PS.syncCells(s);
    PS.cells(s).forEach((c, i) => { if (old[i]) { c.assetId = old[i]; } if (t.cellAdj && t.cellAdj[i]) { c.fit = t.cellAdj[i].fit; c.adj = Object.assign({}, c.adj, t.cellAdj[i].adj); } });
    if (t.layers) t.layers.forEach(l => s.layers.push(Object.assign(PS.clone(l), { id: PS.uid() })));
    (t.items || []).forEach(it => {
      if (it.k === 'text') { const { k, ...o } = it; s.layers.push(PS.newText(Object.assign({ name: 'Title', x: 540 }, o))); }
      if (it.k === 'emoji') s.layers.push(PS.newEmoji(it.char, { x: it.x, y: it.y, size: it.size }));
      if (it.k === 'stamp') { const { k, ...o } = it; s.layers.push(PS.newStamp(o)); }
    });
    PS.selectedId = null; PS.commit(); PS.emit('panels'); PS.notify('Template applied: ' + t.name, 'success');
  };

  /* ---------------- colour palette (histogram of a 64px thumbnail, 4 bits/channel) ---------------- */
  PS.extractPalette = function (asset, n) {
    const k = 64 / Math.max(asset.w, asset.h), w = Math.max(1, Math.round(asset.w * k)), h = Math.max(1, Math.round(asset.h * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(asset.img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, bins = {};
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const key = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4;
      const b = bins[key] || (bins[key] = { n: 0, r: 0, g: 0, b: 0 }); b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; }
    const cols = Object.values(bins).sort((a, b) => b.n - a.n).map(b => [b.r / b.n, b.g / b.n, b.b / b.n]), out = [];
    for (const c1 of cols) { if (out.every(o => Math.hypot(o[0] - c1[0], o[1] - c1[1], o[2] - c1[2]) > 55)) out.push(c1); if (out.length >= n) break; }
    return out.map(c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''));
  };
})(window.PS);
