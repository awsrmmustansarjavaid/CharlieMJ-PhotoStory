/* render.js — Rendering Engine. One function draws everything, at ANY resolution:
   preview calls it with the on-screen canvas width, export with the real target
   width (e.g. 1080 or 1440) — so exports are rendered natively, never up-scaled. */
(function (PS) {
  const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  PS.bounds = {};

  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function cover(c, img, x, y, w, h) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    c.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  function star(c, cx, cy, R, rot) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.382 : R, a = rot + i * Math.PI / 5 - Math.PI / 2; c.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    c.closePath(); c.fill();
  }

  /* ---------- background ---------- */
  function drawBackground(c, s, D, sc) {
    const b = s.bg;
    if (b.type === 'transparent') return;
    c.save();
    if (b.type === 'gradient') {
      const a = (b.angle - 90) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), L = (Math.abs(D.w * dx) + Math.abs(D.h * dy)) / 2;
      const g = c.createLinearGradient(D.w / 2 - dx * L, D.h / 2 - dy * L, D.w / 2 + dx * L, D.h / 2 + dy * L);
      g.addColorStop(0, b.c1); g.addColorStop(1, b.c2); c.fillStyle = g; c.fillRect(0, 0, D.w, D.h);
    } else if (b.type === 'blur' || b.type === 'image') {
      c.fillStyle = b.color; c.fillRect(0, 0, D.w, D.h);
      let a = b.type === 'image' ? PS.assets[b.assetId] : null;
      if (!a) { const cell = PS.cells(s).find(x => x.assetId && PS.assets[x.assetId]); a = cell && PS.assets[cell.assetId]; }
      if (a) {
        if (b.type === 'blur') {
          c.filter = 'blur(' + (b.blur * sc).toFixed(1) + 'px)'; c.translate(D.w / 2, D.h / 2); c.scale(1.25, 1.25); c.translate(-D.w / 2, -D.h / 2);
          cover(c, a.img, 0, 0, D.w, D.h); c.filter = 'none'; c.setTransform(sc, 0, 0, sc, 0, 0);
          c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, 0, D.w, D.h);
        } else cover(c, a.img, 0, 0, D.w, D.h);
      }
    } else { c.fillStyle = b.color; c.fillRect(0, 0, D.w, D.h); }
    c.restore();
  }

  /* ---------- photo cells ---------- */
  function paintPhoto(c, a, w, h, cell, sc) {
    const ad = cell.adj, base = (cell.fit === 'fit' ? Math.min : Math.max)(w / a.w, h / a.h) * cell.zoom;
    c.save(); c.filter = PS.filterString(ad, sc);
    c.translate(w / 2 + cell.offX * w, h / 2 + cell.offY * h); c.rotate(cell.rot * Math.PI / 180);
    c.scale(cell.flipH ? -1 : 1, cell.flipV ? -1 : 1);
    c.drawImage(a.img, -a.w * base / 2, -a.h * base / 2, a.w * base, a.h * base); c.restore();
  }
  function drawPhoto(c, a, w, h, cell, sc) {
    const ad = cell.adj;
    if (ad.sharpness > 0 || ad.warmth !== 0) {
      const pw = Math.max(1, Math.ceil(w * sc)), ph = Math.max(1, Math.ceil(h * sc));
      const off = document.createElement('canvas'); off.width = pw; off.height = ph;
      const o = off.getContext('2d', { willReadFrequently: true }); o.imageSmoothingQuality = 'high';
      o.scale(pw / w, ph / h); paintPhoto(o, a, w, h, cell, sc); o.setTransform(1, 0, 0, 1, 0, 0);
      if (ad.sharpness > 0) PS.sharpen(o, pw, ph, ad.sharpness);
      if (ad.warmth !== 0) { o.globalCompositeOperation = 'source-atop';
        o.fillStyle = ad.warmth > 0 ? 'rgba(255,150,40,' + (ad.warmth / 100 * 0.3) + ')' : 'rgba(40,120,255,' + (-ad.warmth / 100 * 0.3) + ')';
        o.fillRect(0, 0, pw, ph); }
      c.drawImage(off, 0, 0, w, h);
    } else paintPhoto(c, a, w, h, cell, sc);
  }
  function drawCell(c, cell, r, s, o) {
    const a = PS.assets[cell.assetId], rad = s.radius;
    c.save(); rr(c, r.x, r.y, r.w, r.h, rad); c.clip();
    if (a) {
      if (s.cellFill && s.cellFill.length === 9 && s.cellFill.slice(7) !== '00') { c.fillStyle = s.cellFill; c.fillRect(r.x, r.y, r.w, r.h); }
      c.translate(r.x, r.y); drawPhoto(c, a, r.w, r.h, cell, o.sc);
    } else if (o.preview) {
      c.fillStyle = '#2a2c38'; c.fillRect(r.x, r.y, r.w, r.h);
      c.fillStyle = '#6b6d85'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 ' + Math.min(r.w, r.h) * 0.12 + 'px Arial'; c.fillText('+', r.x + r.w / 2, r.y + r.h / 2 - r.h * 0.05);
      c.font = Math.min(r.w, r.h) * 0.06 + 'px Arial'; c.fillText(cell.name, r.x + r.w / 2, r.y + r.h / 2 + r.h * 0.07);
    }
    c.restore();
    if (s.borderW > 0 && (a || o.preview)) {
      c.save(); c.strokeStyle = s.borderColor; c.lineWidth = s.borderW;
      rr(c, r.x + s.borderW / 2, r.y + s.borderW / 2, r.w - s.borderW, r.h - s.borderW, Math.max(0, rad - s.borderW / 2)); c.stroke(); c.restore();
    }
    PS.bounds[cell.id] = { cx: r.x + r.w / 2, cy: r.y + r.h / 2, w: r.w, h: r.h, rot: 0 };
  }

  /* ---------- text / stamp ---------- */
  function hexA(hex, a) { const n = parseInt(hex.slice(1, 7), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function drawText(c, l, o) {
    const str = l.type === 'stamp' ? PS.stampText(l) : l.text, lines = String(str).split('\n'), lh = l.size * 1.2;
    c.save(); c.font = (l.italic ? 'italic ' : '') + (l.bold ? 'bold ' : '') + l.size + 'px "' + l.font + '", ' + EMOJI_FONT;
    const w = Math.max(10, ...lines.map(t => c.measureText(t).width)), h = lh * lines.length, pad = l.bgOn ? l.pad : 0;
    c.globalAlpha = l.opacity; c.translate(l.x, l.y); c.rotate(l.rot * Math.PI / 180);
    if (l.bgOn) { c.fillStyle = hexA(l.bgColor, l.bgAlpha); rr(c, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad, pad * 0.6); c.fill(); }
    c.textBaseline = 'middle'; c.textAlign = l.align; c.lineJoin = 'round';
    const x = l.align === 'left' ? -w / 2 : l.align === 'right' ? w / 2 : 0;
    lines.forEach((t, i) => {
      const y = -h / 2 + lh * (i + 0.5);
      if (l.shadowBlur > 0) { c.shadowColor = l.shadowColor; c.shadowBlur = l.shadowBlur * o.sc; c.shadowOffsetY = l.shadowBlur * 0.35 * o.sc; }
      if (l.outlineW > 0) { c.strokeStyle = l.outlineColor; c.lineWidth = l.outlineW * 2; c.strokeText(t, x, y); c.shadowColor = 'transparent'; }
      c.fillStyle = l.color; c.fillText(t, x, y); c.shadowColor = 'transparent';
    });
    c.restore();
    PS.bounds[l.id] = { cx: l.x, cy: l.y, w: w + 2 * pad + l.outlineW * 2, h: h + 2 * pad, rot: l.rot };
  }

  /* ---------- emoji (flags are drawn as vectors: Windows has no flag glyphs) ---------- */
  function drawFlag(c, ch, S) {
    const w = S * 1.5, h = S; c.save(); rr(c, -w / 2, -h / 2, w, h, S * 0.06); c.clip();
    if (ch === '🇵🇰') {
      c.fillStyle = '#01411c'; c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = '#fff'; c.fillRect(-w / 2, -h / 2, w / 4, h);
      const cx = w / 8, r = h * 0.3; c.beginPath(); c.arc(cx, 0, r, 0, 7); c.fill();
      c.fillStyle = '#01411c'; c.beginPath(); c.arc(cx + r * 0.32, -r * 0.1, r * 0.82, 0, 7); c.fill();
      c.fillStyle = '#fff'; star(c, cx + r * 0.62, -r * 0.42, r * 0.34, 0.5);
    } else {
      c.fillStyle = '#e30a17'; c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = '#fff';
      const cx = -w * 0.12, r = h * 0.25; c.beginPath(); c.arc(cx, 0, r, 0, 7); c.fill();
      c.fillStyle = '#e30a17'; c.beginPath(); c.arc(cx + r * 0.26, 0, r * 0.8, 0, 7); c.fill();
      c.fillStyle = '#fff'; star(c, cx + r * 1.45, 0, r * 0.4, Math.PI / 2 * 0.0 + 1.2566);
    }
    c.restore();
    c.save(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = Math.max(1, S * 0.01); rr(c, -w / 2, -h / 2, w, h, S * 0.06); c.stroke(); c.restore();
    return { w, h };
  }
  function drawEmoji(c, l, o) {
    c.save(); c.globalAlpha = l.opacity; c.translate(l.x, l.y); c.rotate(l.rot * Math.PI / 180);
    let w, h;
    if (l.char === '🇵🇰' || l.char === '🇹🇷') ({ w, h } = drawFlag(c, l.char, l.size));
    else { c.font = l.size + 'px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(l.char, 0, l.size * 0.05); w = Math.max(l.size, c.measureText(l.char).width); h = l.size * 1.15; }
    c.restore(); PS.bounds[l.id] = { cx: l.x, cy: l.y, w, h, rot: l.rot };
  }
  function drawImageLayer(c, l) {
    const a = PS.assets[l.assetId]; if (!a) return;
    const w = l.size, h = l.size * a.h / a.w;
    c.save(); c.globalAlpha = l.opacity; c.translate(l.x, l.y); c.rotate(l.rot * Math.PI / 180);
    c.drawImage(a.img, -w / 2, -h / 2, w, h); c.restore(); PS.bounds[l.id] = { cx: l.x, cy: l.y, w, h, rot: l.rot };
  }

  /* ---------- overlays (preview only) ---------- */
  function drawOverlays(c, s, D, o) {
    const inv = 1 / o.sc, sel = PS.getLayer(o.selectedId, s);
    if (o.safe && (D.safe.top || D.safe.bottom)) {
      c.save(); c.fillStyle = 'rgba(239,68,68,.20)'; c.fillRect(0, 0, D.w, D.safe.top); c.fillRect(0, D.h - D.safe.bottom, D.w, D.safe.bottom);
      c.strokeStyle = 'rgba(239,68,68,.9)'; c.lineWidth = 2 * inv; c.setLineDash([12 * inv, 8 * inv]);
      c.beginPath(); c.moveTo(0, D.safe.top); c.lineTo(D.w, D.safe.top); c.moveTo(0, D.h - D.safe.bottom); c.lineTo(D.w, D.h - D.safe.bottom); c.stroke();
      c.setLineDash([]); c.fillStyle = '#fff'; c.font = 'bold ' + 13 * inv + 'px Arial'; c.textAlign = 'center';
      c.fillText('Instagram UI area (keep text out)', D.w / 2, D.safe.top - 10 * inv); c.fillText('Instagram UI area (keep text out)', D.w / 2, D.h - D.safe.bottom + 22 * inv); c.restore();
    }
    (o.guides || []).forEach(g => { c.save(); c.strokeStyle = '#f472b6'; c.lineWidth = inv; c.beginPath();
      if (g.x !== undefined) { c.moveTo(g.x, 0); c.lineTo(g.x, D.h); } else { c.moveTo(0, g.y); c.lineTo(D.w, g.y); } c.stroke(); c.restore(); });
    const b = sel && PS.bounds[sel.id];
    if (b && !sel.hidden) {
      c.save(); c.translate(b.cx, b.cy); c.rotate(b.rot * Math.PI / 180);
      c.strokeStyle = '#8b5cf6'; c.lineWidth = 3 * inv; c.setLineDash([10 * inv, 6 * inv]); c.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h); c.setLineDash([]);
      if (sel.type !== 'cell' && !sel.locked) { const hs = 16 * inv; c.fillStyle = '#8b5cf6'; c.fillRect(b.w / 2 - hs / 2, b.h / 2 - hs / 2, hs, hs); }
      c.restore();
    }
  }

  /* ---------- main entry ---------- */
  PS.render = function (ctx, outW, s, o) {
    o = o || {}; const D = PS.DESIGNS[s.design], sc = outW / D.w; o.sc = sc;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, outW, outW * D.h / D.w);
    ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    drawBackground(ctx, s, D, sc);
    const rects = PS.cellRects(s);
    s.layers.forEach(l => {
      if (l.hidden) { delete PS.bounds[l.id]; return; }
      if (l.type === 'cell') drawCell(ctx, l, rects[l.slot], s, o);
      else if (l.type === 'text' || l.type === 'stamp') drawText(ctx, l, o);
      else if (l.type === 'emoji') drawEmoji(ctx, l, o);
      else if (l.type === 'image') drawImageLayer(ctx, l);
    });
    if (o.preview) drawOverlays(ctx, s, D, o);
    ctx.restore();
  };
})(window.PS);
