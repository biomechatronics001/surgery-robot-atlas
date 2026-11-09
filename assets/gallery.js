// Robot-page pictures. Two modes, chosen by site_src/config.json "gallery_mode" (the build writes the markup):
//  inline (figure.viewer[data-mode=inline]): the main picture is a viewer. ‹ › buttons and the Left/Right keys (when
//    the viewer or a thumbnail has focus) step through all pictures, wrapping; a thumbnail switches the viewer in place;
//    the caption follows; the URL keeps #p=N (1-based) so a picture can be linked and survives a reload.
//  lightbox: every a.g-item opens its picture in a dark overlay; arrows browse, Esc closes.
// Exposes window.__viewer / window.__lightbox for the browser tests (tools/shoot_site.py).
(function () {
  "use strict";
  var viewer = document.querySelector("figure.viewer[data-mode=inline]");
  if (viewer) { inline(viewer); return; }
  lightbox();

  function inline(fig) {
    var thumbs = Array.prototype.slice.call(document.querySelectorAll(".v-thumbs a.v-thumb"));
    var stage = fig.querySelector(".v-stage"), img = fig.querySelector(".v-img"), cap = fig.querySelector(".v-cap");
    var count = fig.querySelector(".v-count");
    var state = { mode: "inline", index: 0, count: thumbs.length };
    window.__viewer = state;
    function show(i, opts) {
      opts = opts || {};
      var n = thumbs.length;
      i = ((i % n) + n) % n;
      var a = thumbs[i];
      state.index = i;
      img.src = a.getAttribute("href");
      img.alt = a.querySelector("img").alt;
      cap.innerHTML = a.dataset.capHtml || "";          // built by tools/build_site.py from the record, escaped there
      count.textContent = (i + 1) + " / " + n;
      thumbs.forEach(function (t, k) {
        t.classList.toggle("on", k === i);
        if (k === i) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current");
      });
      if (opts.focusThumb) a.focus();
      if (!opts.keepHash) {
        var h = "#p=" + (i + 1);
        if (location.hash !== h) history.replaceState(null, "", h);
      }
    }
    function fromHash() {
      var m = /(?:^#|&)p=(\d+)/.exec(location.hash);
      if (m) show(parseInt(m[1], 10) - 1, { keepHash: true });
    }
    fig.querySelector(".v-prev").addEventListener("click", function () { show(state.index - 1); });
    fig.querySelector(".v-next").addEventListener("click", function () { show(state.index + 1); });
    thumbs.forEach(function (a, i) {
      a.addEventListener("click", function (e) { e.preventDefault(); show(i); });
      a.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); show(state.index + 1, { focusThumb: true }); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); show(state.index - 1, { focusThumb: true }); }
      });
    });
    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); show(state.index + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(state.index - 1); }
    });
    window.addEventListener("hashchange", fromHash);
    fromHash();
    state.show = show;
  }

  function lightbox() {
    var items = Array.prototype.slice.call(document.querySelectorAll("a.g-item"));
    if (!items.length) return;
    var box = document.createElement("div");
    box.className = "lb";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = '<button type="button" class="lb-close" aria-label="Close">×</button>' +
      '<button type="button" class="lb-prev" aria-label="Previous picture">‹</button>' +
      '<figure class="lb-fig"><img alt=""><figcaption><span class="lb-cap"></span> <span class="lb-src"></span>' +
      ' <span class="lb-n"></span></figcaption></figure>' +
      '<button type="button" class="lb-next" aria-label="Next picture">›</button>';
    document.body.appendChild(box);
    var img = box.querySelector("img"), cap = box.querySelector(".lb-cap"), src = box.querySelector(".lb-src"),
        num = box.querySelector(".lb-n");
    var state = { mode: "lightbox", open: false, index: -1, count: items.length };
    window.__lightbox = state;
    var lastFocus = null;
    function show(i) {
      i = (i + items.length) % items.length;
      var a = items[i];
      state.index = i;
      img.src = a.getAttribute("href");
      img.alt = a.dataset.caption || "";
      cap.textContent = a.dataset.caption || "";
      src.textContent = "";
      var s = a.dataset.source || "";
      if (a.dataset.url) {
        var link = document.createElement("a");
        link.href = a.dataset.url;
        link.textContent = s;
        link.rel = "noopener";
        src.appendChild(link);
      } else {
        src.textContent = s;
      }
      num.textContent = (i + 1) + " / " + items.length;
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      state.open = true;
      document.body.classList.add("lb-on");
      box.querySelector(".lb-close").focus();
    }
    function close() {
      box.hidden = true;
      state.open = false;
      document.body.classList.remove("lb-on");
      if (lastFocus) lastFocus.focus();
    }
    items.forEach(function (a, i) {
      a.addEventListener("click", function (e) { e.preventDefault(); open(i); });
    });
    box.querySelector(".lb-close").addEventListener("click", close);
    box.querySelector(".lb-prev").addEventListener("click", function () { show(state.index - 1); });
    box.querySelector(".lb-next").addEventListener("click", function () { show(state.index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!state.open) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(state.index + 1);
      else if (e.key === "ArrowLeft") show(state.index - 1);
    });
  }
})();
