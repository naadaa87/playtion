/* =====================================================================
   PLAYTION ARCADE — 오락실 공통 (arcade-core.js)
   ---------------------------------------------------------------------
   레벨·XP, 오늘의/주간 퀘스트, 연속 출석(다루), 오늘의 캡슐(복냥),
   친밀도·도감, 업적, 랭킹 자료, 도전 링크, 결과 화면을 한곳에서 맡습니다.
   · 체험 모드: 기록이 이 브라우저(localStorage)에만 남습니다. 게스트 기록은
     PASS 로그인 뒤 회원 기록으로 합쳐집니다.
   · 실서비스: startRun / finishRun 을 /api/arcade/run/* 로 바꾸면 서버가
     시드를 주고 입력 기록을 검증합니다(기획서 11장). 화면 쪽 함수 이름은 같습니다.
   core.js(PLT) 와 data/arcade.js(PLT_ARCADE) 다음에 불러옵니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, A = window.PLT_ARCADE || {}, esc = PLT.esc, $ = PLT.$, $$ = PLT.$$;
  var KEY = 'arcade-v1';
  var ARC = window.ARC = {};
  var store = PLT.ls.get(KEY) || { v: 1, profiles: {} };
  if (!store.profiles) store.profiles = {};
  function save() { store.updatedAt = Date.now(); PLT.ls.set(KEY, store); }
  ARC.cfg = A;

  /* ---------- 시간 ---------- */
  function dayOf(d) { d = d ? new Date(d) : new Date(); var t = new Date(d.getTime() - (A.dayStartHour || 5) * 36e5); return PLT.ymd(t); }
  function weekOf(day) { var d = PLT.parseYmd(day || dayOf()); var dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return PLT.ymd(d); }
  var EPOCH = '2026-10-24';
  function dayNo(day) { return Math.floor((PLT.parseYmd(day || dayOf()) - PLT.parseYmd(EPOCH)) / 864e5) + 1; }
  ARC.day = dayOf; ARC.week = weekOf; ARC.dayNo = dayNo;
  ARC.yesterday = function () { return PLT.addDays(dayOf(), -1); };
  /* 다음 05:00 까지 남은 시간 문구 */
  ARC.untilReset = function () {
    var n = new Date(), r = new Date(n); r.setHours(A.dayStartHour || 5, 0, 0, 0); if (r <= n) r.setDate(r.getDate() + 1);
    var m = Math.round((r - n) / 60000); return m >= 60 ? Math.floor(m / 60) + '시간 ' + (m % 60) + '분' : m + '분';
  };

  /* ---------- 난수 (같은 시드면 같은 판) ---------- */
  ARC.seed = function (str) { return PLT.hash(String(str)); };
  ARC.rng = function (seed) {
    var a = (typeof seed === 'number' ? seed : PLT.hash(String(seed))) >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };

  /* ---------- 친구·게임 ---------- */
  var FR = {}; (A.friends || []).forEach(function (f) { FR[f.id] = f; });
  var GM = {}; (A.games || []).forEach(function (g) { GM[g.id] = g; });
  ARC.friend = function (id) { return FR[id] || FR.flea; };
  ARC.game = function (id) { return GM[id]; };
  ARC.img = function (id, small) { return PLT.url('assets/img/arcade/ch/' + (small ? 's/' : '') + (id || 'flea') + '.webp'); };
  ARC.friendName = function (id) { return (FR[id] || {}).name || id; };

  /* ---------- 프로필 ---------- */
  function ownerId() { return PLT.me ? 'm:' + PLT.me.id : 'guest'; }
  function blank() {
    return {
      v: 1, xp: 0, shards: 0, nick: '', friend: 'flea', title: '', frame: 'none', titles: [], frames: ['none'], modes: [],
      streak: { count: 0, last: '', shields: 0, max: 0, usedShield: '' }, days: [],
      runs: [], bests: {}, daily: { day: '', items: [], all: false, hist: [] }, weekly: { week: '', items: [], all: false, dailyDone: 0 },
      trophies: { week: '', n: 0 }, affinity: {}, met: [], cards: [], achievements: [], stories: [],
      stats: { runs: 0, bests: 0, shares: 0, beats: 0, questsDone: 0, jumpStars: 0, mergeMaxTier: 0, mergeMaxChain: 0, sortStage: 0, dailySortDays: 0, sortStar3Streak: 0, lastStar3Day: '' },
      dailySort: {}, capsule: { day: '', got: '' }, xpDay: { day: '', run: 0, best: 0 }, affDay: { day: '' },
      settings: { sound: true, haptic: true, cb: false, ctrl: 'touch' }, createdAt: Date.now()
    };
  }
  function upgrade(p) { var b = blank(); for (var k in b) if (p[k] === undefined) p[k] = b[k]; for (var s in b.stats) if (p.stats[s] === undefined) p.stats[s] = b.stats[s]; return p; }
  function prof() { var id = ownerId(); var p = store.profiles[id]; if (!p) { p = blank(); store.profiles[id] = p; } return upgrade(p); }
  ARC.me = function () { var p = prof(); ensureQuests(p); return p; };
  ARC.save = save;
  ARC.isGuest = function () { return !PLT.me; };
  ARC.nick = function (p) { p = p || prof(); return (PLT.me && (PLT.me.nick || PLT.me.name)) || p.nick || '게스트'; };

  /* 게스트 기록을 회원 기록으로 합치기 — 로그인 뒤 한 번 */
  function mergeGuest() {
    var g = store.profiles.guest; if (!PLT.me || !g || g.mergedInto || !g.stats || !g.stats.runs) return;
    var p = prof();
    p.xp += g.xp; p.shards += g.shards;
    g.runs.forEach(function (r) { p.runs.push(r); });
    for (var k in g.bests) if (!p.bests[k] || g.bests[k].score > p.bests[k].score) p.bests[k] = g.bests[k];
    for (var f in g.affinity) p.affinity[f] = (p.affinity[f] || 0) + g.affinity[f];
    ['met', 'cards', 'achievements', 'stories', 'titles', 'frames', 'modes', 'days'].forEach(function (k) { (g[k] || []).forEach(function (x) { if (p[k].indexOf(x) < 0) p[k].push(x); }); });
    for (var s in g.stats) { if (typeof g.stats[s] === 'number') p.stats[s] = /Max|Best|Stage|Streak/.test(s) ? Math.max(p.stats[s] || 0, g.stats[s]) : (p.stats[s] || 0) + g.stats[s]; }
    for (var d in g.dailySort) if (!p.dailySort[d]) p.dailySort[d] = g.dailySort[d];
    if (g.streak.count > p.streak.count) p.streak = g.streak;
    if (!p.nick && g.nick) p.nick = g.nick;
    if (g.friend && g.friend !== 'flea') p.friend = g.friend;
    g.mergedInto = ownerId(); g.mergedAt = Date.now();
    p.merged = true; save();
    PLT.toast('게스트로 쌓은 오락실 기록을 PASS에 합쳤어요.');
  }

  /* ---------- 레벨 ---------- */
  var LV = A.level || { max: 60, base: 50, step: 20 };
  ARC.need = function (L) { return LV.base + LV.step * L; };
  ARC.level = function (xp) {
    var L = 1, left = xp, need = ARC.need(1);
    while (L < LV.max && left >= need) { left -= need; L++; need = ARC.need(L); }
    return { level: L, into: left, need: L < LV.max ? need : 0, progress: L < LV.max ? left / need : 1, toNext: L < LV.max ? need - left : 0 };
  };

  /* ---------- 친밀도 ---------- */
  var AF = A.affinity || { per: 5, quest: 20, steps: [0] };
  ARC.affinityStep = function (pts) { var s = 1; for (var i = 0; i < AF.steps.length; i++) if (pts >= AF.steps[i]) s = i + 1; return Math.min(10, s); };
  ARC.affinityInfo = function (friendId, p) {
    p = p || prof(); var pts = p.affinity[friendId] || 0, step = ARC.affinityStep(pts);
    var next = step < 10 ? AF.steps[step] : null;
    return { pts: pts, step: step, next: next, progress: next ? (pts - AF.steps[step - 1]) / (next - AF.steps[step - 1]) : 1 };
  };

  /* ---------- 날짜 묶음 보정 ---------- */
  function pick(rng, arr, exclude) {
    var pool = arr.filter(function (q) { return exclude.indexOf(q.id) < 0; }); if (!pool.length) pool = arr;
    return pool[Math.floor(rng() * pool.length)];
  }
  function ensureQuests(p) {
    var day = dayOf(), week = weekOf(day), changed = false;
    if (p.daily.day !== day) {
      var r = ARC.rng('daily|' + day + '|' + ownerId());
      var hist = (p.daily.hist || []).slice(-6);
      var items = [A.dailyPool.join, A.dailyPool.skill, A.dailyPool.social].map(function (pool) {
        var q = pick(r, pool, hist); var it = { id: q.id, text: q.text, type: q.type, n: q.n, game: q.game || '', prog: 0, done: false, set: [] };
        if (q.type === 'hostRuns') { var hg = (FR[p.friend] || {}).game; if (!hg || !GM[hg] || !GM[hg].open) it.text = '아무 게임이나 2판'; else it.text = FR[p.friend].name + '의 ' + GM[hg].name + ' 2판'; it.game = (hg && GM[hg] && GM[hg].open) ? hg : ''; }
        return it;
      });
      p.daily = { day: day, items: items, all: false, hist: hist.concat(items.map(function (i) { return i.id; })), swapped: false };
      changed = true;
    }
    if (p.weekly.week !== week) {
      p.weekly = { week: week, items: (A.weekly || []).map(function (q) { return { id: q.id, text: q.text, type: q.type, n: q.n, prog: 0, done: false, set: [] }; }), all: false, dailyDone: 0 };
      changed = true;
    }
    if (p.trophies.week !== week) { p.trophies = { week: week, n: 0 }; changed = true; }
    if (p.xpDay.day !== day) { p.xpDay = { day: day, run: 0, best: 0 }; changed = true; }
    if (changed) save();
  }
  /* 하루에 한 번 퀘스트 하나 바꾸기 */
  ARC.swapQuest = function (idx) {
    var p = ARC.me(); if (p.daily.swapped) return PLT.toast('퀘스트 바꾸기는 하루에 한 번이에요.', 'err');
    var it = p.daily.items[idx]; if (!it || it.done) return;
    var pools = [A.dailyPool.join, A.dailyPool.skill, A.dailyPool.social][idx];
    var r = ARC.rng('swap|' + p.daily.day + '|' + ownerId() + '|' + idx);
    var q = pick(r, pools, p.daily.hist.concat([it.id]));
    p.daily.items[idx] = { id: q.id, text: q.text, type: q.type, n: q.n, game: q.game || '', prog: 0, done: false, set: [] };
    p.daily.hist.push(q.id); p.daily.swapped = true; save(); PLT.toast('퀘스트를 바꿨어요.');
    PLT.emit('arcade', { kind: 'quests' });
  };

  /* ---------- 사건 → 퀘스트 진행 ---------- */
  function advance(it, ev, p, scope) {
    if (it.done) return false;
    var t = it.type, day = dayOf(), week = weekOf(day);
    var run = ev.kind === 'run' ? ev : null, m = run ? (run.meta || {}) : {};
    var add = function (n) { it.prog = Math.min(it.n, it.prog + (n || 1)); };
    var setAdd = function (v) { if (it.set.indexOf(v) < 0) it.set.push(v); it.prog = Math.min(it.n, it.set.length); };
    var hit = function (v) { it.prog = Math.max(it.prog, Math.min(it.n, v)); };
    switch (t) {
      case 'runs': if (run) add(1); break;
      case 'games': if (run) setAdd(run.game); break;
      case 'dailySort': if (run && run.game === 'sort' && m.daily) add(1); break;
      case 'capsule': if (ev.kind === 'capsule') add(1); break;
      case 'hostRuns': if (run && (!it.game || run.game === it.game)) add(1); break;
      case 'runsOf': if (run && run.game === it.game) add(1); break;
      case 'scoreOf': if (run && run.game === it.game) hit(run.score >= it.n ? it.n : 0); break;
      case 'mergeTier': if (run && run.game === 'merge') hit(m.maxTier || 0); break;
      case 'chain': if (run && run.game === 'merge') hit(m.maxChain || 0); break;
      case 'sortStars': if (run && run.game === 'sort' && m.daily) hit(m.stars || 0); break;
      case 'sortNoUndo': if (run && run.game === 'sort' && m.cleared && !m.undo) add(1); break;
      case 'spring': if (run && run.game === 'jump') add(m.spring || 0); break;
      case 'sortStage': if (run && run.game === 'sort' && m.cleared && m.stage) hit(m.stage); break;
      case 'share': if (ev.kind === 'share') add(1); break;
      case 'beat': if (ev.kind === 'beat') add(1); break;
      case 'card': if (ev.kind === 'card') add(1); break;
      case 'deco': if (ev.kind === 'deco') add(1); break;
      case 'story': if (ev.kind === 'story') add(1); break;
      /* 주간 */
      case 'days': if (scope === 'week') { it.prog = Math.min(it.n, p.days.filter(function (d) { return weekOf(d) === week; }).length); } break;
      case 'dailyDone': if (ev.kind === 'dailyQuest') add(1); break;
      case 'dailySortDays': if (run && run.game === 'sort' && m.daily) setAdd(day); break;
      case 'bests': if (ev.kind === 'best') add(1); break;
    }
    if (it.prog >= it.n) { it.done = true; it.doneAt = Date.now(); return true; }
    return false;
  }
  var X = A.xp || {}, SH = A.shards || {};
  function applyEvent(p, ev, out) {
    out = out || { xp: 0, shards: 0, quests: [], notes: [] };
    ensureQuests(p);
    var dailyAfter = false;
    p.daily.items.forEach(function (it) {
      if (advance(it, ev, p, 'day')) {
        out.xp += X.daily || 30; out.shards += SH.daily || 10; p.stats.questsDone++; p.weekly.dailyDone++;
        out.quests.push({ text: it.text, kind: 'daily' }); dailyAfter = true;
        bumpAff(p, 'star', 5, out); if (it.game) bumpAff(p, (GM[it.game] || {}).host, AF.quest || 20, out);
      }
    });
    if (!p.daily.all && p.daily.items.every(function (i) { return i.done; })) { p.daily.all = true; out.xp += X.dailyAll || 40; out.shards += SH.dailyAll || 10; out.notes.push('오늘의 퀘스트 완주 보너스'); }
    if (dailyAfter) p.weekly.items.forEach(function (it) { if (advance(it, { kind: 'dailyQuest' }, p, 'week')) weeklyDone(p, it, out); });
    p.weekly.items.forEach(function (it) { if (advance(it, ev, p, 'week')) weeklyDone(p, it, out); });
    if (!p.weekly.all && p.weekly.items.every(function (i) { return i.done; })) {
      p.weekly.all = true; out.xp += X.weeklyAll || 100;
      if (p.streak.shields < (A.streak.shieldMax || 2)) { p.streak.shields++; out.notes.push('주간 퀘스트 완주 · 다루 방석 +1'); } else out.notes.push('주간 퀘스트 완주 보너스');
    }
    return out;
  }
  function weeklyDone(p, it, out) { out.xp += X.weekly || 60; out.shards += SH.weekly || 30; p.stats.questsDone++; out.quests.push({ text: it.text, kind: 'weekly' }); }

  /* ---------- 친밀도 올리기 ---------- */
  function bumpAff(p, friendId, pts, out) {
    if (!friendId || !FR[friendId] || !pts) return;
    var before = ARC.affinityStep(p.affinity[friendId] || 0);
    p.affinity[friendId] = (p.affinity[friendId] || 0) + pts;
    var after = ARC.affinityStep(p.affinity[friendId]);
    meet(p, friendId, out);
    if (out) { out.aff = out.aff || {}; out.aff[friendId] = (out.aff[friendId] || 0) + pts; }
    if (after > before) {
      if (out) (out.affUp = out.affUp || []).push({ friend: friendId, step: after });
      if (after >= 3 && p.cards.indexOf('o_' + friendId + '_1') < 0) giveCard(p, 'o_' + friendId + '_1', out);
      if (after >= 6 && p.cards.indexOf('o_' + friendId + '_2') < 0) giveCard(p, 'o_' + friendId + '_2', out);
      if (after >= 10) unlockTitle(p, FR[friendId].name + '의 절친', out);
    }
  }
  function meet(p, friendId, out) {
    if (!FR[friendId] || p.met.indexOf(friendId) >= 0) return false;
    p.met.push(friendId); giveCard(p, 'f_' + friendId, out);
    if (out) (out.met = out.met || []).push(friendId);
    return true;
  }
  function giveCard(p, id, out) { if (p.cards.indexOf(id) >= 0) return; p.cards.push(id); if (out) (out.cards = out.cards || []).push(id); }
  function unlockTitle(p, t, out) { if (p.titles.indexOf(t) >= 0) return; p.titles.push(t); if (out) (out.titles = out.titles || []).push(t); }
  function unlockFrame(p, f, out) { if (p.frames.indexOf(f) >= 0) return; p.frames.push(f); if (out) (out.frames = out.frames || []).push(f); }
  ARC.meet = function (friendId, aff) { var p = ARC.me(), out = { xp: 0, shards: 0, quests: [], notes: [] }; var isNew = meet(p, friendId, out); if (aff) bumpAff(p, friendId, aff, out); if (out.cards && out.cards.length) applyEvent(p, { kind: 'card' }, out); finish(p, out); save(); return isNew; };

  /* ---------- 연속 출석 ---------- */
  function touchStreak(p, out) {
    var day = dayOf(), s = p.streak;
    if (s.last === day) return false;
    var y = PLT.addDays(day, -1), y2 = PLT.addDays(day, -2);
    if (s.last === y) s.count++;
    else if (s.last === y2 && s.shields > 0) { s.shields--; s.count++; s.usedShield = y; if (out) out.notes.push('어제는 다루 방석이 기록을 지켰어요'); }
    else s.count = 1;
    s.last = day; s.max = Math.max(s.max || 0, s.count);
    if (p.days.indexOf(day) < 0) { p.days.push(day); if (p.days.length > 90) p.days = p.days.slice(-90); }
    if (out) out.streak = { count: s.count, extended: true };
    if (s.count >= 2) bumpAff(p, 'daruma', 5, out);
    (A.streak.milestones || []).forEach(function (m) { if (s.count === m) { unlockTitle(p, m + '일 개근', out); if (out) out.notes.push(m + '일 연속 출석!'); } });
    return true;
  }

  /* ---------- 업적 ---------- */
  function statValue(p, stat) {
    switch (stat) {
      case 'level': return ARC.level(p.xp).level;
      case 'mergeBest': return (p.bests.merge || {}).score || 0;
      case 'jumpBest': return (p.bests.jump || {}).score || 0;
      case 'met': return p.met.length;
      case 'affinity5': return Object.keys(p.affinity).filter(function (f) { return ARC.affinityStep(p.affinity[f]) >= 5; }).length;
      case 'streakMax': return p.streak.max || 0;
      default: return p.stats[stat] || 0;
    }
  }
  function checkAchievements(p, out) {
    (A.achievements || []).forEach(function (a) {
      if (p.achievements.indexOf(a.id) >= 0) return;
      if (statValue(p, a.stat) >= a.n) {
        p.achievements.push(a.id); p.shards += a.shards || 0;
        if (a.title) unlockTitle(p, a.title, out);
        if (out) { (out.achievements = out.achievements || []).push(a); out.shards += a.shards || 0; }
      }
    });
  }
  ARC.achievementDefs = function () { return A.achievements || []; };
  ARC.statValue = statValue;

  /* ---------- 레벨업 처리 ---------- */
  function finish(p, out) {
    var before = ARC.level(p.xp).level;
    p.xp += out.xp || 0; p.shards += out.shards || 0;
    var after = ARC.level(p.xp).level;
    if (after > before) {
      out.levelUp = { from: before, to: after, rewards: [] };
      for (var L = before + 1; L <= after; L++) {
        var rw = (A.levelRewards || {})[L]; p.shards += SH.levelUp || 50;
        if (rw) { if (rw.title) unlockTitle(p, rw.title, out); if (rw.frame) unlockFrame(p, rw.frame, out); if (rw.mode && p.modes.indexOf(rw.mode) < 0) { p.modes.push(rw.mode); out.levelUp.rewards.push({ mode: rw.mode }); } out.levelUp.rewards.push(rw); }
      }
      bumpAff(p, 'koi', 20, out);
    }
    checkAchievements(p, out);
    p.updatedAt = Date.now();
  }

  /* ---------- 판 시작·끝 ---------- */
  ARC.startRun = function (game, mode, seed) {
    var p = ARC.me();
    var s = seed != null ? seed : (mode === 'daily' ? ARC.seed(game + '|daily|' + dayOf()) : (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    var run = { id: PLT.uid('r'), game: game, mode: mode || 'normal', seed: s >>> 0, day: dayOf(), startedAt: Date.now() };
    PLT.track('game_start', { game: game, mode: run.mode });
    return run;
  };
  /* result: { score, meta:{...} } → 보상 요약 */
  ARC.finishRun = function (run, result) {
    var p = ARC.me(), out = { xp: 0, shards: 0, quests: [], notes: [], trophies: 0 };
    var score = Math.max(0, Math.round(result.score || 0)), meta = result.meta || {};
    var rec = { id: run.id, game: run.game, mode: run.mode, seed: run.seed, score: score, day: run.day, week: weekOf(run.day), at: Date.now(), dur: Math.round((Date.now() - run.startedAt) / 1000), meta: meta };
    p.runs.push(rec); if (p.runs.length > 400) p.runs = p.runs.slice(-400);
    p.stats.runs++;
    /* XP — 한 판 */
    var xd = p.xpDay; if (xd.run < (X.runCap || 150)) { xd.run += X.run || 10; out.xp += X.run || 10; out.runXp = X.run || 10; }
    /* 개인 최고 */
    var key = run.game + (run.mode === 'daily' ? '' : '') ; var b = p.bests[key];
    var better = run.game === 'sort' ? false : (!b || score > b.score);
    out.prevBest = b ? b.score : 0;
    if (better && run.game !== 'sort') {
      p.bests[key] = { score: score, at: Date.now(), seed: run.seed, mode: run.mode };
      out.isBest = !!b; out.first = !b;
      if (b) { p.stats.bests++; if (xd.best < (X.bestCap || 3)) { xd.best++; out.xp += X.best || 20; out.bestXp = X.best || 20; } applyEvent(p, { kind: 'best' }, out); }
    }
    /* 트로피 */
    var tr = 1, th = (A.trophy || {})[run.game] || [];
    if (run.game === 'sort') { tr = Math.max(1, meta.stars || 0) + (meta.stars >= 3 && meta.moves <= meta.par ? 1 : 0) + (meta.daily && meta.firstToday ? 1 : 0); }
    else th.forEach(function (t) { if (score >= t) tr++; });
    tr = Math.min(5, tr);
    var sameToday = p.runs.filter(function (r) { return r.game === run.game && r.day === run.day; }).length;
    if (sameToday > 20) tr = Math.max(1, Math.round(tr / 2));
    p.trophies.n += tr; out.trophies = tr;
    /* 게임별 통계·친밀도·만남 */
    var g = GM[run.game] || {};
    bumpAff(p, g.host, AF.per || 5, out);
    if (run.game === 'merge') {
      p.stats.mergeMaxTier = Math.max(p.stats.mergeMaxTier, meta.maxTier || 0);
      p.stats.mergeMaxChain = Math.max(p.stats.mergeMaxChain, meta.maxChain || 0);
      (meta.metFriends || []).forEach(function (f) { meet(p, f, out); });
    }
    if (run.game === 'jump') { p.stats.jumpStars += meta.stars || 0; }
    if (run.game === 'sort' && meta.cleared) {
      if (meta.stage) p.stats.sortStage = Math.max(p.stats.sortStage, meta.stage);
      if (meta.daily) {
        var d = p.dailySort[run.day];
        if (!d || meta.moves < d.moves || (meta.moves === d.moves && meta.time < d.time)) p.dailySort[run.day] = { moves: meta.moves, time: meta.time, stars: meta.stars, par: meta.par, no: dayNo(run.day), at: Date.now() };
        if (!d) { p.stats.dailySortDays++; }
        if (meta.stars >= 3) { if (p.stats.lastStar3Day === PLT.addDays(run.day, -1)) p.stats.sortStar3Streak++; else if (p.stats.lastStar3Day !== run.day) p.stats.sortStar3Streak = 1; p.stats.lastStar3Day = run.day; }
      }
    }
    /* 도전장 결과 */
    if (result.challenge && result.challenge.score != null) {
      out.challenge = result.challenge;
      var won = run.game === 'sort' ? (score > 0 && meta.moves <= result.challenge.score) : score > result.challenge.score;
      out.challenge.won = won;
      if (won) { p.stats.beats++; applyEvent(p, { kind: 'beat' }, out); }
      meet(p, 'fox', out);
    }
    touchStreak(p, out);
    applyEvent(p, { kind: 'run', game: run.game, score: score, meta: meta }, out);
    if (out.cards && out.cards.length) applyEvent(p, { kind: 'card' }, out);
    finish(p, out);
    save();
    PLT.track('game_end', { game: run.game, mode: run.mode, score: score, best: !!out.isBest });
    PLT.emit('arcade', { kind: 'run', run: rec, out: out });
    out.run = rec; out.score = score; out.game = run.game;
    return out;
  };

  /* ---------- 기타 사건 ---------- */
  ARC.event = function (kind, extra) {
    var p = ARC.me(), out = { xp: 0, shards: 0, quests: [], notes: [] };
    if (kind === 'share') { p.stats.shares++; bumpAff(p, 'tiger', 5, out); }
    if (kind === 'beat') p.stats.beats++;
    if (kind === 'deco') bumpAff(p, 'moonjar', 10, out);
    if (kind === 'story') { if (extra && p.stories.indexOf(extra) < 0) p.stories.push(extra); }
    if (kind === 'visit') { var d = dayOf(); if (p.affDay.day !== d) { p.affDay.day = d; bumpAff(p, 'gachabot', 5, out); touchStreak(p, out); } else return out; }
    if (kind === 'rank') { var dd = dayOf(); if (p.affDay.rank !== dd) { p.affDay.rank = dd; bumpAff(p, 'goblin', 3, out); } else return out; }
    applyEvent(p, { kind: kind }, out);
    if (out.cards && out.cards.length && kind !== 'card') applyEvent(p, { kind: 'card' }, out);
    finish(p, out); save();
    if (out.xp || out.quests.length || out.levelUp) PLT.emit('arcade', { kind: kind, out: out });
    return out;
  };

  /* ---------- 복냥의 오늘의 캡슐 ---------- */
  ARC.capsuleToday = function () { var p = ARC.me(); return p.capsule.day === dayOf() ? p.capsule : null; };
  ARC.openCapsule = function () {
    var p = ARC.me(); if (p.capsule.day === dayOf()) return null;
    var r = ARC.rng('capsule|' + dayOf() + '|' + ownerId() + '|' + Math.floor(Math.random() * 1e6))(), acc = 0, got = A.dailyCapsule[0];
    for (var i = 0; i < A.dailyCapsule.length; i++) { acc += A.dailyCapsule[i].p; if (r < acc) { got = A.dailyCapsule[i]; break; } }
    p.capsule = { day: dayOf(), got: got.id };
    var out = { xp: 0, shards: got.shards, quests: [], notes: [] };
    bumpAff(p, 'cat', 5, out); touchStreak(p, out);
    applyEvent(p, { kind: 'capsule' }, out);
    if (out.cards && out.cards.length) applyEvent(p, { kind: 'card' }, out);
    finish(p, out); save();
    out.got = got; PLT.emit('arcade', { kind: 'capsule', out: out });
    return out;
  };

  /* ---------- 꾸미기 ---------- */
  ARC.setDeco = function (patch) {
    var p = ARC.me(), changed = false;
    if (patch.friend && FR[patch.friend] && ARC.affinityStep(p.affinity[patch.friend] || 0) >= 5 || patch.friend === 'flea') { if (p.friend !== patch.friend) { p.friend = patch.friend; changed = true; } }
    if (patch.title !== undefined && (patch.title === '' || p.titles.indexOf(patch.title) >= 0)) { if (p.title !== patch.title) { p.title = patch.title; changed = true; } }
    if (patch.frame && p.frames.indexOf(patch.frame) >= 0) { if (p.frame !== patch.frame) { p.frame = patch.frame; changed = true; } }
    if (patch.nick !== undefined) { p.nick = String(patch.nick).replace(/[<>]/g, '').trim().slice(0, 12); changed = true; }
    if (patch.settings) { for (var k in patch.settings) p.settings[k] = patch.settings[k]; save(); return; }
    if (changed) { save(); ARC.event('deco'); }
  };

  /* ---------- 카드·도감 ---------- */
  ARC.cardInfo = function (id) {
    var m = /^(f|o)_([a-z]+)(?:_(\d))?$/.exec(id); if (!m) return { id: id, name: id };
    var f = FR[m[2]] || {};
    if (m[1] === 'f') return { id: id, kind: 'friend', friend: m[2], name: f.name + ' 카드', sub: '첫 만남' };
    return { id: id, kind: 'outfit', friend: m[2], name: f.name + ' 의상 ' + m[3], sub: '친밀도 ' + (m[3] === '1' ? 3 : 6) };
  };
  ARC.cardTotal = function () { return (A.friends || []).length * 3; };   // 친구 14 + 의상 28

  /* ---------- 랭킹 자료 ---------- */
  function allProfiles() {
    var out = [];
    for (var id in store.profiles) {
      var p = store.profiles[id]; if (!p || p.mergedInto) continue;
      var nick = id === 'guest' ? (p.nick || '게스트') : (p.nick || (PLT.me && 'm:' + PLT.me.id === id ? (PLT.me.nick || PLT.me.name) : '') || '회원');
      out.push({ id: id, p: p, nick: nick, me: id === ownerId(), guest: id === 'guest' });
    }
    return out;
  }
  /* game: merge|jump|sort, period: week|all|daily */
  ARC.board = function (game, period) {
    var week = weekOf(dayOf()), day = dayOf(), rows = [];
    allProfiles().forEach(function (o) {
      var p = o.p, v = null, extra = '';
      if (game === 'sort') {
        var d = p.dailySort[day]; if (period === 'daily' && d) { v = d.moves; extra = (d.time ? fmtTime(d.time) : '') + ' · ' + '★'.repeat(d.stars || 0); }
        if (period !== 'daily') { var days = Object.keys(p.dailySort).filter(function (k) { return period === 'all' || weekOf(k) === week; }); if (days.length) { v = days.length; extra = '문제 ' + days.length + '개'; } }
      } else if (game === 'trophy') { if (p.trophies.week === week && p.trophies.n) v = p.trophies.n; }
      else {
        if (period === 'week') { p.runs.forEach(function (r) { if (r.game === game && r.week === week) v = Math.max(v || 0, r.score); }); }
        else if (p.bests[game]) v = p.bests[game].score;
      }
      if (v != null) rows.push({ nick: o.nick, friend: p.friend, frame: p.frame, title: p.title, v: v, me: o.me, guest: o.guest, extra: extra, level: ARC.level(p.xp).level });
    });
    var asc = game === 'sort' && period === 'daily';
    rows.sort(function (a, b) { return asc ? a.v - b.v : b.v - a.v; });
    return rows;
  };
  /* 타운 친구(연습 상대) 기록 — 실제 회원이 아니라고 화면에 표시 */
  ARC.ghosts = function (game) {
    var g = (A.townGhosts || {})[game] || [], week = weekOf(dayOf()), r = ARC.rng('ghost|' + game + '|' + week);
    return g.map(function (x) { var jitter = 0.9 + r() * 0.2; return { nick: FR[x[0]].name, friend: x[0], ghost: true, v: game === 'sort' ? x[1] : Math.round(x[1] * jitter) }; });
  };
  /* 토토 점프 친구 깃발 — 다른 플레이어 최고 높이 */
  ARC.flags = function (game) {
    var mine = ownerId(), out = [];
    allProfiles().forEach(function (o) { if (o.id === mine) return; var b = o.p.bests[game]; if (b) out.push({ nick: o.nick, v: b.score, friend: o.p.friend }); });
    ARC.ghosts(game).forEach(function (g) { out.push({ nick: g.nick, v: g.v, friend: g.friend, ghost: true }); });
    return out.sort(function (a, b) { return a.v - b.v; });
  };
  function fmtTime(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + PLT.pad(s % 60); }
  ARC.fmtTime = fmtTime;

  /* ---------- 도전 링크 ---------- */
  function b64u(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { try { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); } catch (e) { return ''; } }
  ARC.challengeLink = function (run, score, extra) {
    var d = { g: run.game, s: run.seed, m: run.mode, sc: score, n: ARC.nick().slice(0, 12), t: Math.floor(Date.now() / 1000) };
    if (extra) for (var k in extra) d[k] = extra[k];
    var site = (PLT.S.siteUrl || location.origin).replace(/\/$/, '');
    return site + '/' + (GM[run.game] || {}).path + '?c=' + b64u(JSON.stringify(d));
  };
  ARC.readChallenge = function () {
    var c = PLT.param('c'); if (!c) return null;
    try { var d = JSON.parse(unb64u(c)); if (!d || !d.g || d.s == null) return null; d.n = String(d.n || '친구').slice(0, 12); return d; } catch (e) { return null; }
  };
  ARC.share = function (title, text, url) {
    var p = ARC.me();
    PLT.track('share_challenge', { game: PLT.page });
    var done = function () { ARC.event('share'); };
    if (navigator.share) return navigator.share({ title: title, text: text, url: url }).then(done, function () { });
    PLT.copy(text + '\n' + url, '도전 링크를 복사했어요. 친구에게 붙여 넣어 보내세요.'); done(); return Promise.resolve();
  };

  /* ---------- 결과 카드 이미지 (공유·저장) ---------- */
  ARC.resultCard = function (opt) {
    var W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
    var col = { red: '#F2242B', blue: '#063BCC', yellow: '#FFD51C', ink: '#111' }[opt.color || 'red'] || '#F2242B';
    var dark = opt.color !== 'yellow';
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.fillStyle = col; x.fillRect(0, 0, W, 300);
    /* 체커 띠 */
    for (var i = 0; i < W / 40; i++) { x.fillStyle = i % 2 ? '#111' : '#fff'; x.fillRect(i * 40, 300, 40, 40); }
    x.fillStyle = dark ? '#fff' : '#111'; x.font = '900 46px "Black Han Sans","Noto Sans KR",sans-serif'; x.textBaseline = 'top';
    x.fillText('PLAYTION ARCADE', 60, 60);
    x.font = '900 86px "Black Han Sans","Noto Sans KR",sans-serif'; x.fillText(opt.title || '', 60, 130);
    x.fillStyle = '#111'; x.font = '900 220px "Black Han Sans","Noto Sans KR",sans-serif'; x.fillText(String(opt.big || ''), 60, 400);
    x.font = '700 44px "Noto Sans KR",sans-serif'; x.fillStyle = '#3A3835'; x.fillText(opt.sub || '', 60, 650);
    x.font = '700 40px "Noto Sans KR",sans-serif'; x.fillStyle = '#111'; x.fillText(opt.who || '', 60, 720);
    (opt.lines || []).forEach(function (l, i) { x.fillStyle = '#3A3835'; x.font = '500 36px "Noto Sans KR",sans-serif'; x.fillText(l, 60, 790 + i * 52); });
    x.fillStyle = '#111'; x.fillRect(0, H - 180, W, 180);
    x.fillStyle = '#FFD51C'; x.font = '900 52px "Black Han Sans","Noto Sans KR",sans-serif'; x.fillText('playtion.kr/arcade', 60, H - 125);
    x.fillStyle = '#fff'; x.font = '500 30px "Noto Sans KR",sans-serif'; x.fillText('플레이션 오락실 · 나도 해 보기', 60, H - 62);
    return new Promise(function (res) {
      var img = new Image(); img.onload = function () { x.drawImage(img, W - 520, 560, 480, 480); out(); }; img.onerror = out; img.src = ARC.img(opt.friend || 'flea');
      function out() { c.toBlob(function (b) { res({ blob: b, url: c.toDataURL('image/png') }); }, 'image/png'); }
    });
  };
  ARC.saveCard = function (opt, fileName) {
    return ARC.resultCard(opt).then(function (r) {
      var f = fileName || 'playtion-arcade.png';
      if (navigator.canShare && window.File) { try { var file = new File([r.blob], f, { type: 'image/png' }); if (navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: opt.title }).then(function () { ARC.event('share'); }, function () { }); } catch (e) { } }
      var a = document.createElement('a'); a.href = r.url; a.download = f; document.body.appendChild(a); a.click(); a.remove(); ARC.event('share'); PLT.toast('결과 카드를 저장했어요.');
    });
  };

  /* ---------- 화면 부품 ---------- */
  ARC.avatar = function (friendId, frame, size) {
    return '<span class="arc-av arc-av--' + esc(frame || 'none') + '" style="--s:' + (size || 44) + 'px"><img src="' + ARC.img(friendId, true) + '" alt=""></span>';
  };
  ARC.levelBadge = function (xp) { return '<span class="arc-lv">Lv.' + ARC.level(xp).level + '</span>'; };
  ARC.pill = function (text, kind) { return '<span class="arc-pill' + (kind ? ' arc-pill--' + kind : '') + '">' + text + '</span>'; };
  /* 오락실 서브 메뉴 */
  ARC.nav = function (active) {
    var host = $('#arcNav'); if (!host) return;
    var items = [['index', '오락실', 'arcade/'], ['rank', '랭킹', 'arcade/rank'], ['dex', '도감', 'arcade/dex'], ['quests', '퀘스트·업적', 'arcade/quests']];
    host.innerHTML = '<div class="wrap subnav__in"><span class="subnav__line"><span class="lb lb--gacha lb--s">ARCADE</span></span>' + items.map(function (i) { return '<a class="sn" href="' + PLT.url(i[2]) + '"' + (i[0] === active ? ' aria-current="page"' : '') + '>' + i[1] + '</a>'; }).join('') + '</div>';
  };

  /* 결과 화면 — 세 게임이 함께 씁니다 */
  ARC.showResult = function (out, opt) {
    opt = opt || {};
    var g = GM[out.game] || {}, p = ARC.me(), lv = ARC.level(p.xp);
    var big = opt.big != null ? opt.big : PLT.num(out.score);
    var pills = [], baseXp = (out.runXp || 0) + (out.bestXp || 0), questXp = (out.xp || 0) - baseXp;
    if (baseXp) pills.push(ARC.pill('XP +' + baseXp + (out.bestXp ? ' (한 판 ' + out.runXp + ' · 신기록 ' + out.bestXp + ')' : ''), 'red'));
    else pills.push(ARC.pill('오늘 플레이 XP 상한 · 기록만 저장', 'ghost'));
    if (questXp > 0) pills.push(ARC.pill('퀘스트 XP +' + questXp, 'red'));
    pills.push(ARC.pill('트로피 +' + out.trophies, 'yellow'));
    if (out.shards) pills.push(ARC.pill('별조각 +' + out.shards));
    if (out.aff && out.aff[g.host]) pills.push(ARC.pill(ARC.friendName(g.host) + ' 친밀도 +' + out.aff[g.host], 'blue'));
    var lines = [];
    (out.quests || []).forEach(function (q) { lines.push('<li><b>' + (q.kind === 'weekly' ? '주간 퀘스트' : '퀘스트') + ' 완료</b> ' + esc(q.text) + ' ✔</li>'); });
    (out.met || []).forEach(function (f) { lines.push('<li><b>새 친구</b> ' + esc(ARC.friendName(f)) + '를 만났어요 · 카드 획득</li>'); });
    (out.affUp || []).forEach(function (a) { lines.push('<li><b>친밀도</b> ' + esc(ARC.friendName(a.friend)) + ' ' + a.step + '단계</li>'); });
    (out.achievements || []).forEach(function (a) { lines.push('<li><b>업적</b> ' + esc(a.name) + (a.title ? ' · 칭호 「' + esc(a.title) + '」' : '') + '</li>'); });
    (out.notes || []).forEach(function (n) { lines.push('<li>' + esc(n) + '</li>'); });
    if (out.levelUp) lines.push('<li><b>레벨 업!</b> Lv.' + out.levelUp.from + ' → Lv.' + out.levelUp.to + (out.levelUp.rewards.some(function (r) { return r.title; }) ? ' · 칭호 「' + esc(out.levelUp.rewards.filter(function (r) { return r.title; }).map(function (r) { return r.title; }).join(', ')) + '」' : '') + '</li>');
    if (out.challenge) lines.push('<li><b>도전 결과</b> ' + esc(out.challenge.n) + ' 님 ' + (out.game === 'sort' ? out.challenge.score + '수' : PLT.num(out.challenge.score)) + ' vs 나 ' + esc(String(big)) + ' → ' + (out.challenge.won ? '<span class="arc-win">이겼어요!</span>' : '다음엔 꼭') + '</li>');
    var head = out.isBest ? '<div class="arc-res__tag arc-res__tag--best">새 기록!</div>' : (out.first ? '<div class="arc-res__tag">첫 기록</div>' : (opt.tag ? '<div class="arc-res__tag">' + esc(opt.tag) + '</div>' : ''));
    var body = '<div class="arc-res">' +
      '<div class="arc-res__top"><img src="' + ARC.img(opt.friend || g.host) + '" alt="">' + head + '<div class="arc-res__big">' + big + '</div><div class="arc-res__sub">' + esc(opt.sub || (g.name + (out.prevBest ? ' · 이전 최고 ' + PLT.num(out.prevBest) : ''))) + '</div></div>' +
      '<div class="arc-res__lv"><div class="row row--between"><span>Lv.' + lv.level + '</span><span class="t-small">' + (lv.need ? '다음 레벨까지 ' + lv.toNext + 'XP' : '최고 레벨') + '</span></div><div class="meter mt-s"><i style="width:' + Math.round(lv.progress * 100) + '%"></i></div><div class="arc-pills mt-s">' + pills.join('') + '</div></div>' +
      (lines.length ? '<ul class="arc-res__lines">' + lines.join('') + '</ul>' : '') +
      (ARC.isGuest() ? '<div class="arc-nudge"><b>이 기록, 랭킹에 올릴까요?</b> 전화번호 인증 한 번이면 지금 기록 그대로 PASS에 저장돼요. <a class="link" href="' + PLT.loginLink() + '">PASS 만들기</a></div>' : '') +
      '</div>';
    var actions = [
      { label: '한 판 더', kind: 'btn--primary', onClick: function () { if (opt.onRetry) opt.onRetry(); } },
      { label: '이 판으로 도전장', kind: 'btn--pass', keep: true, onClick: function () { if (opt.onChallenge) opt.onChallenge(); return false; } },
      { label: '랭킹 보기', kind: 'btn--ghost', onClick: function () { location.href = PLT.url('arcade/rank?g=' + out.game); } }
    ];
    if (opt.onSave) actions.splice(2, 0, { label: '결과 카드 저장', kind: 'btn--ghost', keep: true, onClick: function () { opt.onSave(); return false; } });
    return PLT.modal({ body: body, actions: actions, wide: true, onClose: opt.onClose });
  };

  /* ---------- 준비 ---------- */
  ARC.ready = PLT.ready.then(function () { mergeGuest(); var p = ARC.me(); return p; });
  ARC.store = function () { return store; };
})();
