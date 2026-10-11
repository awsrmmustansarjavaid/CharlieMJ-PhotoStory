/* ============================================================================
   core.js — namespace, event bus, state model, asset library, undo/redo
   Everything hangs off one global `PS` so the app works from file:// (no ES
   modules => no CORS problems) and inside the Tauri window alike.
   ========================================================================== */
window.PS = window.PS || {};
(function (PS) {
  /* ---------- tiny utilities ---------- */
  const bus = {};
  PS.on = (e, f) => (bus[e] = bus[e] || []).push(f);
  PS.emit = (e, d) => (bus[e] || []).forEach(f => { try { f(d); } catch (err) { console.error(e, err); } });
  PS.uid = () => Math.random().toString(36).slice(2, 9);
  PS.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  PS.clone = o => JSON.parse(JSON.stringify(o));
  PS.isTauri = () => !!(window.__TAURI__ && window.__TAURI__.core);
  PS.invoke = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);

  /* ---------- designs (canvas presets) ---------- */
  PS.DESIGNS = {
    story:  { name: 'Instagram Story (9:16)', w: 1080, h: 1920, safe: { top: 250, bottom: 250 } },
    reel:   { name: 'Instagram Reel (9:16)',  w: 1080, h: 1920, safe: { top: 220, bottom: 420 } },
    post:   { name: 'Instagram Post (4:5)',   w: 1080, h: 1350, safe: { top: 0, bottom: 0 } },
    square: { name: 'Instagram Square (1:1)', w: 1080, h: 1080, safe: { top: 0, bottom: 0 } }
  };

  /* ---------- asset library: every image lives here, state only holds ids ---------- */
  PS.assets = {};   // id -> {id,name,date,blob,url,img,w,h,focus:{x,y},kind:'photo'|'asset'}
  PS.photoOrder = []; // ids of library photos in current order

  /* ---------- layer factories ---------- */
  const adj = () => ({ brightness: 100, contrast: 100, saturation: 100, warmth: 0, sharpness: 0, grayscale: 0, blur: 0 });
  PS.newCell = slot => ({ id: PS.uid(), type: 'cell', name: 'Photo ' + (slot + 1), slot, assetId: null,
    zoom: 1, offX: 0, offY: 0, rot: 0, flipH: false, flipV: false, fit: 'fill', locked: false, hidden: false, adj: adj() });
  PS.textBase = () => ({ font: 'Arial', size: 72, color: '#ffffff', bold: true, italic: false, align: 'center',
    outlineW: 0, outlineColor: '#000000', shadowBlur: 0, shadowColor: '#000000', bgOn: false, bgColor: '#000000',
    bgAlpha: 0.5, pad: 16, opacity: 1 });
  PS.newText = (o) => Object.assign({ id: PS.uid(), type: 'text', name: 'Text', text: 'Your text', x: 540, y: 960, rot: 0,
    locked: false, hidden: false }, PS.textBase(), o || {});
  PS.newStamp = (o) => Object.assign(PS.newText({ type: 'stamp', name: 'Timestamp', size: 44, bold: false,
    shadowBlur: 8 }), { fmt: 'dddd, D MMMM YYYY • h:mm A', live: true, fixedTime: new Date().toISOString().slice(0, 16),
    caption: '', location: '' }, o || {});
  PS.newEmoji = (char, o) => Object.assign({ id: PS.uid(), type: 'emoji', name: 'Emoji ' + char, char, x: 540, y: 960,
    size: 160, rot: 0, opacity: 1, locked: false, hidden: false }, o || {});
  PS.newImageLayer = (assetId, name) => ({ id: PS.uid(), type: 'image', name: name || 'Logo', assetId, x: 900, y: 1700,
    size: 220, rot: 0, opacity: 0.9, locked: false, hidden: false });

  /* ---------- state ---------- */
  PS.newState = function () {
    const s = {
      design: 'story', layout: '2x2', rows: 2, cols: 2, rowW: [], colW: [],
      gap: 12, margin: 0, radius: 0, borderW: 0, borderColor: '#ffffff', cellFill: '#00000000',
      bg: { type: 'solid', color: '#15161d', c1: '#8b5cf6', c2: '#1e1b4b', angle: 160, blur: 40, assetId: null },
      layers: []
    };
    PS.syncCells(s);
    return s;
  };
  /* make sure the state has exactly rows*cols cell layers (extras removed, new appended at bottom) */
  PS.syncCells = function (s) {
    const need = s.rows * s.cols;
    const cells = s.layers.filter(l => l.type === 'cell').sort((a, b) => a.slot - b.slot);
    cells.slice(need).forEach(c => s.layers.splice(s.layers.indexOf(c), 1));
    for (let i = cells.length; i < need; i++) {
      const at = s.layers.filter(l => l.type === 'cell').length;
      s.layers.splice(at, 0, PS.newCell(i));
    }
    s.rowW = Array.from({ length: s.rows }, (_, i) => s.rowW[i] || 1);
    s.colW = Array.from({ length: s.cols }, (_, i) => s.colW[i] || 1);
  };
  PS.state = PS.newState();
  PS.selectedId = null;
  PS.getLayer = (id, s) => (s || PS.state).layers.find(l => l.id === id);
  PS.selected = () => PS.getLayer(PS.selectedId);
  PS.cells = s => (s || PS.state).layers.filter(l => l.type === 'cell').sort((a, b) => a.slot - b.slot);

  /* ---------- undo / redo (snapshots of state JSON; images are not duplicated) ---------- */
  let hist = [], hi = -1;
  PS.commit = function (label) {
    hist = hist.slice(0, hi + 1);
    hist.push(JSON.stringify(PS.state));
    if (hist.length > 100) hist.shift();
    hi = hist.length - 1;
    PS.emit('committed', label);
    PS.touch();
  };
  PS.resetHistory = () => { hist = []; hi = -1; PS.commit(); };
  PS.canUndo = () => hi > 0; PS.canRedo = () => hi < hist.length - 1;
  function restore(i) {
    PS.state = JSON.parse(hist[i]); hi = i;
    if (!PS.getLayer(PS.selectedId)) PS.selectedId = null;
    PS.emit('panels'); PS.touch(); PS.emit('committed');
  }
  PS.undo = () => { if (PS.canUndo()) { restore(hi - 1); PS.notify('Undo', 'info'); } };
  PS.redo = () => { if (PS.canRedo()) { restore(hi + 1); PS.notify('Redo', 'info'); } };

  /* touch = "something changed, repaint" (cheap; no history entry) */
  PS.touch = () => PS.emit('repaint');

  PS.select = id => { PS.selectedId = id; PS.emit('select'); PS.touch(); };

  /* ---------- image loading ---------- */
  PS.loadImage = (blob) => new Promise((res, rej) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => res({ url, img }); img.onerror = () => rej(new Error('Could not decode image'));
    img.src = url;
  });
  /* rough "important area": centroid of edge energy on a 48px thumbnail */
  function focusOf(img) {
    const k = 48 / Math.max(img.naturalWidth, img.naturalHeight), w = Math.max(2, Math.round(img.naturalWidth * k)), h = Math.max(2, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data; let sx = 0, sy = 0, sw = 0;
    const g = (i, j) => { const p = (j * w + i) * 4; return d[p] * .3 + d[p + 1] * .59 + d[p + 2] * .11; };
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      const e = Math.abs(g(i + 1, j) - g(i - 1, j)) + Math.abs(g(i, j + 1) - g(i, j - 1));
      const cw = 1 - 0.4 * (Math.abs(i / w - .5) + Math.abs(j / h - .5)); // slight centre bias
      sx += i * e * cw; sy += j * e * cw; sw += e * cw;
    }
    return sw > 0 ? { x: sx / sw / w, y: sy / sw / h } : { x: .5, y: .5 };
  }
  PS.addAsset = async function (blob, name, date, kind, id) {
    const { url, img } = await PS.loadImage(blob);
    const a = { id: id || PS.uid(), name: name || 'image', date: date || Date.now(), blob, url, img,
      w: img.naturalWidth, h: img.naturalHeight, kind: kind || 'photo' };
    a.focus = focusOf(img); PS.assets[a.id] = a;
    if (a.kind === 'photo') PS.photoOrder.push(a.id);
    return a;
  };
  PS.dataUrlToBlob = u => { const [h, b] = u.split(','), m = /:(.*?);/.exec(h)[1], bin = atob(b), n = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) n[i] = bin.charCodeAt(i); return new Blob([n], { type: m }); };
  PS.blobToDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
})(window.PS);
