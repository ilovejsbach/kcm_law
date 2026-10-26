(function () {
  // 다른 위키의 /id/<ID>.html 로 가는 링크의 글자를 상대 사이트의 ids.json 제목으로 바꾼다. 읽기에 실패하면 그대로 둔다.
  var cache = {};
  function run() {
    document.querySelectorAll('a[href*="/id/"]').forEach(function (a) {
      var m = (a.getAttribute("href") || "").match(/^(https?:\/\/.*\/)id\/((?:kcm|law)__[^\/]+)\.html$/);
      if (!m || a.dataset.xlinkDone) return;
      a.dataset.xlinkDone = "1";
      var base = m[1], id = m[2].replace(/__/g, ":");
      (cache[base] = cache[base] || fetch(base + "ids.json").then(function (r) { return r.json(); }))
        .then(function (j) {
          var d = j.docs && j.docs[id];
          if (d && d.title) { var t = a.firstChild; if (t && t.nodeType === 3) t.nodeValue = d.title; else a.textContent = d.title; }
          else if (j.tombstones && j.tombstones[id]) a.title = "삭제되었거나 게시되지 않은 문서";
        })
        .catch(function () {});
    });
  }
  document.addEventListener("nav", run);
  run();
})();
