/* notify.js — Notification Service: toasts (bottom-right) + status-bar text */
(function (PS) {
  PS.notify = function (msg, type, opts) {
    opts = opts || {};
    const host = document.getElementById('toasts'); if (!host) return;
    const t = document.createElement('div'); t.className = 'toast ' + (type || 'info');
    const icon = { success: '✔', error: '✖', info: 'ℹ', progress: '⏳', warn: '⚠' }[type || 'info'];
    t.innerHTML = '<span class="ti">' + icon + '</span><span class="tm"></span>';
    t.querySelector('.tm').textContent = msg;
    (opts.actions || []).forEach(a => { const b = document.createElement('button'); b.textContent = a.label;
      b.onclick = () => { a.fn(); t.remove(); }; t.appendChild(b); });
    host.appendChild(t);
    while (host.children.length > 5) host.firstChild.remove();
    const life = opts.sticky ? 0 : (type === 'error' ? 7000 : 3200);
    if (life) setTimeout(() => t.classList.add('out'), life), setTimeout(() => t.remove(), life + 300);
    PS.status(msg);
    return t;
  };
  PS.status = function (msg) { const s = document.getElementById('stStatus'); if (s) s.textContent = msg; };
  window.addEventListener('error', e => PS.notify('Unexpected error: ' + (e.message || e), 'error'));
  window.addEventListener('unhandledrejection', e => PS.notify('Error: ' + ((e.reason && e.reason.message) || e.reason), 'error'));
})(window.PS);
