(function () {
  // 다른 위키의 /id/<ID>.html 로 가는 링크의 글자를 상대 사이트의 ids.json 제목으로 바꾼다. 읽기에 실패하면 그대로 둔다.
  var cache = {};
  function run() {
    document.querySelectorAll('a[href*="/id/"]').forEach(function (a) {
      var m = (a.getAttribute("href") || "").match(/^(https?:\/\/.*\/)id\/((?:kcm|law)__[^\/]+)\.html$/);
      if (!m || a.dataset.xlinkDone) return;
      a.dataset.xlinkDone = "1";
      // 다른 위키로 가는 링크는 Quartz 의 페이지 내 이동(SPA)이 가로채지 못하게 한다.
      // 두 사이트가 같은 도메인이라 가로채면 이동 페이지의 상대 경로가 현재 사이트 기준으로 계산되어 404 가 난다.
      a.setAttribute("data-router-ignore", "");
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

(function () {
  // 읽기 도구: 글자 크기(A−/A+/기본), 인쇄·PDF, 마크다운(.md) 내려받기. 외부 자원을 쓰지 않는다.
  // 모든 페이지가 이미 불러오는 static/xlink-titles.js 에 postbuild-ids.py 가 이어 붙인다(HTML·CSS 해시를 바꾸지 않으려는 것).
  // kcm 위키(scripts/reader-tools.js)와 같은 내용을 유지한다. 저장이 막혀도 동작은 기본 크기로 이어진다.
  if (window.__readerTools) return;
  window.__readerTools = true;
  var KEY = "reader-font-pct", STEPS = [90, 100, 110, 125, 140, 160], DEF = 1;
  var script = document.currentScript;
  var site = null;
  try { site = new URL("../", script.src); } catch (e) {}

  function get() { try { var v = parseInt(localStorage.getItem(KEY), 10); var i = STEPS.indexOf(v); return i < 0 ? DEF : i; } catch (e) { return DEF; } }
  function put(i) { try { localStorage.setItem(KEY, String(STEPS[i])); } catch (e) {} }
  function apply(i) { document.documentElement.style.fontSize = STEPS[i] === 100 ? "" : STEPS[i] + "%"; }
  var level = get();
  apply(level);

  var st = document.createElement("style");
  st.textContent =
    ".reader-tools{position:absolute;right:0;bottom:.4rem;display:flex;gap:.25rem;z-index:11}" +
    "@media(max-width:700px){.reader-tools{position:static;margin-top:.35rem;flex-wrap:wrap}}" +
    ".reader-tools button{font:inherit;font-size:.78rem;line-height:1;padding:.3rem .5rem;border:1px solid var(--lightgray);border-radius:6px;background:var(--light);color:var(--darkgray);cursor:pointer}" +
    ".reader-tools button:hover{border-color:var(--gray);color:var(--dark)}" +
    ".reader-tools button[disabled]{opacity:.4;cursor:default}" +
    ".page-header{position:relative}" +
    "@media print{.reader-tools,.sidebar,.explorer,.search,.darkmode,.readermode{display:none!important}" +
    ".page > #quartz-body{display:block!important;height:auto!important;overflow:visible!important}" +
    ".center,.center>article{display:block!important;height:auto!important;overflow:visible!important}" +
    ".page-header{position:static!important}" +
    "img{max-width:100%!important;break-inside:avoid}}";
  document.head.appendChild(st);

  function pageMd() {
    if (!site) return null;
    var base = decodeURIComponent(site.pathname);
    var p = decodeURIComponent(location.pathname);
    if (p.indexOf(base) !== 0) return null;
    var rel = p.slice(base.length).replace(/\.html$/, "");
    if (!rel || /\/$/.test(rel)) rel += "index";
    return { url: new URL(rel.split("/").map(encodeURIComponent).join("/") + ".md", site).href, name: rel.split("/").pop() + ".md" };
  }

  function button(label, title, fn) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = label; b.title = title; b.setAttribute("aria-label", title);
    b.addEventListener("click", fn);
    return b;
  }

  function download(btn) {
    var t = pageMd();
    if (!t) { btn.disabled = true; return; }
    fetch(t.url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
      a.download = t.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }).catch(function () { btn.disabled = true; btn.title = "이 문서의 마크다운을 불러오지 못했습니다"; });
  }

  function mount() {
    var h = document.querySelector(".page-header");
    if (!h || h.querySelector(".reader-tools")) return;
    var box = document.createElement("div");
    box.className = "reader-tools";
    var step = function (d) { return function () { level = Math.max(0, Math.min(STEPS.length - 1, d === 0 ? DEF : level + d)); put(level); apply(level); }; };
    var md;
    box.appendChild(button("A−", "글자 작게", step(-1)));
    box.appendChild(button("A+", "글자 크게", step(1)));
    box.appendChild(button("기본", "글자 크기 기본으로", step(0)));
    box.appendChild(button("인쇄/PDF", "인쇄하거나 PDF로 저장", function () { window.print(); }));
    md = button("MD", "이 문서를 마크다운(.md)으로 내려받기", function () { download(md); });
    box.appendChild(md);
    h.appendChild(box);
  }

  document.addEventListener("nav", mount);
  mount();
})();
