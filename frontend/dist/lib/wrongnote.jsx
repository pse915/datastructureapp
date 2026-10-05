/* 오답노트 localStorage 저장소 (src/lib/wrongnote.js와 동기화) */
(function () {
  var PREFIX = 'th-wrong-';
  function key(sid) { return PREFIX + String(sid || 'anon'); }
  function load(sid) {
    try {
      var v = JSON.parse(localStorage.getItem(key(sid)));
      return Array.isArray(v) ? v : [];
    } catch (_) { return []; }
  }
  function save(sid, items) {
    try {
      var prev = load(sid);
      var seen = {};
      prev.forEach(function (w) { seen[w.week + ':' + w.key] = w; });
      (items || []).forEach(function (w) { seen[w.week + ':' + w.key] = w; });
      var next = Object.keys(seen).map(function (k) { return seen[k]; }).slice(-200);
      localStorage.setItem(key(sid), JSON.stringify(next));
      return next;
    } catch (_) { return items || []; }
  }
  window.__TECH_WRONGNOTE__ = { load: load, save: save, key: key };
})();
