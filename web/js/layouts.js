/* layouts.js — Layout Engine: turns (layout, gap, margin, weights) into cell rectangles */
(function (PS) {
  // naming is ROWS × COLUMNS: 2×1 = two panels stacked vertically, 1×2 = two side by side
  PS.LAYOUTS = {
    '1x1': { label: 'Single', rows: 1, cols: 1 },
    '2x1': { label: '2 stacked', rows: 2, cols: 1 },
    '3x1': { label: '3 stacked', rows: 3, cols: 1 },
    '1x2': { label: '2 side by side', rows: 1, cols: 2 },
    '1x3': { label: '3 side by side', rows: 1, cols: 3 },
    '2x2': { label: '2 × 2', rows: 2, cols: 2 },
    '3x2': { label: '3 × 2', rows: 3, cols: 2 },
    '2x3': { label: '2 × 3', rows: 2, cols: 3 },
    '3x3': { label: '3 × 3', rows: 3, cols: 3 },
    'custom': { label: 'Custom', rows: 0, cols: 0 }
  };
  PS.setLayout = function (id, rows, cols) {
    const s = PS.state, L = PS.LAYOUTS[id];
    s.layout = id; s.rows = id === 'custom' ? PS.clamp(rows || s.rows, 1, 8) : L.rows; s.cols = id === 'custom' ? PS.clamp(cols || s.cols, 1, 8) : L.cols;
    PS.syncCells(s);
    if (PS.selectedId && !PS.getLayer(PS.selectedId)) PS.selectedId = null;
  };
  /* returns array of {x,y,w,h} in design units, row-major */
  PS.cellRects = function (s) {
    const D = PS.DESIGNS[s.design], m = s.margin, g = s.gap;
    const W = D.w - 2 * m - g * (s.cols - 1), H = D.h - 2 * m - g * (s.rows - 1);
    const sw = s.colW.reduce((a, b) => a + b, 0), sh = s.rowW.reduce((a, b) => a + b, 0);
    const out = []; let y = m;
    for (let r = 0; r < s.rows; r++) {
      const h = H * s.rowW[r] / sh; let x = m;
      for (let c = 0; c < s.cols; c++) { const w = W * s.colW[c] / sw; out.push({ x, y, w, h }); x += w + g; }
      y += h + g;
    }
    return out;
  };
  /* distribute photos over empty (or all) cells with focus-aware placement */
  PS.placePhoto = function (cell, asset, rect) {
    cell.assetId = asset.id; cell.zoom = 1; cell.rot = 0; cell.flipH = cell.flipV = false;
    cell.offX = cell.offY = 0; cell.fit = 'fill';
    if (rect && asset.focus) {
      const s = Math.max(rect.w / asset.w, rect.h / asset.h), ox = asset.w * s - rect.w, oy = asset.h * s - rect.h;
      // shift so the focal point sits as close to the frame centre as the overflow allows
      cell.offX = ox > 0 ? PS.clamp((0.5 - asset.focus.x) * asset.w * s, -ox / 2, ox / 2) / rect.w : 0;
      cell.offY = oy > 0 ? PS.clamp((0.5 - asset.focus.y) * asset.h * s, -oy / 2, oy / 2) / rect.h : 0;
    }
  };
  PS.autoFill = function (s, ids, onlyEmpty) {
    const rects = PS.cellRects(s), cells = PS.cells(s); let n = 0, k = 0;
    cells.forEach((c, i) => {
      if (onlyEmpty && c.assetId) return;
      if (k >= ids.length) return;
      PS.placePhoto(c, PS.assets[ids[k++]], rects[i]); n++;
    });
    return n;
  };
  PS.sortedPhotoIds = function (mode) {
    const ids = PS.photoOrder.slice(), A = PS.assets;
    if (mode === 'name') ids.sort((a, b) => A[a].name.localeCompare(A[b].name, undefined, { numeric: true }));
    if (mode === 'date') ids.sort((a, b) => A[a].date - A[b].date);
    return ids;
  };
})(window.PS);
