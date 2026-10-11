/* settings.js — preferences. Portable: in the desktop app they live in settings.json
   next to the .exe; in a browser they fall back to localStorage. Also a tiny IndexedDB helper. */
(function (PS) {
  const DEFAULTS = { theme: 'dark', uiScale: 1, compact: false, exportDir: '', format: 'jpg', quality: 92, resolution: 1,
    baseName: 'CharlieMJ-Story', jpgBg: '#ffffff', safeArea: false, showGrid: true, sortMode: 'manual' };
  PS.settings = Object.assign({}, DEFAULTS);
  PS.loadSettings = async function () {
    let raw = null;
    try { raw = PS.isTauri() ? await PS.invoke('read_settings') : localStorage.getItem('cmj-settings'); } catch (e) {}
    try { if (raw) Object.assign(PS.settings, JSON.parse(raw)); } catch (e) {}
    PS.applySettings();
  };
  PS.saveSettings = function () {
    const j = JSON.stringify(PS.settings);
    try { localStorage.setItem('cmj-settings', j); } catch (e) {}
    if (PS.isTauri()) PS.invoke('write_settings', { json: j }).catch(() => {});
  };
  PS.applySettings = function () {
    const s = PS.settings, r = document.documentElement;
    r.dataset.theme = s.theme; r.style.setProperty('--ui', s.uiScale); document.body.classList.toggle('compact', !!s.compact);
    PS.emit('settings');
  };

  /* IndexedDB key/value (used for crash recovery) */
  let dbp;
  const db = () => dbp || (dbp = new Promise((res, rej) => { const q = indexedDB.open('cmj-photostory', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }));
  PS.idb = {
    async get(k) { const d = await db(); return new Promise((res, rej) => { const r = d.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async set(k, v) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
    async del(k) { const d = await db(); return new Promise(res => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = res; }); }
  };

  /* ---- crash recovery: debounce-save state + image blobs ---- */
  let timer;
  PS.scheduleRecovery = function () {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try { const assets = Object.values(PS.assets).map(a => ({ id: a.id, name: a.name, date: a.date, kind: a.kind, blob: a.blob }));
        await PS.idb.set('recovery', { state: PS.state, assets, order: PS.photoOrder, at: Date.now() }); } catch (e) { /* quota etc: ignore silently */ }
    }, 1500);
  };
  PS.checkRecovery = async function () {
    let rec; try { rec = await PS.idb.get('recovery'); } catch (e) { return; }
    if (!rec || !rec.state || !rec.state.layers.some(l => l.type !== 'cell' || l.assetId)) return;
    PS.notify('Unfinished work found from ' + new Date(rec.at).toLocaleString(), 'warn', { sticky: true, actions: [
      { label: 'Restore', fn: async () => { try { await PS.restoreRecord(rec.state, rec.assets, rec.order); PS.notify('Recovered your unfinished Story', 'success'); } catch (e) { PS.notify('Recovery failed: ' + e.message, 'error'); } } },
      { label: 'Discard', fn: () => PS.idb.del('recovery') }] });
  };
  /* shared by recovery + project open */
  PS.restoreRecord = async function (state, assets, order) {
    Object.values(PS.assets).forEach(a => URL.revokeObjectURL(a.url)); PS.assets = {}; PS.photoOrder = [];
    for (const a of assets) await PS.addAsset(a.blob, a.name, a.date, a.kind, a.id);
    if (order) PS.photoOrder = order.filter(id => PS.assets[id]);
    PS.state = state; PS.syncCells(PS.state); PS.selectedId = null; PS.resetHistory(); PS.emit('panels');
  };
})(window.PS);
