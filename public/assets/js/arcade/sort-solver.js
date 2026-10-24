/* =====================================================================
   PLAYTION ARCADE — 캡슐 정리 문제 생성기·풀이기 (sort-solver.js)
   · 같은 시드면 같은 문제. 만든 문제는 풀 수 있는지 확인하고 기준 수(최소에 가까운 수)를 구한다.
   · 실서비스에서는 서버가 같은 코드를 돌려 기준 수를 미리 계산해 둔다(기획서 3.3).
   브라우저와 Node 양쪽에서 돌아가도록 window 없이도 동작한다.
   ===================================================================== */
(function (root) {
  'use strict';
  var CAP = 4;
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function clone(t) { return t.map(function (x) { return x.slice(); }); }
  function key(t) { return t.map(function (x) { return x.join(''); }).sort().join('|'); }
  function solved(t) { return t.every(function (x) { return x.length === 0 || (x.length === CAP && x.every(function (c) { return c === x[0]; })); }); }
  function canMove(t, a, b) {
    if (a === b) return false; var A = t[a], B = t[b];
    if (!A.length || B.length >= CAP) return false;
    if (B.length && B[B.length - 1] !== A[A.length - 1]) return false;
    /* 이미 한 색으로 찬 통에서는 꺼내지 않는다(의미 없는 수) */
    if (A.length === CAP && A.every(function (c) { return c === A[0]; })) return false;
    /* 빈 통으로 옮기는데 원래 통이 모두 같은 색이면 의미 없음 */
    if (!B.length && A.every(function (c) { return c === A[0]; })) return false;
    return true;
  }
  function moves(t) {
    var out = [], n = t.length, seenEmpty = false;
    for (var a = 0; a < n; a++) for (var b = 0; b < n; b++) {
      if (!canMove(t, a, b)) continue;
      if (!t[b].length) { if (seenEmpty) continue; seenEmpty = true; }   // 빈 통은 하나만 대표로
      out.push([a, b]);
    }
    return out;
  }
  function apply(t, m) { var n = clone(t); n[m[1]].push(n[m[0]].pop()); return n; }
  /* 너비 우선 탐색 — 가장 짧은 풀이. cap 안에 못 찾으면 null */
  function bfs(start, cap) {
    cap = cap || 120000;
    var k0 = key(start); if (solved(start)) return [];
    var q = [start], qi = 0, prev = {}; prev[k0] = null; var n = 0;
    while (qi < q.length) {
      var t = q[qi++]; var ms = moves(t);
      for (var i = 0; i < ms.length; i++) {
        var nt = apply(t, ms[i]), k = key(nt);
        if (prev[k] !== undefined) continue;
        prev[k] = { from: key(t), m: ms[i], t: t };
        if (solved(nt)) { var path = [], cur = k; while (prev[cur]) { path.unshift(prev[cur].m); cur = prev[cur].from; } return path; }
        q.push(nt); if (++n > cap) return null;
      }
    }
    return null;
  }
  /* 깊이 우선(기억) — 빠르게 풀이 하나 찾기 */
  function dfs(start, maxDepth) {
    var seen = {}, best = null;
    function rec(t, depth, path) {
      if (solved(t)) { best = path.slice(); return true; }
      if (depth >= maxDepth) return false;
      var k = key(t); if (seen[k] !== undefined && seen[k] <= depth) return false; seen[k] = depth;
      var ms = moves(t);
      /* 같은 색 위에 올리는 수를 먼저 */
      ms.sort(function (x, y) { var bx = t[x[1]].length ? 1 : 0, by = t[y[1]].length ? 1 : 0; return by - bx; });
      for (var i = 0; i < ms.length; i++) { path.push(ms[i]); if (rec(apply(t, ms[i]), depth + 1, path)) return true; path.pop(); }
      return false;
    }
    rec(start, 0, []); return best;
  }
  function solve(t, cap) { var p = bfs(t, cap); if (p) return { path: p, exact: true }; var d = dfs(t, 80); return d ? { path: d, exact: false } : null; }
  /* 문제 만들기: 정리된 상태에서 색 규칙을 무시하고 섞은 뒤, 풀 수 있는지 확인한다.
     minPar 이상인 문제를 찾을 때까지 시드를 바꿔 가며 시도하고, 못 찾으면 그중 가장 어려운 것을 준다 */
  function generate(seed, colors, tubes, shuffle, minPar) {
    var tries = 0, best = null; minPar = minPar || Math.max(4, Math.floor(shuffle * 0.3));
    while (tries++ < 60) {
      var r = rng(seed), t = [], lastFrom = -1;
      for (var c = 0; c < colors; c++) t.push([c, c, c, c]); for (var e = colors; e < tubes; e++) t.push([]);
      for (var s = 0; s < shuffle; s++) {
        var a = Math.floor(r() * tubes); if (!t[a].length || a === lastFrom) { s--; continue; }
        var col = t[a][t[a].length - 1], cands = [];
        for (var b = 0; b < tubes; b++) { if (b === a || t[b].length >= CAP) continue; var top = t[b].length ? t[b][t[b].length - 1] : -1; cands.push({ b: b, w: top === col ? 0.25 : (top < 0 ? 0.6 : 1) }); }
        if (!cands.length) { s--; continue; }
        var sum = cands.reduce(function (x, y) { return x + y.w; }, 0), pick = r() * sum, chosen = cands[0];
        for (var i = 0; i < cands.length; i++) { pick -= cands[i].w; if (pick <= 0) { chosen = cands[i]; break; } }
        t[chosen.b].push(t[a].pop()); lastFrom = chosen.b;
      }
      if (!solved(t)) {
        var sol = solve(t, 50000);
        if (sol) {
          var cand = { tubes: t, par: sol.path.length, exact: sol.exact, seed: seed, tries: tries };
          if (!best || cand.par > best.par) best = cand;
          if (cand.par >= minPar) return cand;
        }
      }
      seed = (seed + 7919) >>> 0;
    }
    return best;
  }
  var api = { generate: generate, solve: solve, moves: moves, canMove: canMove, apply: apply, solved: solved, key: key, hash: hash, CAP: CAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SORT_SOLVER = api;
})(typeof window !== 'undefined' ? window : this);
