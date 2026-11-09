// Library filters: OR within a facet, AND across facets, free-text search, sort. State lives in the URL hash
// (library.html#family=academic&valid=human,animal&q=roller&sort=name) so a filtered view can be linked.
(function () {
  "use strict";
  var grid = document.getElementById("grid");
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
  var fieldsets = Array.prototype.slice.call(document.querySelectorAll("fieldset[data-facet]"));
  var search = document.getElementById("q");
  var sortSel = document.getElementById("sort");
  var countEl = document.getElementById("count");
  var emptyEl = document.getElementById("empty");
  var total = cards.length;
  var state = { q: "", sort: sortSel ? sortSel.value : "year-desc", f: {} };
  fieldsets.forEach(function (fs) { state.f[fs.dataset.facet] = {}; });

  function vals(card, facet) { return (card.dataset[facet] || "").split("|"); }
  function selected(facet) { return Object.keys(state.f[facet] || {}); }
  function matches(card, skip) {
    for (var facet in state.f) {
      if (facet === skip) continue;
      var sel = selected(facet);
      if (!sel.length) continue;
      var v = vals(card, facet), ok = false;
      for (var i = 0; i < sel.length; i++) if (v.indexOf(sel[i]) >= 0) { ok = true; break; }
      if (!ok) return false;
    }
    if (state.q) {
      var words = state.q.split(/\s+/);
      for (var j = 0; j < words.length; j++) if (words[j] && card.dataset.q.indexOf(words[j]) < 0) return false;
    }
    return true;
  }
  var sorters = {
    "year-desc": function (a, b) { return (+b.dataset.year || 0) - (+a.dataset.year || 0) || a.dataset.name.localeCompare(b.dataset.name); },
    "year-asc": function (a, b) { return (+a.dataset.year || 9999) - (+b.dataset.year || 9999) || a.dataset.name.localeCompare(b.dataset.name); },
    "name": function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); },
    "validation": function (a, b) { return (+b.dataset.vrank) - (+a.dataset.vrank) || (+b.dataset.year || 0) - (+a.dataset.year || 0); }
  };
  function render() {
    var shown = 0;
    cards.forEach(function (c) { var ok = matches(c, null); c.hidden = !ok; if (ok) shown++; });
    fieldsets.forEach(function (fs) {
      var facet = fs.dataset.facet;
      Array.prototype.forEach.call(fs.querySelectorAll("input"), function (inp) {
        var m = 0;
        cards.forEach(function (c) { if (vals(c, facet).indexOf(inp.value) >= 0 && matches(c, facet)) m++; });
        var lab = inp.parentNode;
        lab.querySelector(".n").textContent = m;
        lab.classList.toggle("zero", m === 0 && !inp.checked);
      });
    });
    var sorted = cards.slice().sort(sorters[state.sort] || sorters["year-desc"]);
    sorted.forEach(function (c) { grid.appendChild(c); });
    countEl.textContent = shown === total ? total + " robots" : shown + " of " + total + " robots";
    emptyEl.hidden = shown !== 0;
    writeHash();
  }
  function writeHash() {
    var parts = [];
    for (var facet in state.f) { var s = selected(facet); if (s.length) parts.push(facet + "=" + s.map(encodeURIComponent).join(",")); }
    if (state.q) parts.push("q=" + encodeURIComponent(state.q));
    if (state.sort !== "year-desc") parts.push("sort=" + state.sort);
    var h = parts.join("&");
    if (("#" + h) !== location.hash && !(h === "" && location.hash === "")) history.replaceState(null, "", h ? "#" + h : location.pathname + location.search);
  }
  function readHash() {
    var h = location.hash.replace(/^#/, "");
    for (var facet in state.f) state.f[facet] = {};
    state.q = ""; state.sort = "year-desc";
    h.split("&").forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf("="), k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
      if (k === "q") state.q = v.toLowerCase();
      else if (k === "sort") state.sort = v;
      else if (state.f[k]) v.split(",").forEach(function (x) { if (x) state.f[k][decodeURIComponent(x)] = true; });
    });
    fieldsets.forEach(function (fs) {
      Array.prototype.forEach.call(fs.querySelectorAll("input"), function (inp) { inp.checked = !!state.f[fs.dataset.facet][inp.value]; });
    });
    if (search) search.value = state.q;
    if (sortSel) sortSel.value = state.sort;
  }
  fieldsets.forEach(function (fs) {
    fs.addEventListener("change", function (e) {
      var inp = e.target;
      if (inp.checked) state.f[fs.dataset.facet][inp.value] = true; else delete state.f[fs.dataset.facet][inp.value];
      render();
    });
    var more = fs.querySelector(".more");
    if (more) more.addEventListener("click", function () {
      var hiddenNow = fs.classList.toggle("collapsed");
      Array.prototype.forEach.call(fs.querySelectorAll("label.extra"), function (l) { l.hidden = hiddenNow; });
      more.textContent = hiddenNow ? more.dataset.show : "show fewer";
    });
  });
  if (search) search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); render(); });
  if (sortSel) sortSel.addEventListener("change", function () { state.sort = sortSel.value; render(); });
  var clear = document.getElementById("clear");
  if (clear) clear.addEventListener("click", function () { history.replaceState(null, "", location.pathname); readHash(); render(); });
  window.addEventListener("hashchange", function () { readHash(); render(); });
  readHash();
  // a checked value inside a collapsed list must stay visible
  fieldsets.forEach(function (fs) {
    Array.prototype.forEach.call(fs.querySelectorAll("label.extra"), function (l) { if (l.querySelector("input").checked) l.hidden = false; });
  });
  render();
})();

// Code-sample tabs on docs.html
(function () {
  Array.prototype.forEach.call(document.querySelectorAll(".tabs"), function (tabs) {
    var group = tabs.dataset.group;
    tabs.addEventListener("click", function (e) {
      if (e.target.tagName !== "BUTTON") return;
      Array.prototype.forEach.call(tabs.querySelectorAll("button"), function (b) { b.classList.toggle("on", b === e.target); });
      Array.prototype.forEach.call(document.querySelectorAll("pre[data-group='" + group + "']"), function (p) { p.hidden = p.dataset.tab !== e.target.dataset.tab; });
    });
  });
})();
