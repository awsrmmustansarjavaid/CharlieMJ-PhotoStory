/* ui.js — interface: left tool sidebar, contextual right panel, top bar, view bar, settings dialog */
(function (PS) {
  const $ = id => document.getElementById(id);
  const h = (tag, a, ...ch) => { const e = document.createElement(tag);
    for (const k in (a || {})) { const v = a[k]; if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden') e[k] = v; else e.setAttribute(k, v); }
    ch.flat(9).forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); }); return e; };
  PS.h = h;
  const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Tahoma', 'Palatino Linotype', 'Segoe UI', 'Lucida Console'];
  PS.fonts = FONTS.slice();

  /* ---------- control helpers (bind straight onto state objects) ---------- */
  const slider = (label, o, k, min, max, step, opt) => { opt = opt || {}; const fmt = opt.fmt || (v => +(+v).toFixed(2));
    const out = h('output', {}, fmt(o[k])), inp = h('input', { type: 'range', min, max, step: step || 1, value: o[k] });
    inp.oninput = () => { o[k] = +inp.value; out.textContent = fmt(o[k]); if (opt.after) opt.after(); PS.touch(); };
    inp.onchange = () => PS.commit('edit'); return h('label', { class: 'ctl' }, h('span', {}, label), inp, out); };
  const color = (label, o, k) => { const i = h('input', { type: 'color', value: o[k] }); i.oninput = () => { o[k] = i.value; PS.touch(); }; i.onchange = () => PS.commit('edit');
    return h('label', { class: 'ctl row' }, h('span', {}, label), i); };
  const check = (label, o, k, after) => { const i = h('input', { type: 'checkbox', checked: !!o[k] }); i.onchange = () => { o[k] = i.checked; PS.commit('edit'); if (after) after(); };
    return h('label', { class: 'ctl row chk' }, i, h('span', {}, label)); };
  const select = (label, o, k, opts, after) => { const s = h('select', {}, opts.map(x => { const [v, t] = Array.isArray(x) ? x : [x, x]; return h('option', { value: v, selected: String(o[k]) === String(v) }, t); }));
    s.onchange = () => { o[k] = isNaN(+s.value) || s.value === '' ? s.value : +s.value; PS.commit('edit'); if (after) after(); }; return h('label', { class: 'ctl' }, h('span', {}, label), s); };
  const btn = (label, fn, cls, title) => h('button', { class: 'b ' + (cls || ''), onclick: fn, title }, label);
  const sec = (title, ...c) => h('section', {}, h('h3', {}, title), c);
  const rowb = (...c) => h('div', { class: 'brow' }, c);
  const redraw = () => { PS.emit('panels'); };

  /* ---------- tabs ---------- */
  const LTABS = [['photos', '🖼', 'Photos'], ['layout', '▦', 'Layout'], ['style', '🎨', 'Style'], ['add', '＋', 'Add'], ['layers', '☰', 'Layers'], ['tpl', '✦', 'Templates']];
  const RTABS = [['props', 'Properties'], ['export', 'Export']];
  let ltab = 'photos', rtab = 'props';
  function tabs(host, list, cur, set) { host.replaceChildren(...list.map(t => h('button', { class: 'tab' + (t[0] === cur ? ' on' : ''), title: t[2] || t[1], onclick: () => set(t[0]) },
    t.length === 3 ? [h('b', {}, t[1]), h('small', {}, t[2])] : t[1]))); }

  /* ---------- LEFT: photos ---------- */
  function panelPhotos() {
    const ids = PS.photoOrder, sel = PS.selected(), grid = h('div', { class: 'thumbs' });
    ids.forEach((id, i) => { const a = PS.assets[id]; if (!a) return;
      grid.append(h('div', { class: 'thumb', title: a.name + '\nClick to place in ' + (sel && sel.type === 'cell' ? sel.name : 'next empty slot') },
        h('img', { src: a.url, onclick: () => PS.assignAsset(id) }),
        h('div', { class: 'tb' }, h('button', { onclick: () => { if (i > 0) { [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; PS.settings.sortMode = 'manual'; redraw(); } } }, '◀'),
          h('button', { onclick: () => { if (i < ids.length - 1) { [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; PS.settings.sortMode = 'manual'; redraw(); } } }, '▶'),
          h('button', { onclick: () => PS.removeAsset(id) }, '✕')),
        h('small', {}, a.name))); });
    const sortSel = h('select', { onchange: e => { PS.settings.sortMode = e.target.value; PS.saveSettings(); if (e.target.value !== 'manual') PS.photoOrder = PS.sortedPhotoIds(e.target.value); redraw(); PS.notify('Photos sorted by ' + e.target.value, 'info'); } },
      [['manual', 'Manual order'], ['name', 'Filename'], ['date', 'Capture date (EXIF)']].map(([v, t]) => h('option', { value: v, selected: PS.settings.sortMode === v }, t)));
    return [sec('Photo library', rowb(btn('＋ Add photos', () => { PS.pendingCell = null; $('fileInput').click(); }, 'primary')),
      h('p', { class: 'hint' }, 'Drop files onto the canvas, or click an empty slot. New photos fill empty slots automatically, keeping the important area in view.'),
      h('label', { class: 'ctl' }, h('span', {}, 'Order'), sortSel),
      rowb(btn('Auto-fill layout', () => { const n = PS.autoFill(PS.state, PS.sortedPhotoIds(PS.settings.sortMode), false); PS.commit(); redraw(); PS.notify('Filled ' + n + ' slots', 'success'); }, '', 'Replace every slot in order'),
        btn('Fill empty', () => { const n = PS.autoFill(PS.state, PS.sortedPhotoIds(PS.settings.sortMode), true); PS.commit(); redraw(); PS.notify('Filled ' + n + ' empty slots', 'success'); }))),
      ids.length ? grid : h('p', { class: 'empty' }, 'No photos yet')];
  }
  /* ---------- LEFT: layout ---------- */
  function panelLayout() {
    const s = PS.state, cards = Object.entries(PS.LAYOUTS).map(([id, L]) => {
      const rows = id === 'custom' ? s.rows : L.rows, cols = id === 'custom' ? s.cols : L.cols;
      const mini = h('div', { class: 'mini', style: 'grid-template-columns:repeat(' + cols + ',1fr);grid-template-rows:repeat(' + rows + ',1fr)' }, Array.from({ length: rows * cols }, () => h('i')));
      return h('button', { class: 'lcard' + (s.layout === id ? ' on' : ''), onclick: () => { PS.setLayout(id); PS.commit('layout'); redraw(); PS.notify('Layout: ' + L.label + ' (' + PS.state.rows * PS.state.cols + ' photos)', 'info'); } },
        mini, h('b', {}, id === 'custom' ? 'Custom' : id.replace('x', '×')), h('small', {}, id === 'custom' ? rows + '×' + cols : L.label)); });
    const out = [sec('Layout (rows × columns)', h('div', { class: 'lgrid' }, cards))];
    if (s.layout === 'custom') out.push(sec('Custom grid', slider('Rows', s, 'rows', 1, 8, 1, { after: () => { PS.syncCells(s); } }), slider('Columns', s, 'cols', 1, 8, 1, { after: () => { PS.syncCells(s); } }),
      btn('Apply grid', () => { PS.commit('grid'); redraw(); })));
    out.push(sec('Spacing & frames', slider('Gap', s, 'gap', 0, 120), slider('Outer margin', s, 'margin', 0, 200), slider('Rounded corners', s, 'radius', 0, 220),
      slider('Outline width', s, 'borderW', 0, 60), color('Frame colour', s, 'borderColor')));
    if (s.rows > 1 || s.cols > 1) out.push(sec('Panel sizes', s.rowW.length > 1 ? s.rowW.map((_, i) => slider('Row ' + (i + 1) + ' height', s.rowW, i, 0.3, 3, 0.05)) : null,
      s.colW.length > 1 ? s.colW.map((_, i) => slider('Column ' + (i + 1) + ' width', s.colW, i, 0.3, 3, 0.05)) : null));
    out.push(sec('Reset', rowb(btn('Reset layout', () => PS.resetLayout()), btn('Smart re-place photos', () => { PS.cells().forEach((c, i) => { if (c.assetId) PS.placePhoto(c, PS.assets[c.assetId], PS.cellRects(s)[i]); }); PS.commit(); PS.notify('Photos re-centred on their focal points', 'success'); }))));
    return out;
  }
  /* ---------- LEFT: style (background + palette) ---------- */
  let swatches = [], swPick = null;
  function panelStyle() {
    const s = PS.state, b = s.bg, out = [];
    out.push(sec('Background', select('Type', b, 'type', [['solid', 'Solid colour'], ['gradient', 'Gradient'], ['blur', 'Blurred photo'], ['image', 'Custom image'], ['transparent', 'Transparent (PNG/WebP)']], redraw)));
    if (b.type === 'solid' || b.type === 'blur' || b.type === 'image') out.push(color(b.type === 'solid' ? 'Colour' : 'Fallback colour', b, 'color'));
    if (b.type === 'gradient') out.push(color('From', b, 'c1'), color('To', b, 'c2'), slider('Angle', b, 'angle', 0, 360, 1, { fmt: v => v + '°' }));
    if (b.type === 'blur') out.push(slider('Blur amount', b, 'blur', 5, 120, 1), h('p', { class: 'hint' }, 'Uses the first photo in the layout.'));
    if (b.type === 'image') out.push(btn(b.assetId ? 'Replace background image' : 'Choose background image', () => $('bgInput').click()));
    out.push(h('p', { class: 'hint' }, 'Transparent areas are filled with your chosen backdrop colour when exporting JPG.'));
    const src = (PS.selected() && PS.selected().assetId) || (PS.cells().find(c => c.assetId) || {}).assetId;
    out.push(sec('Colour palette', h('p', { class: 'hint' }, 'Extract colours from ' + (src ? 'the selected / first photo.' : 'a photo (add one first).')),
      btn('Extract colours', () => { if (!src) return PS.notify('Add a photo first.', 'warn'); swatches = PS.extractPalette(PS.assets[src], 6); swPick = swatches[0]; redraw(); PS.notify('Extracted ' + swatches.length + ' colours', 'success'); }),
      swatches.length ? [h('div', { class: 'swatches' }, swatches.map(c => h('button', { class: 'sw' + (c === swPick ? ' on' : ''), style: 'background:' + c, title: c, onclick: () => { swPick = c; redraw(); } }))),
        h('small', {}, 'Apply ' + swPick + ' to:'),
        rowb(btn('Background', () => { b.type = 'solid'; b.color = swPick; PS.commit(); redraw(); }), btn('Frame', () => { s.borderColor = swPick; if (!s.borderW) s.borderW = 10; PS.commit(); redraw(); }),
          btn('Selected text', () => { const l = PS.selected(); if (l && (l.type === 'text' || l.type === 'stamp')) { l.color = swPick; PS.commit(); redraw(); } else PS.notify('Select a text layer first.', 'warn'); }))] : null));
    return out;
  }
  /* ---------- LEFT: add ---------- */
  const EMOJIS = ['🇵🇰', '🇹🇷', '❤️', '✨', '🔥', '📍', '😍', '😂', '🥰', '😎', '🎉', '🎂', '🎁', '⭐', '🌟', '💫', '🌈', '☀️', '🌙', '🌸', '🌿', '🌊', '🏔️', '✈️', '🚗', '🏖️', '📸', '🎵', '🍕', '🍔', '☕', '🍰', '🥳', '👍', '🙌', '💯', '💖', '💜', '🤍', '📚'];
  function panelAdd() {
    const custom = h('input', { type: 'text', placeholder: 'Type/paste any emoji', maxlength: 8 });
    return [sec('Text', rowb(btn('＋ Text box', () => PS.addLayer(PS.newText(), 'Text box added'), 'primary'), btn('＋ Timestamp', () => PS.addLayer(PS.newStamp({ y: 1700 }), 'Timestamp added'))),
      rowb(btn('＋ Username / signature', () => PS.addLayer(PS.newText({ name: 'Watermark', text: '@charliemj', size: 44, opacity: 0.8, bold: false, shadowBlur: 6, y: 1620 }), 'Watermark text added')),
        btn('＋ Logo image', () => $('logoInput').click()))),
      sec('Emoji', h('div', { class: 'emojis' }, EMOJIS.map(e => h('button', { onclick: () => PS.addLayer(PS.newEmoji(e), 'Emoji ' + e + ' added') }, e))),
        h('div', { class: 'brow' }, custom, btn('Add', () => { const v = custom.value.trim(); if (v) PS.addLayer(PS.newEmoji(v), 'Emoji added'); }))),
      h('p', { class: 'hint' }, 'Tip: drag objects on the canvas, scroll to resize, drag the corner handle, use arrow keys to nudge.')];
  }
  /* ---------- LEFT: layers ---------- */
  const ICON = { cell: '🖼', text: 'T', stamp: '🕒', emoji: '😀', image: '🏷' };
  function panelLayers() {
    const L = PS.state.layers.slice().reverse();
    return [sec('Layers (top → bottom)', h('div', { class: 'layers' }, L.map(l => h('div', { class: 'layer' + (l.id === PS.selectedId ? ' on' : '') + (l.hidden ? ' off' : ''), onclick: () => { PS.select(l.id); PS.emit('panels:right'); } },
      h('span', { class: 'li' }, ICON[l.type]), h('span', { class: 'ln' }, l.type === 'cell' ? l.name + (l.assetId ? '' : ' (empty)') : l.name),
      h('button', { title: l.hidden ? 'Show' : 'Hide', onclick: e => { e.stopPropagation(); l.hidden = !l.hidden; PS.commit(); redraw(); PS.notify((l.hidden ? 'Hidden: ' : 'Shown: ') + l.name, 'info'); } }, l.hidden ? '🚫' : '👁'),
      h('button', { title: l.locked ? 'Unlock' : 'Lock', onclick: e => { e.stopPropagation(); l.locked = !l.locked; PS.commit(); redraw(); PS.notify((l.locked ? 'Locked: ' : 'Unlocked: ') + l.name, 'info'); } }, l.locked ? '🔒' : '🔓'),
      h('button', { title: 'Move up', onclick: e => { e.stopPropagation(); PS.moveLayer(l.id, 1); } }, '▲'),
      h('button', { title: 'Move down', onclick: e => { e.stopPropagation(); PS.moveLayer(l.id, -1); } }, '▼'),
      h('button', { title: 'Duplicate', onclick: e => { e.stopPropagation(); PS.duplicateLayer(l.id); } }, '⧉'),
      h('button', { title: l.type === 'cell' ? 'Remove photo' : 'Delete', onclick: e => { e.stopPropagation(); PS.deleteLayer(l.id); } }, '🗑'))))),
      h('p', { class: 'hint' }, 'Photo slots come from the layout; they can be hidden, locked, reordered, or emptied but not deleted.')];
  }
  /* ---------- LEFT: templates ---------- */
  let tplName = '';
  function panelTpl() {
    const user = PS.userTemplates(), nm = h('input', { type: 'text', placeholder: 'Template name', value: tplName, oninput: e => { tplName = e.target.value; } });
    return [sec('Ready-made templates', h('div', { class: 'tpls' }, PS.BUILTIN_TEMPLATES.map(t => btn(t.name, () => PS.applyTemplate(t))))),
      sec('Your templates', user.length ? user.map((t, i) => h('div', { class: 'brow tplrow' }, btn(t.name, () => PS.applyTemplate(t)), btn('🗑', () => { PS.deleteUserTemplate(i); redraw(); }))) : h('p', { class: 'empty' }, 'None saved yet'),
        h('div', { class: 'brow' }, nm, btn('Save', () => { if (!tplName.trim()) return PS.notify('Give the template a name.', 'warn'); PS.saveUserTemplate(tplName.trim()); tplName = ''; redraw(); }))),
      sec('Duplicate Story', h('p', { class: 'hint' }, 'Keep this design (layout, text, emoji, colours) and clear the photos so you can swap in new ones.'), btn('Duplicate design & clear photos', () => PS.duplicateStory()))];
  }

  /* ---------- RIGHT: properties ---------- */
  function propsCell(c) {
    const a = PS.assets[c.assetId], rect = () => PS.cellRects(PS.state)[c.slot];
    const preset = h('select', { onchange: e => { c.adj = PS.clone(PS.PRESETS[e.target.value]); PS.commit('filter'); redraw(); PS.notify('Filter: ' + e.target.value, 'info'); } },
      [h('option', { value: '', disabled: true, selected: true }, 'Preset filter…'), ...Object.keys(PS.PRESETS).map(k => h('option', { value: k }, k))]);
    return [sec(c.name + (a ? ' — ' + a.name : ' (empty)'),
      rowb(btn(a ? 'Replace photo' : 'Add photo', () => PS.pickPhotoForCell(c), 'primary'), btn('Remove', () => PS.clearCell(c))),
      rowb(btn('Fit to frame', () => { Object.assign(c, { fit: 'fit', zoom: 1, offX: 0, offY: 0 }); PS.commit(); redraw(); }, '', 'Whole photo visible'),
        btn('Fill (crop)', () => { if (a) PS.placePhoto(c, a, rect()); PS.commit(); redraw(); }, '', 'Cover the frame, keeping the focal area'), btn('Reset photo', () => PS.resetPhoto(c)))),
      sec('Crop, zoom & position', slider('Zoom', c, 'zoom', 0.1, 6, 0.01, { fmt: v => Math.round(v * 100) + '%' }), slider('Position X', c, 'offX', -1.5, 1.5, 0.005), slider('Position Y', c, 'offY', -1.5, 1.5, 0.005),
        slider('Rotate', c, 'rot', -180, 180, 1, { fmt: v => v + '°' }), h('div', { class: 'brow' }, check('Flip ↔', c, 'flipH'), check('Flip ↕', c, 'flipV')),
        h('p', { class: 'hint' }, 'Drag the photo to reposition, scroll to zoom. The frame itself crops it.')),
      sec('Enhance', h('label', { class: 'ctl' }, h('span', {}, 'Filter'), preset),
        slider('Brightness', c.adj, 'brightness', 0, 200), slider('Contrast', c.adj, 'contrast', 0, 200), slider('Saturation', c.adj, 'saturation', 0, 200),
        slider('Warmth', c.adj, 'warmth', -100, 100), slider('Sharpness', c.adj, 'sharpness', 0, 100), slider('Grayscale', c.adj, 'grayscale', 0, 100), slider('Blur', c.adj, 'blur', 0, 12, 0.1),
        rowb(btn('Reset look', () => { c.adj = PS.clone(PS.PRESETS.None); PS.commit(); redraw(); }), btn('Apply look to all', () => { PS.cells().forEach(x => { x.adj = PS.clone(c.adj); }); PS.commit(); PS.notify('Look applied to all photos', 'success'); })))];
  }
  function commonObj(l) {
    const D = PS.DESIGNS[PS.state.design];
    return sec('Position & arrange', slider('X', l, 'x', 0, D.w, 1), slider('Y', l, 'y', 0, D.h, 1), slider('Rotate', l, 'rot', -180, 180, 1, { fmt: v => v + '°' }),
      rowb(btn('Center H', () => { l.x = D.w / 2; PS.commit(); redraw(); }), btn('Center V', () => { l.y = D.h / 2; PS.commit(); redraw(); }), btn('Duplicate', () => PS.duplicateLayer(l.id)), btn('Delete', () => PS.deleteLayer(l.id), 'danger')));
  }
  function propsText(l) {
    const isStamp = l.type === 'stamp', out = [];
    const nm = h('input', { type: 'text', value: l.name, oninput: e => { l.name = e.target.value; }, onchange: () => { PS.commit(); PS.emit('panels:left'); } });
    out.push(sec(isStamp ? 'Timestamp' : 'Text', h('label', { class: 'ctl' }, h('span', {}, 'Layer name'), nm)));
    if (!isStamp) out.push(h('textarea', { rows: 3, oninput: e => { l.text = e.target.value; PS.touch(); }, onchange: () => PS.commit('text') }, l.text));
    else {
      const fmts = PS.STAMP_FORMATS.includes(l.fmt) ? PS.STAMP_FORMATS : [l.fmt, ...PS.STAMP_FORMATS];
      out.push(select('Preset format', l, 'fmt', fmts.map(f => [f, PS.formatDate(new Date(), f)]), redraw),
        h('label', { class: 'ctl' }, h('span', {}, 'Custom format'), h('input', { type: 'text', value: l.fmt, oninput: e => { l.fmt = e.target.value; PS.touch(); }, onchange: () => { PS.commit(); } })),
        h('p', { class: 'hint' }, 'Tokens: YYYY MM DD dddd ddd MMMM MMM HH hh h mm ss A — wrap literal text in [brackets].'),
        h('div', { class: 'brow' }, btn('● Live clock', () => { l.live = true; PS.commit(); redraw(); }, l.live ? 'primary' : ''), btn('Fixed time', () => { l.live = false; PS.commit(); redraw(); }, l.live ? '' : 'primary')),
        l.live ? null : h('label', { class: 'ctl' }, h('span', {}, 'Date & time'), h('input', { type: 'datetime-local', value: l.fixedTime, oninput: e => { l.fixedTime = e.target.value; PS.touch(); }, onchange: () => PS.commit() })),
        h('label', { class: 'ctl' }, h('span', {}, 'Location (optional)'), h('input', { type: 'text', value: l.location, oninput: e => { l.location = e.target.value; PS.touch(); }, onchange: () => PS.commit() })),
        h('label', { class: 'ctl' }, h('span', {}, 'Caption (optional)'), h('input', { type: 'text', value: l.caption, oninput: e => { l.caption = e.target.value; PS.touch(); }, onchange: () => PS.commit() })));
    }
    const fontIn = h('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2', hidden: true, onchange: async e => { const f = e.target.files[0]; if (!f) return;
      try { const name = f.name.replace(/\.[^.]+$/, ''), ff = new FontFace(name, await f.arrayBuffer()); await ff.load(); document.fonts.add(ff); PS.fonts.push(name); l.font = name; PS.commit(); redraw(); PS.notify('Font loaded: ' + name + ' (not stored in project files)', 'success'); }
      catch (err) { PS.notify('Could not load font: ' + err.message, 'error'); } e.target.value = ''; } });
    const fl = PS.fonts.includes(l.font) ? PS.fonts : [l.font, ...PS.fonts];
    out.push(sec('Font', select('Family', l, 'font', fl), rowb(btn('Load font file…', () => fontIn.click()), fontIn),
      slider('Size', l, 'size', 12, 400, 1), color('Colour', l, 'color'),
      h('div', { class: 'brow' }, check('Bold', l, 'bold'), check('Italic', l, 'italic')),
      h('div', { class: 'brow seg' }, ['left', 'center', 'right'].map(a => btn({ left: '⯇', center: '☰', right: '⯈' }[a], () => { l.align = a; PS.commit(); redraw(); }, l.align === a ? 'primary' : '', 'Align ' + a))),
      slider('Opacity', l, 'opacity', 0.05, 1, 0.01)));
    out.push(sec('Outline, shadow & background', slider('Outline', l, 'outlineW', 0, 30), color('Outline colour', l, 'outlineColor'), slider('Shadow', l, 'shadowBlur', 0, 60), color('Shadow colour', l, 'shadowColor'),
      check('Background box', l, 'bgOn', redraw), l.bgOn ? [color('Box colour', l, 'bgColor'), slider('Box opacity', l, 'bgAlpha', 0, 1, 0.01), slider('Padding', l, 'pad', 0, 80)] : null));
    out.push(commonObj(l)); return out;
  }
  function propsEmoji(l) {
    return [sec('Emoji', h('label', { class: 'ctl' }, h('span', {}, 'Character'), h('input', { type: 'text', value: l.char, maxlength: 8, oninput: e => { l.char = e.target.value || '✨'; PS.touch(); }, onchange: () => PS.commit() })),
      slider('Size', l, 'size', 20, 800, 1), slider('Opacity', l, 'opacity', 0.05, 1, 0.01)), commonObj(l)];
  }
  function propsImage(l) {
    return [sec('Logo / signature', slider('Size', l, 'size', 30, 1080, 1), slider('Opacity', l, 'opacity', 0.05, 1, 0.01)), commonObj(l)];
  }
  function propsNone() {
    return [sec('Nothing selected', h('p', { class: 'hint' }, 'Click a photo, text, emoji or timestamp on the canvas (or in Layers) to edit it here.')),
      sec('Quick actions', rowb(btn('Undo', PS.undo), btn('Redo', PS.redo)), rowb(btn('Reset layout', PS.resetLayout), btn('Safe area', () => { PS.settings.safeArea = !PS.settings.safeArea; PS.saveSettings(); syncViewbar(); PS.touch(); })))];
  }
  function panelProps() {
    const l = PS.selected(); if (!l) return propsNone();
    const lock = l.locked ? [h('p', { class: 'hint warn' }, '🔒 This layer is locked — unlock it in Layers to move it.')] : [];
    const body = l.type === 'cell' ? propsCell(l) : (l.type === 'text' || l.type === 'stamp') ? propsText(l) : l.type === 'emoji' ? propsEmoji(l) : propsImage(l);
    return [...lock, ...body];
  }
  /* ---------- RIGHT: export ---------- */
  function panelExport() {
    const S = PS.settings, sz = PS.exportSize(), D = PS.DESIGNS[PS.state.design], fmtSel = select('Format', S, 'format', [['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP (optional)']], () => { PS.saveSettings(); redraw(); });
    const q = slider('JPG / WebP quality', S, 'quality', 50, 100, 1, { fmt: v => v + '%', after: () => PS.saveSettings() });
    const name = h('input', { type: 'text', value: S.baseName, oninput: e => { S.baseName = e.target.value.replace(/[\\/:*?"<>|]/g, '-'); PS.saveSettings(); } });
    const res = select('Resolution', S, 'resolution', [[1, D.w + '×' + D.h + ' (Full HD, standard)'], [1.3333333, Math.round(D.w * 1.3333333) + '×' + Math.round(D.h * 1.3333333) + ' (high-res)']], () => { PS.saveSettings(); redraw(); });
    return [sec('Export', h('p', { class: 'dims' }, sz.w + ' × ' + sz.h + ' px • ' + D.name), res, fmtSel, S.format === 'png' ? null : q,
      S.format === 'jpg' ? h('label', { class: 'ctl row' }, h('span', {}, 'Backdrop for transparent areas'), h('input', { type: 'color', value: S.jpgBg, oninput: e => { S.jpgBg = e.target.value; PS.saveSettings(); } })) : null,
      h('label', { class: 'ctl' }, h('span', {}, 'File name prefix'), name), h('small', {}, 'Saved as ' + (S.baseName || 'Story') + '-YYYYMMDD-HHMMSS.' + S.format),
      h('button', { class: 'b primary big', onclick: PS.exportCurrent }, '⬇ Export ' + S.format.toUpperCase() + ' (Ctrl+E)')),
      sec('Save location', h('p', { class: 'folder', title: S.exportDir }, S.exportDir ? '📁 ' + S.exportDir : '📁 Browser default (Downloads)'),
        rowb(btn('Choose folder…', PS.chooseFolder), btn('Open location', PS.revealLast, '', 'Desktop app only'))),
      sec('Batch export', h('p', { class: 'hint' }, 'Splits all library photos into Stories using the current layout (' + PS.state.rows * PS.state.cols + ' per Story, in the chosen order) and numbers each file.'),
        btn('Export all photos as Stories', PS.batchExport)),
      sec('Project', rowb(btn('Save project (Ctrl+S)', PS.saveProject), btn('Open…', () => $('projectInput').click())),
        h('p', { class: 'hint' }, '🔒 Everything stays on this PC. Unfinished work is auto-saved locally for crash recovery.'))];
  }

  /* ---------- assemble ---------- */
  function renderLeft() { tabs($('leftTabs'), LTABS, ltab, t => { ltab = t; renderLeft(); });
    const f = { photos: panelPhotos, layout: panelLayout, style: panelStyle, add: panelAdd, layers: panelLayers, tpl: panelTpl }[ltab]; $('leftBody').replaceChildren(...f()); }
  function renderRight() { tabs($('rightTabs'), RTABS, rtab, t => { rtab = t; renderRight(); });
    $('rightBody').replaceChildren(...(rtab === 'export' ? panelExport() : panelProps())); updateStatus(); }
  function updateStatus() {
    const s = PS.state, D = PS.DESIGNS[s.design], sz = PS.exportSize(), l = PS.selected();
    $('stLayout').textContent = (PS.LAYOUTS[s.layout].label) + ' • ' + s.rows + '×' + s.cols;
    $('stCanvas').textContent = D.w + '×' + D.h + ' → export ' + sz.w + '×' + sz.h + ' ' + PS.settings.format.toUpperCase();
    $('stSel').textContent = l ? 'Selected: ' + l.name : 'No selection';
    $('undoBtn').disabled = !PS.canUndo(); $('redoBtn').disabled = !PS.canRedo();
  }
  function syncViewbar() { $('safeChk').checked = PS.settings.safeArea; $('gridChk').checked = PS.settings.showGrid; $('stage').classList.toggle('grid', PS.settings.showGrid); }

  function settingsDialog() {
    const S = PS.settings, d = $('dlg'), keys = [['Ctrl+Z / Ctrl+Y', 'Undo / Redo'], ['Ctrl+S', 'Save project'], ['Ctrl+O', 'Open project'], ['Ctrl+E', 'Export'], ['Ctrl+D', 'Duplicate layer'], ['Delete', 'Delete layer / remove photo'], ['Arrows (Shift = ×10)', 'Nudge'], ['+ / −', 'Zoom selected photo'], ['Mouse wheel', 'Zoom photo / resize object'], ['Esc', 'Deselect']];
    d.replaceChildren(h('h2', {}, '⚙ Settings'),
      select('Interface design', S, 'theme', [['dark', 'Dark Creative Studio (default)'], ['minimal', 'Clean Minimal Studio'], ['premium', 'Premium Gradient Studio'], ['compact', 'Compact Portable Workspace']], () => { PS.applySettings(); PS.saveSettings(); PS.layoutCanvas(); }),
      slider('Interface scale', S, 'uiScale', 0.8, 1.4, 0.05, { fmt: v => Math.round(v * 100) + '%', after: () => { PS.applySettings(); PS.layoutCanvas(); } }),
      check('Compact workspace (smaller panels)', S, 'compact', () => { PS.applySettings(); PS.saveSettings(); PS.layoutCanvas(); }),
      h('p', { class: 'folder' }, 'Default export folder: ' + (S.exportDir || 'browser Downloads')), rowb(btn('Choose…', async () => { await PS.chooseFolder(); settingsDialog(); })),
      h('h3', {}, 'Keyboard shortcuts'), h('table', { class: 'keys' }, keys.map(k => h('tr', {}, h('td', {}, h('kbd', {}, k[0])), h('td', {}, k[1])))),
      h('p', { class: 'hint' }, PS.isTauri() ? 'Settings are stored next to the .exe (portable).' : 'Settings are stored in this browser.'), rowb(btn('Close', () => { PS.saveSettings(); d.close(); }, 'primary')));
    if (!d.open) d.showModal();
  }

  PS.initUI = function () {
    PS.on('panels', () => { renderLeft(); renderRight(); updateStatus(); });
    PS.on('panels:right', () => { renderRight(); if (ltab === 'layers') renderLeft(); });
    PS.on('panels:left', renderLeft);
    PS.on('select', () => { if (rtab !== 'props' && PS.selectedId) rtab = 'props'; renderRight(); if (ltab === 'layers') renderLeft(); });
    PS.on('committed', updateStatus); PS.on('settings', () => { syncViewbar(); updateStatus(); });
    $('btnNew').onclick = PS.newProject; $('btnOpen').onclick = () => $('projectInput').click(); $('btnSave').onclick = PS.saveProject;
    $('undoBtn').onclick = PS.undo; $('redoBtn').onclick = PS.redo; $('btnResetLayout').onclick = PS.resetLayout; $('btnResetPhoto').onclick = () => { const c = PS.selected(); if (c && c.type === 'cell') PS.resetPhoto(c); else PS.notify('Select a photo first.', 'info'); };
    $('btnExport').onclick = PS.exportCurrent; $('btnSettings').onclick = settingsDialog;
    $('btnTheme').onclick = () => { const T = ['dark', 'minimal', 'premium', 'compact'], n = T[(T.indexOf(PS.settings.theme) + 1) % 4]; PS.settings.theme = n; PS.applySettings(); PS.saveSettings(); PS.layoutCanvas(); PS.notify('Design: ' + n, 'info'); };
    const ds = $('designSel'); ds.replaceChildren(...Object.entries(PS.DESIGNS).map(([k, d]) => h('option', { value: k }, d.name)));
    ds.onchange = () => { PS.state.design = ds.value; PS.commit('design'); PS.layoutCanvas(); PS.notify('Design: ' + PS.DESIGNS[ds.value].name, 'info'); renderRight(); };
    PS.on('committed', () => { ds.value = PS.state.design; });
    $('zoomIn').onclick = () => { PS.view.zoom = Math.min(4, PS.view.zoom * 1.2); PS.layoutCanvas(); }; $('zoomOut').onclick = () => { PS.view.zoom = Math.max(0.3, PS.view.zoom / 1.2); PS.layoutCanvas(); };
    $('zoomFit').onclick = () => { PS.view.zoom = 1; PS.layoutCanvas(); };
    $('safeChk').onchange = e => { PS.settings.safeArea = e.target.checked; PS.saveSettings(); PS.touch(); };
    $('gridChk').onchange = e => { PS.settings.showGrid = e.target.checked; PS.saveSettings(); syncViewbar(); };
    $('fileInput').onchange = async e => { await PS.importFiles(e.target.files, PS.pendingCell); PS.pendingCell = null; e.target.value = ''; };
    $('projectInput').onchange = async e => { if (e.target.files[0]) await PS.openProjectFile(e.target.files[0]); e.target.value = ''; };
    $('bgInput').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const a = await PS.addAsset(f, f.name, f.lastModified, 'asset'); PS.state.bg.assetId = a.id; PS.state.bg.type = 'image'; PS.commit(); redraw(); PS.notify('Background image set', 'success'); } catch (err) { PS.notify('Could not load image', 'error'); } e.target.value = ''; };
    $('logoInput').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const a = await PS.addAsset(f, f.name, f.lastModified, 'asset'); PS.addLayer(PS.newImageLayer(a.id, f.name.replace(/\.[^.]+$/, '')), 'Logo added'); } catch (err) { PS.notify('Could not load image', 'error'); } e.target.value = ''; };
    PS.emit('panels'); syncViewbar();
  };
})(window.PS);
