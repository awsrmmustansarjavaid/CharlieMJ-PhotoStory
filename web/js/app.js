/* app.js — bootstrap */
(async function (PS) {
  await PS.loadSettings();
  PS.resetHistory(); PS.initUI(); PS.initEditor(); PS.layoutCanvas();
  document.getElementById('ver').textContent = 'v2.0';
  PS.notify('Welcome to CharlieMJ PhotoStory — drop photos on the canvas to begin.', 'info');
  PS.checkRecovery();
  window.addEventListener('beforeunload', e => { if (Object.keys(PS.assets).length) { e.preventDefault(); e.returnValue = ''; } });
})(window.PS);
