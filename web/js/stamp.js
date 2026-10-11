/* stamp.js — smart timestamp: date/time formatting with custom patterns */
(function (PS) {
  const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const p2 = n => String(n).padStart(2, '0');
  /* tokens: YYYY YY MMMM MMM MM M dddd ddd DD D HH H hh h mm ss A a ; wrap literals in [brackets] */
  PS.formatDate = function (d, fmt) {
    const h12 = d.getHours() % 12 || 12;
    const T = { YYYY: d.getFullYear(), YY: String(d.getFullYear()).slice(2), MMMM: MON[d.getMonth()], MMM: MON[d.getMonth()].slice(0, 3),
      MM: p2(d.getMonth() + 1), M: d.getMonth() + 1, dddd: DAY[d.getDay()], ddd: DAY[d.getDay()].slice(0, 3), DD: p2(d.getDate()),
      D: d.getDate(), HH: p2(d.getHours()), H: d.getHours(), hh: p2(h12), h: h12, mm: p2(d.getMinutes()), ss: p2(d.getSeconds()),
      A: d.getHours() < 12 ? 'AM' : 'PM', a: d.getHours() < 12 ? 'am' : 'pm' };
    return String(fmt).replace(/\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|hh|h|mm|ss|A|a/g, (m, lit) => lit !== undefined ? lit : T[m]);
  };
  PS.STAMP_FORMATS = ['dddd, D MMMM YYYY • h:mm A', 'DD/MM/YYYY HH:mm', 'YYYY-MM-DD', 'D MMM YYYY', 'MMMM D, YYYY', 'ddd • HH:mm', 'h:mm A', 'HH:mm:ss', 'dddd', 'D MMM YYYY • dddd'];
  PS.stampText = function (l) {
    const d = l.live ? new Date() : (l.fixedTime ? new Date(l.fixedTime) : new Date());
    let t = PS.formatDate(isNaN(d) ? new Date() : d, l.fmt || 'DD/MM/YYYY HH:mm');
    if (l.location) t += '\n📍 ' + l.location;
    if (l.caption) t += '\n' + l.caption;
    return t;
  };
})(window.PS);
