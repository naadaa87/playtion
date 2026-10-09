/* =====================================================================
   PLAYTION — 체험 모드 데이터 저장소 (db-demo.js)
   ---------------------------------------------------------------------
   site.js 의 mode 가 "demo" 일 때 쓰입니다. 모든 기록은 이 브라우저의
   localStorage 에만 남고, 서버로 보내지지 않습니다.
   실서비스(db-live.js)와 같은 함수 이름·결과 모양을 따릅니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, S = PLT.S;
  var PS = window.PLT_PASS || {}, G = window.PLT_GACHA || {}, P = window.PLT_PARTY || {};
  var KEY = 'demo-db-v1', SKEY = 'demo-session';
  var SECRET = 'playtion-demo-kiosk';
  var DAY = 864e5;

  function blank() {
    return {
      v: 1, members: {}, bookings: [], ledger: [], stamps: [], coupons: [], box: [], subs: [], reports: [],
      posts: [], msgs: [], trades: [], regs: [], leads: [], inquiries: [], checkins: [], statuses: {},
      onlineSold: {}, arrivals: [], collection: {}, reviews: [], gifts: [], orders: [], notes: []
    };
  }
  var db = PLT.ls.get(KEY) || blank();
  (function upgrade() { var b = blank(); for (var k in b) if (db[k] === undefined) db[k] = b[k]; })();
  function save() { PLT.ls.set(KEY, db); }
  function now() { return new Date().toISOString(); }
  function ok(v) { return Promise.resolve(v); }
  function no(msg) { return Promise.reject(PLT.fail(msg)); }
  function sid() { return PLT.ls.get(SKEY, null); }
  function meRaw() { var id = sid(); return id ? db.members[id] || null : null; }
  function memberByPhone(p) { p = PLT.phone.clean(p); for (var k in db.members) if (db.members[k].phone === p) return db.members[k]; return null; }
  function need() { var m = meRaw(); if (!m) throw PLT.fail('로그인이 필요해요.'); return m; }

  /* ---------- 지갑 계산 ---------- */
  function walletOf(m) {
    var L = db.ledger.filter(function (l) { return l.memberId === m.id; });
    var year = Date.now() - 365 * DAY;
    var points = 0, coins = 0, xp = 0;
    L.forEach(function (l) { points += l.points || 0; coins += l.coins || 0; if (new Date(l.at).getTime() >= year) xp += l.xp || 0; });
    var stampsTotal = db.stamps.filter(function (s) { return s.memberId === m.id; }).length;
    var goal = (PS.stamps && PS.stamps.goal) || 10;
    var isPlus = !!(m.plusUntil && new Date(m.plusUntil).getTime() > Date.now());
    var lv = PLT.pass.level(xp);
    return {
      points: points, coins: coins, xp: xp, level: lv.level, nextLevel: lv.next, progress: lv.progress, toNext: lv.toNext,
      stampsTotal: stampsTotal, stamps: stampsTotal % goal, stampGoal: goal, isPlus: isPlus, plusUntil: m.plusUntil || null,
      earnRate: PLT.pass.earnRate(xp, isPlus), noDeposit: PLT.pass.noDeposit(xp, isPlus)
    };
  }
  function view(m) {
    if (!m) return null;
    var w = walletOf(m), o = {};
    for (var k in m) o[k] = m[k];
    for (var j in w) o[j] = w[j];
    o.unreadNotes = db.notes.filter(function (n) { return n.memberId === m.id && !n.read; }).length;
    return o;
  }
  function ledger(memberId, e) {
    var x = { id: PLT.uid('l'), memberId: memberId, at: now(), type: e.type, memo: e.memo || '', points: e.points || 0, coins: e.coins || 0, xp: e.xp || 0, ref: e.ref || '' };
    db.ledger.push(x); return x;
  }
  function note(memberId, title, body, link) {
    if (!memberId) return;
    db.notes.push({ id: PLT.uid('n'), memberId: memberId, title: title, body: body || '', link: link || '', at: now(), read: false });
  }
  function issue(memberId, defId, source) {
    var def = PLT.pass.couponDef(defId); if (!def || !memberId) return null;
    var c = { id: PLT.uid('c'), memberId: memberId, defId: defId, title: def.title, line: def.line, kind: def.kind, value: def.value, createdAt: now(), expiresAt: new Date(Date.now() + (def.days || 30) * DAY).toISOString(), usedAt: null, source: source || '' };
    db.coupons.push(c);
    if (def.kind === 'coin') { /* 코인 쿠폰은 받는 즉시 지갑으로 */ c.usedAt = now(); ledger(memberId, { type: 'coupon', coins: def.value, memo: def.title }); }
    note(memberId, '쿠폰이 들어왔어요', def.title, 'pass/me#coupons');
    return c;
  }
  function addStamp(memberId, kind, store, ref) {
    if (!memberId) return { rewards: [] };
    db.stamps.push({ id: PLT.uid('s'), memberId: memberId, kind: kind, store: store || '', ref: ref || '', at: now() });
    var rewards = [];
    var total = db.stamps.filter(function (s) { return s.memberId === memberId; }).length;
    var goal = (PS.stamps && PS.stamps.goal) || 10;
    if (total % goal === 0) { var c = issue(memberId, (PS.stamps.reward || {}).couponId || 'stamp10', 'stamp'); if (c) rewards.push(c); }
    var st = PLT.station(store);
    if (kind === 'checkin' && st && st.type === 'gacha' && PS.transfer) {
      var n = db.stamps.filter(function (s) { return s.memberId === memberId && s.kind === 'checkin' && PLT.station(s.store) && PLT.station(s.store).type === 'gacha'; }).length;
      if (n % (PS.transfer.gachaVisitsForParty || 3) === 0) { var t = issue(memberId, PS.transfer.gachaToParty, 'transfer'); if (t) rewards.push(t); }
    }
    return { rewards: rewards, total: total };
  }
  function activeCoupon(m, id) {
    var c = db.coupons.filter(function (x) { return x.id === id && x.memberId === m.id; })[0];
    if (!c || c.usedAt || new Date(c.expiresAt).getTime() < Date.now()) return null;
    c.def = PLT.pass.couponDef(c.defId) || {};
    return c;
  }

  /* ---------- 체험용 예약 마감 시뮬레이션 ---------- */
  function seededBusy(stationId, date) {
    if (date < PLT.ymd()) return [];
    var h = PLT.hash(stationId + '|' + date), out = [];
    var d = PLT.dow(date), we = d === 0 || d === 5 || d === 6;
    if ((h % 100) < (we ? 55 : 22)) out.push({ start: 19, end: 35, src: 'seed' });
    if (((h >> 7) % 100) < (we ? 35 : 12)) out.push({ start: 13, end: 18, src: 'seed' });
    else if (((h >> 13) % 100) < 30) { var s = 10 + ((h >> 3) % 3); out.push({ start: s, end: s + 2, src: 'seed' }); }
    return out;
  }
  function spans(stationId, date) {
    var prev = PLT.addDays(date, -1), out = [];
    db.bookings.forEach(function (b) {
      if (b.stationId !== stationId || b.status === 'cancelled') return;
      if (b.date === date) out.push({ start: b.span[0], end: b.span[1], src: b.channel });
      if (b.date === prev && b.span[1] > 24) out.push({ start: 0, end: b.span[1] - 24, src: b.channel });
    });
    seededBusy(stationId, date).forEach(function (x) { out.push(x); });
    seededBusy(stationId, prev).forEach(function (x) { if (x.end > 24) out.push({ start: 0, end: x.end - 24, src: 'seed' }); });
    return out;
  }

  var otp = {};
  var DB = PLT.db = {
    kind: 'demo',
    init: function () { return ok(true); },

    /* ---------------- 회원 ---------------- */
    me: function () {
      var m = meRaw();
      /* 생일 달 쿠폰 — 그해 한 번 */
      if (m && m.birth && /^\d{2}-\d{2}$/.test(m.birth) && +m.birth.slice(0, 2) === new Date().getMonth() + 1) {
        var y = String(new Date().getFullYear());
        if (!db.coupons.some(function (c) { return c.memberId === m.id && c.defId === 'birthday' && c.createdAt.slice(0, 4) === y; })) { issue(m.id, 'birthday', 'birthday'); save(); }
      }
      return ok(view(m));
    },
    requestOtp: function (phone) {
      phone = PLT.phone.clean(phone);
      if (!PLT.phone.valid(phone)) return no('휴대폰 번호를 다시 확인해 주세요.');
      var code = String(Math.floor(100000 + Math.random() * 900000));
      otp[phone] = { code: code, exp: Date.now() + 180000 };
      return ok({ sent: true, hint: (S.demo && S.demo.otpHint !== false) ? code : '' });
    },
    verifyOtp: function (phone, code) {
      phone = PLT.phone.clean(phone);
      var o = otp[phone];
      if (!o || o.exp < Date.now()) return no('인증 시간이 지났어요. 인증번호를 다시 받아 주세요.');
      if (String(code).trim() !== o.code) return no('인증번호가 맞지 않아요.');
      delete otp[phone];
      var m = memberByPhone(phone);
      if (m) { PLT.ls.set(SKEY, m.id); m.lastLoginAt = now(); save(); return ok({ isNew: false, me: view(m) }); }
      PLT.ss.set('verified', phone);
      return ok({ isNew: true });
    },
    signup: function (p) {
      var phone = PLT.ss.get('verified');
      if (!phone) return no('휴대폰 인증을 먼저 해 주세요.');
      if (memberByPhone(phone)) return no('이미 가입된 번호예요.');
      var m = {
        id: PLT.uid('m'), phone: phone, name: (p.name || '').slice(0, 20), nick: (p.nick || p.name || '').slice(0, 12), birth: p.birth || '',
        code: PLT.code('PLT', 6), createdAt: now(), firstTouch: PLT.ls.get('firstTouch', 'web'), invitedBy: p.invite || '', plusUntil: null,
        consents: { terms: true, age: true, mktSms: !!p.mktSms, mktKakao: !!p.mktKakao, mktNight: !!p.mktNight, at: now(), ver: '2026-10' }
      };
      db.members[m.id] = m;
      PLT.ls.set(SKEY, m.id);
      issue(m.id, 'welcomeParty', 'welcome'); issue(m.id, 'welcomeDraw', 'welcome');
      /* 같은 번호로 했던 비회원 예약 연결 */
      db.bookings.forEach(function (b) { if (!b.memberId && b.phone === phone) b.memberId = m.id; });
      db.regs.forEach(function (r) { if (!r.memberId && r.phone === phone) r.memberId = m.id; });
      /* 받은 선물 */
      db.gifts.forEach(function (g) { if (g.toPhone === phone && !g.claimedAt) { g.claimedAt = now(); ledger(m.id, { type: 'gift', coins: g.amount, memo: '선물 받은 코인' }); note(m.id, '선물이 도착했어요', PLT.coin(g.amount) + (g.message ? ' · ' + g.message : '')); } });
      PLT.ss.set('verified', '');
      note(m.id, 'PASS에 오신 걸 환영해요', '첫 예약 할인과 온라인 뽑기 1회권을 넣어 뒀어요.', 'pass/me#coupons');
      save();
      return ok(view(m));
    },
    logout: function () { PLT.ls.del(SKEY); return ok(true); },
    updateProfile: function (patch) {
      var m = need();
      ['name', 'nick', 'birth'].forEach(function (k) { if (patch[k] !== undefined) m[k] = String(patch[k]).slice(0, 20); });
      if (patch.consents) { for (var k in patch.consents) m.consents[k] = !!patch.consents[k]; m.consents.at = now(); }
      save(); return ok(view(m));
    },
    deleteAccount: function () {
      var m = need(), id = m.id;
      delete db.members[id];
      ['ledger', 'stamps', 'coupons', 'box', 'subs', 'notes', 'checkins', 'reviews'].forEach(function (k) { db[k] = db[k].filter(function (x) { return x.memberId !== id; }); });
      delete db.collection[id];
      PLT.ls.del(SKEY); save(); return ok(true);
    },
    ledger: function () { var m = need(); return ok(db.ledger.filter(function (l) { return l.memberId === m.id; }).slice().reverse()); },
    coupons: function () {
      var m = need();
      return ok(db.coupons.filter(function (c) { return c.memberId === m.id; }).map(function (c) { var o = {}; for (var k in c) o[k] = c[k]; o.expired = !c.usedAt && new Date(c.expiresAt).getTime() < Date.now(); return o; }).reverse());
    },
    stampsList: function () { var m = need(); return ok(db.stamps.filter(function (s) { return s.memberId === m.id; }).slice().reverse()); },
    notes: function () { var m = need(); return ok(db.notes.filter(function (n) { return n.memberId === m.id; }).slice().reverse()); },
    readNotes: function () { var m = need(); db.notes.forEach(function (n) { if (n.memberId === m.id) n.read = true; }); save(); return ok(true); },

    /* ---------------- 지갑 ---------------- */
    charge: function (index) {
      var m = need(); var pkg = (PS.coins.packages || [])[index]; if (!pkg) return no('충전 상품을 골라 주세요.');
      var w = walletOf(m);
      var order = { id: PLT.uid('o'), memberId: m.id, kind: 'coin', amount: pkg.pay, coin: pkg.coin, status: 'paid', at: now() };
      db.orders.push(order);
      ledger(m.id, { type: 'charge', coins: pkg.coin, points: Math.floor(pkg.pay * w.earnRate / 100), xp: Math.floor(pkg.pay / 1000) * (PS.xp.perThousandWon || 1), memo: '코인 충전 ' + PLT.won(pkg.pay), ref: order.id });
      note(m.id, '코인을 충전했어요', PLT.coin(pkg.coin) + ' (결제 ' + PLT.won(pkg.pay) + ')');
      save(); return ok({ order: order, me: view(m) });
    },
    subscribePlus: function () {
      var m = need(); var base = Math.max(Date.now(), m.plusUntil ? new Date(m.plusUntil).getTime() : 0);
      m.plusUntil = new Date(base + 30 * DAY).toISOString(); m.plusAuto = false;
      var order = { id: PLT.uid('o'), memberId: m.id, kind: 'plus', amount: PS.plus.price, status: 'paid', at: now() };
      db.orders.push(order);
      ledger(m.id, { type: 'plus', coins: 5000, xp: Math.floor(PS.plus.price / 1000), memo: 'PASS+ 30일 코인', ref: order.id });
      note(m.id, 'PASS+ 30일을 더했어요', '플레이 코인 5,000C를 넣어 드렸어요. ' + PLT.fmtMD(PLT.ymd(new Date(m.plusUntil))) + '까지 쓸 수 있어요.');
      save(); return ok(view(m));
    },
    cancelPlus: function () { var m = need(); m.plusAuto = false; save(); return ok(view(m)); },
    gift: function (g) {
      var m = need(); var amt = parseInt(g.amount, 10) || 0; var to = PLT.phone.clean(g.phone);
      if (!PLT.phone.valid(to)) return no('받는 분 전화번호를 확인해 주세요.');
      if (to === m.phone) return no('나에게는 보낼 수 없어요.');
      if (walletOf(m).coins < amt) return no('코인이 부족해요. 먼저 충전해 주세요.');
      ledger(m.id, { type: 'gift', coins: -amt, memo: PLT.phone.mask(to) + '님께 선물' });
      var r = memberByPhone(to);
      var gift = { id: PLT.uid('g'), fromId: m.id, toPhone: to, amount: amt, message: (g.message || '').slice(0, 60), at: now(), claimedAt: r ? now() : null };
      db.gifts.push(gift);
      if (r) { ledger(r.id, { type: 'gift', coins: amt, memo: '선물 받은 코인' }); note(r.id, '선물이 도착했어요', PLT.coin(amt) + (gift.message ? ' · ' + gift.message : '')); }
      save(); return ok({ delivered: !!r });
    },

    /* ---------------- 체크인 ---------------- */
    kioskToken: function (store, key) {
      if (!PLT.station(store)) return no('매장 코드를 확인해 주세요.');
      if (key !== ((S.demo || {}).kioskKey || 'demo')) return no('키오스크 키가 맞지 않아요.');
      var w = Math.floor(Date.now() / 30000);
      return ok({ token: store + '.' + w + '.' + PLT.hash(store + '|' + w + '|' + SECRET).toString(36), ttl: 30 - Math.floor((Date.now() / 1000) % 30) });
    },
    checkin: function (token) {
      var m = need(); var p = String(token || '').split('.');
      if (p.length !== 3 || PLT.hash(p[0] + '|' + p[1] + '|' + SECRET).toString(36) !== p[2]) return no('QR을 다시 찍어 주세요.');
      var age = Math.floor(Date.now() / 30000) - parseInt(p[1], 10);
      if (age < 0 || age > 2) return no('QR 유효 시간이 지났어요. 화면의 새 QR을 찍어 주세요.');
      var store = p[0], today = PLT.ymd();
      if (db.checkins.some(function (c) { return c.memberId === m.id && c.store === store && c.day === today; })) return ok({ already: true, me: view(m) });
      db.checkins.push({ id: PLT.uid('ci'), memberId: m.id, store: store, day: today, at: now() });
      ledger(m.id, { type: 'visit', xp: PS.xp.perVisit || 10, memo: (PLT.station(store) || {}).name + ' 체크인' });
      var r = addStamp(m.id, 'checkin', store, today);
      save(); return ok({ already: false, rewards: r.rewards, me: view(m) });
    },

    /* ---------------- 파티룸 예약 ---------------- */
    busy: function (stationId, date) { return ok(spans(stationId, date)); },
    /* 여러 지점·여러 날짜를 한 번에 — { 지점: { 날짜: [구간] } } */
    busyMany: function (stationIds, dates) {
      var out = {};
      stationIds.forEach(function (id) { out[id] = {}; dates.forEach(function (d) { out[id][d] = spans(id, d); }); });
      return ok(out);
    },
    book: function (q) {
      var m = meRaw();
      var st = PLT.station(q.stationId); if (!st) return no('지점을 골라 주세요.');
      var t = PLT.party.time(q.timeId); if (!t) return no('이용 타임을 골라 주세요.');
      if (!q.date || q.date < PLT.ymd()) return no('날짜를 다시 골라 주세요.');
      var span = PLT.party.span(q.timeId, q.startHour, q.hours);
      if (PLT.party.started(q.date, q.timeId, q.startHour)) return no('이미 시작한 시간이에요. 다른 시간을 골라 주세요.');
      if (!PLT.party.free(spans(q.stationId, q.date), spans(q.stationId, PLT.addDays(q.date, 1)), span)) return no('그 시간은 방금 예약이 찼어요. 다른 시간을 골라 주세요.');
      if ((q.people || 0) > st.max) return no(st.short + '은 최대 ' + st.max + '명까지 이용할 수 있어요.');
      if (!m && !PLT.phone.valid(q.phone)) return no('예약자 휴대폰 번호를 확인해 주세요.');
      var w = m ? walletOf(m) : null;
      var cp = m && q.couponId ? activeCoupon(m, q.couponId) : null;
      var quote = PLT.party.quote(q, { isPlus: w && w.isPlus, coupon: cp, usePoints: q.usePoints, points: w ? w.points : 0, useCoins: q.useCoins, coins: w ? w.coins : 0, noDeposit: w && w.noDeposit });
      var b = {
        id: PLT.uid('b'), code: 'PT' + q.date.slice(2).replace(/-/g, '') + '-' + PLT.code('', 4), memberId: m ? m.id : null,
        name: (q.name || (m && (m.name || m.nick)) || '').slice(0, 20), phone: m ? m.phone : PLT.phone.clean(q.phone),
        stationId: st.id, date: q.date, timeId: q.timeId, startHour: q.timeId === 'hourly' ? q.startHour : t.start, hours: quote.hours, span: span,
        people: quote.people, options: quote.options, packageId: q.packageId || '', memo: (q.memo || '').slice(0, 200),
        quote: quote, couponId: cp ? cp.id : null, status: 'confirmed', channel: 'own', pay: q.payMethod || 'card', createdAt: now()
      };
      db.bookings.push(b);
      var rewards = [];
      if (m) {
        if (cp) cp.usedAt = now();
        if (quote.usePoints) ledger(m.id, { type: 'use', points: -quote.usePoints, memo: '예약 ' + b.code, ref: b.id });
        if (quote.useCoins) ledger(m.id, { type: 'use', coins: -quote.useCoins, memo: '예약 ' + b.code, ref: b.id });
        var earn = Math.floor(quote.pay * w.earnRate / 100);
        ledger(m.id, { type: 'booking', points: earn, xp: Math.floor(quote.pay / 1000) * (PS.xp.perThousandWon || 1) + (PS.xp.perBooking || 0), memo: st.short + ' 예약 적립', ref: b.id });
        if (quote.options.indexOf('coin') >= 0) ledger(m.id, { type: 'option', coins: 5000, memo: '가챠 코인 팩', ref: b.id });
        var r = addStamp(m.id, 'party', st.id, b.id); rewards = r.rewards.slice();
        /* 친구 초대 — 초대받은 회원의 첫 예약이면 두 사람 모두 적립 */
        if (m.invitedBy && db.bookings.filter(function (x) { return x.memberId === m.id && x.status !== 'cancelled'; }).length === 1) {
          var inv = null; for (var k in db.members) if (db.members[k].code === String(m.invitedBy).toUpperCase()) inv = db.members[k];
          if (inv && inv.id !== m.id) {
            ledger(m.id, { type: 'invite', points: PS.points.invite, memo: '친구 초대 첫 예약' });
            ledger(inv.id, { type: 'invite', points: PS.points.invite, memo: (m.nick || '친구') + '님 첫 예약' });
            note(inv.id, '초대한 친구가 첫 예약을 했어요', PLT.pt(PS.points.invite) + '를 넣어 드렸어요.');
          }
        }
        var tc = issue(m.id, PS.transfer && PS.transfer.partyToGacha, 'transfer'); if (tc) rewards.push(tc);
        note(m.id, '예약이 확정됐어요', st.name + ' · ' + PLT.fmtMD(b.date) + ' ' + t.name + ' · 예약번호 ' + b.code, 'pass/me#bookings');
      }
      save();
      PLT.track('complete_booking', { value: quote.total, station: st.id });
      return ok({ booking: b, rewards: rewards });
    },
    myBookings: function () {
      var m = meRaw(); if (!m) return ok([]);
      return ok(db.bookings.filter(function (b) { return b.memberId === m.id || b.phone === m.phone; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }));
    },
    findBooking: function (code, phone) {
      var b = db.bookings.filter(function (x) { return x.code === String(code).trim().toUpperCase() && x.phone === PLT.phone.clean(phone); })[0];
      return b ? ok(b) : no('예약을 찾지 못했어요. 예약번호와 전화번호를 확인해 주세요.');
    },
    cancelBooking: function (id) {
      var m = meRaw(); var b = db.bookings.filter(function (x) { return x.id === id; })[0];
      if (!b || (m && b.memberId !== m.id && b.phone !== m.phone)) return no('예약을 찾지 못했어요.');
      if (b.status === 'cancelled') return no('이미 취소한 예약이에요.');
      var days = Math.round((PLT.parseYmd(b.date) - PLT.parseYmd(PLT.ymd())) / DAY);
      var rate = days >= 7 ? 1 : days >= 5 ? 0.7 : days >= 3 ? 0.5 : 0;
      if (rate === 0) return no('이용 2일 전부터는 취소할 수 없어요. 3일 전까지 요청하면 일정 변경은 가능해요.');
      b.status = 'cancelled'; b.cancelledAt = now(); b.refundRate = rate; b.refund = Math.round(b.quote.pay * rate) + b.quote.deposit;
      if (b.memberId) {
        db.ledger = db.ledger.filter(function (l) { return !(l.ref === b.id && l.type === 'booking'); });
        if (b.quote.usePoints) ledger(b.memberId, { type: 'refund', points: Math.round(b.quote.usePoints * rate), memo: '취소 환급 ' + b.code });
        if (b.quote.useCoins) ledger(b.memberId, { type: 'refund', coins: Math.round(b.quote.useCoins * rate), memo: '취소 환급 ' + b.code });
        if (b.couponId && rate === 1) { var c = db.coupons.filter(function (x) { return x.id === b.couponId; })[0]; if (c) c.usedAt = null; }
        note(b.memberId, '예약을 취소했어요', b.code + ' · 환불 ' + PLT.won(b.refund));
      }
      save(); return ok(b);
    },
    review: function (r) {
      var m = need(); var b = db.bookings.filter(function (x) { return x.id === r.bookingId && x.memberId === m.id; })[0];
      if (!b) return no('예약을 찾지 못했어요.');
      if (db.reviews.some(function (x) { return x.bookingId === b.id; })) return no('이미 후기를 남긴 예약이에요.');
      if ((r.text || '').trim().length < 10) return no('후기는 10자 이상 적어 주세요.');
      var rv = { id: PLT.uid('r'), memberId: m.id, nick: m.nick || '회원', bookingId: b.id, stationId: b.stationId, rating: Math.max(1, Math.min(5, r.rating | 0 || 5)), text: r.text.trim().slice(0, 500), photo: !!r.photo, status: 'approved', at: now() };
      db.reviews.push(rv);
      ledger(m.id, { type: 'review', points: PS.points.review + (rv.photo ? PS.points.photoReview : 0), memo: '후기 적립' });
      save(); return ok(rv);
    },
    reviews: function (stationId) {
      return ok(db.reviews.filter(function (r) { return r.status === 'approved' && (!stationId || r.stationId === stationId); }).slice().reverse());
    },

    /* ---------------- 가챠 ---------------- */
    seriesOverlay: function () {
      var o = {};
      for (var k in db.statuses) o[k] = { status: db.statuses[k].status, checkedAt: db.statuses[k].checkedAt };
      for (var j in db.onlineSold) { o[j] = o[j] || {}; o[j].onlineSold = db.onlineSold[j]; }
      return ok(o);
    },
    subscribe: function (seriesId) {
      var m = need(); var i = db.subs.findIndex(function (s) { return s.memberId === m.id && s.seriesId === seriesId; });
      var on;
      if (i >= 0) { db.subs.splice(i, 1); on = false; } else { db.subs.push({ id: PLT.uid('sb'), memberId: m.id, seriesId: seriesId, at: now() }); on = true; }
      save(); return ok({ on: on });
    },
    mySubs: function () { var m = meRaw(); return ok(m ? db.subs.filter(function (s) { return s.memberId === m.id; }) : []); },
    report: function (r) {
      var m = meRaw();
      var x = { id: PLT.uid('q'), type: 'machine', machine: r.machine || '', kind: r.kind || '', text: (r.text || '').slice(0, 1000), contact: PLT.phone.clean(r.contact || (m && m.phone) || ''), memberId: m ? m.id : null, status: 'open', at: now() };
      db.inquiries.push(x); save(); return ok(x);
    },
    draw: function (seriesId, count, opt) {
      opt = opt || {};
      var m = need(); var s = PLT.gacha.get(seriesId);
      if (!s || !s.online) return no('온라인으로 뽑을 수 없는 시리즈예요.');
      count = Math.max(1, Math.min((G.online && G.online.maxPerDraw) || 10, count | 0));
      var left = (s.onlineStock || 0) - (db.onlineSold[s.id] || 0);
      if (left < count) return no(left ? '남은 수량은 ' + left + '개예요.' : '온라인 수량이 모두 나갔어요.');
      var cost = s.price * count, cp = null;
      if (opt.couponId) {
        cp = activeCoupon(m, opt.couponId);
        if (!cp || cp.def.kind !== 'draw') return no('쓸 수 없는 쿠폰이에요.');
        cost = Math.max(0, cost - s.price);
      }
      var w = walletOf(m);
      if (w.coins < cost) return no('코인이 ' + PLT.coin(cost - w.coins) + ' 부족해요.');
      if (cp) cp.usedAt = now();
      if (cost) ledger(m.id, { type: 'draw', coins: -cost, xp: Math.floor(cost / 1000) * (PS.xp.perThousandWon || 1), memo: s.name + ' ' + count + '회', ref: s.id });
      var items = [];
      for (var i = 0; i < count; i++) {
        var idx = Math.floor(Math.random() * s.lineup.length);
        var it = { id: PLT.uid('bx'), memberId: m.id, seriesId: s.id, idx: idx, item: s.lineup[idx], at: now(), status: 'stored', code: '' };
        db.box.push(it); items.push(it);
        var col = db.collection[m.id] = db.collection[m.id] || {}; var arr = col[s.id] = col[s.id] || [];
        if (arr.indexOf(idx) < 0) arr.push(idx);
      }
      db.onlineSold[s.id] = (db.onlineSold[s.id] || 0) + count;
      PLT.gacha.overlay[s.id] = PLT.gacha.overlay[s.id] || {}; PLT.gacha.overlay[s.id].onlineSold = db.onlineSold[s.id];
      save();
      return ok({ items: items, cost: cost, me: view(m) });
    },
    box: function () { var m = need(); return ok(db.box.filter(function (b) { return b.memberId === m.id; }).slice().reverse()); },
    boxAction: function (ids, action, opt) {
      var m = need(); opt = opt || {};
      var list = db.box.filter(function (b) { return b.memberId === m.id && ids.indexOf(b.id) >= 0 && b.status === 'stored'; });
      if (!list.length) return no('보관함에 있는 상품을 골라 주세요.');
      if (action === 'pickup') {
        var code = PLT.code('PK', 5);
        list.forEach(function (b) { b.status = 'pickup'; b.code = code; b.updatedAt = now(); });
        note(m.id, '매장 수령 준비 중', list.length + '개 · 수령 코드 ' + code);
      } else if (action === 'ship') {
        if (!opt.address || opt.address.length < 6) return no('받을 주소를 적어 주세요.');
        var w = walletOf(m), fee = (G.online.shippingFee || 0);
        if (list.length >= (G.online.freeShipOver || 999)) fee = 0;
        if (w.isPlus && !db.box.some(function (b) { return b.memberId === m.id && b.status === 'ship' && b.freeShip && new Date(b.updatedAt).getMonth() === new Date().getMonth(); })) { fee = 0; list[0].freeShip = true; }
        if (w.coins < fee) return no('배송비 ' + PLT.coin(fee) + '가 부족해요. 코인을 충전해 주세요.');
        if (fee) ledger(m.id, { type: 'ship', coins: -fee, memo: '보관함 배송비' });
        list.forEach(function (b) { b.status = 'ship'; b.address = opt.address.slice(0, 120); b.updatedAt = now(); });
        note(m.id, '배송 신청을 받았어요', list.length + '개 · 배송비 ' + PLT.coin(fee));
      } else if (action === 'market') {
        var s = PLT.gacha.get(list[0].seriesId);
        list.forEach(function (b) { b.status = 'listed'; b.updatedAt = now(); });
        db.posts.push({ id: PLT.uid('p'), memberId: m.id, nick: m.nick || '회원', type: opt.type || 'swap', title: (s ? s.name : '수집품') + ' ' + list.map(function (b) { return b.item; }).join(', '), seriesId: list[0].seriesId, have: list.map(function (b) { return b.item; }).join(', '), want: opt.want || '', price: opt.price | 0, method: opt.method || 'locker', condition: '미개봉', body: '', status: 'open', createdAt: now(), fromBox: ids });
      } else return no('알 수 없는 요청이에요.');
      save(); return ok(true);
    },
    collection: function () { var m = need(); return ok(db.collection[m.id] || {}); },
    toggleItem: function (seriesId, idx) {
      var m = need(); var col = db.collection[m.id] = db.collection[m.id] || {}; var arr = col[seriesId] = col[seriesId] || [];
      var i = arr.indexOf(idx); if (i >= 0) arr.splice(i, 1); else arr.push(idx);
      var s = PLT.gacha.get(seriesId);
      if (s && arr.length === s.lineup.length && i < 0) note(m.id, '시리즈를 완성했어요', s.name + ' 컬렉션 완성! 매장 컴플리트 인증을 하면 한정 캡슐을 드려요.');
      save(); return ok(arr.slice());
    },
    arrivalsExtra: function () { return ok(db.arrivals.slice()); },

    /* ---------------- 마켓 ---------------- */
    posts: function (f) {
      f = f || {};
      var list = db.posts.filter(function (p) { return p.status !== 'hidden'; });
      if (PLT.features.showSamples !== false) list = list.concat((G.marketSamples || []).map(function (x) { return x; }));
      if (f.type) list = list.filter(function (p) { return p.type === f.type; });
      if (f.seriesId) list = list.filter(function (p) { return p.seriesId === f.seriesId; });
      if (f.q) { var q = f.q.toLowerCase(); list = list.filter(function (p) { return (p.title + ' ' + p.have + ' ' + p.want).toLowerCase().indexOf(q) >= 0; }); }
      if (f.mine) { var m = meRaw(); list = list.filter(function (p) { return m && p.memberId === m.id; }); }
      return ok(list.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }));
    },
    post: function (id) {
      var p = db.posts.filter(function (x) { return x.id === id; })[0] || (G.marketSamples || []).filter(function (x) { return x.id === id; })[0];
      return p ? ok(p) : no('글을 찾지 못했어요.');
    },
    createPost: function (d) {
      var m = need();
      if (!d.title || d.title.trim().length < 4) return no('제목을 4자 이상 적어 주세요.');
      if (d.type === 'sell' && !(d.price > 0)) return no('판매 가격을 적어 주세요.');
      if (/(01[0-9][-\s]?\d{3,4}[-\s]?\d{4})|(오픈채팅|카톡\s?아이디|계좌)/.test((d.title || '') + (d.body || ''))) return no('연락처나 계좌는 글에 적지 말고 쪽지로 주고받아 주세요.');
      var p = { id: PLT.uid('p'), memberId: m.id, nick: m.nick || '회원', type: d.type, title: d.title.trim().slice(0, 60), seriesId: d.seriesId || '', have: (d.have || '').slice(0, 120), want: (d.want || '').slice(0, 120), price: d.type === 'swap' ? 0 : (d.price | 0), method: d.method || 'meet', condition: d.condition || '', body: (d.body || '').slice(0, 1000), status: 'open', createdAt: now() };
      db.posts.push(p); save(); return ok(p);
    },
    updatePost: function (id, patch) {
      var m = need(); var p = db.posts.filter(function (x) { return x.id === id && x.memberId === m.id; })[0];
      if (!p) return no('내가 쓴 글만 바꿀 수 있어요.');
      ['status', 'price', 'title', 'body'].forEach(function (k) { if (patch[k] !== undefined) p[k] = patch[k]; });
      save(); return ok(p);
    },
    messages: function (postId) {
      var m = need();
      return ok(db.msgs.filter(function (x) { return x.postId === postId && (x.fromId === m.id || x.toId === m.id); }));
    },
    sendMessage: function (postId, text) {
      var m = need(); text = String(text || '').trim();
      if (!text) return no('내용을 적어 주세요.');
      var p = db.posts.filter(function (x) { return x.id === postId; })[0] || (G.marketSamples || []).filter(function (x) { return x.id === postId; })[0];
      if (!p) return no('글을 찾지 못했어요.');
      var to = p.memberId && p.memberId !== m.id ? p.memberId : null;
      var msg = { id: PLT.uid('mg'), postId: postId, fromId: m.id, toId: to, nick: m.nick || '회원', text: text.slice(0, 500), at: now() };
      db.msgs.push(msg);
      if (to) note(to, '쪽지가 왔어요', p.title, 'gacha/market?id=' + p.id);
      save(); return ok(msg);
    },
    requestTrade: function (postId, method) {
      var m = need(); var p = db.posts.filter(function (x) { return x.id === postId; })[0] || (G.marketSamples || []).filter(function (x) { return x.id === postId; })[0];
      if (!p || p.type !== 'sell') return no('판매 글에서만 안전거래를 할 수 있어요.');
      if (p.memberId === m.id) return no('내 글은 구매할 수 없어요.');
      if (db.trades.some(function (t) { return t.postId === postId && t.status !== 'cancelled'; })) return no('이미 거래가 진행 중인 글이에요.');
      var w = walletOf(m); if (w.coins < p.price) return no('코인이 ' + PLT.coin(p.price - w.coins) + ' 부족해요. 충전 후 다시 시도해 주세요.');
      var mk = G.market || {}; var fee = Math.max(mk.feeMin || 0, Math.round(p.price * (mk.feeRate || 0)));
      var t = { id: PLT.uid('t'), postId: postId, title: p.title, buyerId: m.id, sellerId: p.memberId || null, price: p.price, fee: fee, method: method || p.method, status: 'paid', code: PLT.code('LK', 5), at: now(), sample: !!p.sample };
      ledger(m.id, { type: 'trade', coins: -p.price, memo: '안전거래 결제 · ' + p.title, ref: t.id });
      db.trades.push(t);
      if (!p.sample) p.status = 'reserved';
      note(m.id, '안전거래 결제를 마쳤어요', '판매자가 ' + (t.method === 'locker' ? '매장 보관함에 넣으면' : '보내면') + ' 알려 드릴게요.');
      if (t.sellerId) note(t.sellerId, '판매 글에 결제가 들어왔어요', p.title + ' · 3일 안에 ' + (t.method === 'locker' ? '가챠샵 보관함에 넣어 주세요.' : '택배로 보내 주세요.'));
      save(); return ok(t);
    },
    myTrades: function () { var m = need(); return ok(db.trades.filter(function (t) { return t.buyerId === m.id || t.sellerId === m.id; }).slice().reverse()); },
    tradeAction: function (id, action) {
      var m = meRaw(); var t = db.trades.filter(function (x) { return x.id === id; })[0];
      if (!t) return no('거래를 찾지 못했어요.');
      var isAdmin = PLT.ss.get('admin') === '1';
      if (action === 'dropped' && (isAdmin || (m && t.sellerId === m.id)) && t.status === 'paid') { t.status = 'dropped'; note(t.buyerId, t.method === 'locker' ? '보관함에 도착했어요' : '상품이 출발했어요', t.title + (t.method === 'locker' ? ' · 수령 코드 ' + t.code : '')); }
      else if (action === 'received' && m && t.buyerId === m.id && t.status === 'dropped') {
        t.status = 'done'; t.doneAt = now();
        if (t.sellerId) { ledger(t.sellerId, { type: 'trade', coins: t.price - t.fee, memo: '판매 정산 · ' + t.title, ref: t.id }); note(t.sellerId, '판매 대금이 정산됐어요', PLT.coin(t.price - t.fee) + ' (수수료 ' + PLT.coin(t.fee) + ')'); }
        var p = db.posts.filter(function (x) { return x.id === t.postId; })[0]; if (p) p.status = 'done';
      }
      else if (action === 'cancel' && (isAdmin || (m && (t.buyerId === m.id || t.sellerId === m.id))) && t.status === 'paid') {
        t.status = 'cancelled'; ledger(t.buyerId, { type: 'refund', coins: t.price, memo: '안전거래 취소 환불', ref: t.id });
        var pp = db.posts.filter(function (x) { return x.id === t.postId; })[0]; if (pp) pp.status = 'open';
        note(t.buyerId, '안전거래가 취소됐어요', PLT.coin(t.price) + '를 돌려드렸어요.');
      }
      else return no('지금 단계에서는 할 수 없는 요청이에요.');
      save(); return ok(t);
    },

    /* ---------------- 행사 ---------------- */
    register: function (eventId, d) {
      var m = meRaw();
      var phone = m ? m.phone : PLT.phone.clean(d.phone);
      if (!m && !PLT.phone.valid(phone)) return no('휴대폰 번호를 확인해 주세요.');
      if (db.regs.some(function (r) { return r.eventId === eventId && r.phone === phone && r.status !== 'cancelled'; })) return no('이미 신청한 행사예요.');
      var r = { id: PLT.uid('e'), eventId: eventId, memberId: m ? m.id : null, name: (d.name || (m && m.name) || '').slice(0, 20), phone: phone, people: Math.max(1, d.people | 0 || 1), memo: (d.memo || '').slice(0, 300), status: 'applied', at: now() };
      db.regs.push(r);
      if (m) note(m.id, '행사 신청을 받았어요', ((window.PLT_NEWS || {}).events || []).filter(function (e) { return e.id === eventId; }).map(function (e) { return e.title; })[0] || '');
      save(); return ok(r);
    },
    myRegs: function () { var m = meRaw(); return ok(m ? db.regs.filter(function (r) { return r.memberId === m.id; }) : []); },

    /* ---------------- 창업·문의 ---------------- */
    lead: function (d) {
      if (!d.name || !PLT.phone.valid(d.phone)) return no('이름과 연락처를 확인해 주세요.');
      var l = { id: PLT.uid('ld'), kind: d.kind || 'general', name: d.name.slice(0, 30), phone: PLT.phone.clean(d.phone), email: (d.email || '').slice(0, 80), company: (d.company || '').slice(0, 40), region: (d.region || '').slice(0, 40), area: d.area || '', budget: d.budget || '', hasSpace: d.hasSpace || '', message: (d.message || '').slice(0, 1500), status: 'new', at: now() };
      db.leads.push(l); save(); return ok(l);
    },
    inquiry: function (d) {
      var m = meRaw();
      if (!d.text || d.text.trim().length < 5) return no('문의 내용을 조금 더 적어 주세요.');
      var x = { id: PLT.uid('q'), type: d.type || 'general', kind: d.kind || '', machine: d.machine || '', text: d.text.slice(0, 1500), contact: PLT.phone.clean(d.contact || (m && m.phone) || ''), memberId: m ? m.id : null, status: 'open', at: now() };
      db.inquiries.push(x); save(); return ok(x);
    },
    portalLogin: function (code) {
      if (String(code).trim().toUpperCase() !== String((S.demo || {}).partnerCode || 'PT-DEMO').toUpperCase()) return no('파트너 코드가 맞지 않아요.');
      PLT.ss.set('partner', '1'); return ok(true);
    },
    portalData: function () {
      if (PLT.ss.get('partner') !== '1') return no('파트너 로그인이 필요해요.');
      /* 체험용 예시 매장 숫자 — 실서비스에서는 매장 장부에서 계산합니다 */
      var days = [], base = PLT.hash('portal');
      for (var i = 13; i >= 0; i--) { var d = PLT.addDays(PLT.ymd(), -i); var h = PLT.hash('pd' + d); days.push({ date: d, sales: 0, plays: 40 + (h % 60), checkins: 3 + (h % 12) }); }
      return ok({ store: '예시 파트너 매장', machines: 120, days: days, low: (G.series || []).filter(function (s) { return s.status === 'low' || s.status === 'soldout'; }).map(function (s) { return s.name; }), sample: true });
    },

    /* ---------------- 운영 콘솔 ---------------- */
    adminLogin: function (pin) { if (String(pin) !== String((S.demo || {}).adminPin || '0000')) return no('비밀번호가 맞지 않아요.'); PLT.ss.set('admin', '1'); return ok(true); },
    adminCheck: function () { return ok(PLT.ss.get('admin') === '1'); },
    adminLogout: function () { PLT.ss.set('admin', ''); return ok(true); },
    adminStats: function () {
      var today = PLT.ymd(), days = [];
      for (var i = 13; i >= 0; i--) {
        var d = PLT.addDays(today, -i);
        days.push({ date: d, bookings: db.bookings.filter(function (b) { return PLT.ymd(new Date(b.createdAt)) === d && b.status !== 'cancelled'; }).length, checkins: db.checkins.filter(function (c) { return c.day === d; }).length, members: Object.keys(db.members).filter(function (k) { return PLT.ymd(new Date(db.members[k].createdAt)) === d; }).length });
      }
      var coins = 0; db.ledger.forEach(function (l) { coins += l.coins || 0; });
      var both = 0, members = Object.keys(db.members);
      members.forEach(function (id) {
        var party = db.bookings.some(function (b) { return b.memberId === id && b.status !== 'cancelled'; });
        var gacha = db.checkins.some(function (c) { return c.memberId === id; }) || db.box.some(function (b) { return b.memberId === id; });
        if (party && gacha) both++;
      });
      return ok({
        members: members.length, bookings: db.bookings.filter(function (b) { return b.status !== 'cancelled'; }).length,
        upcoming: db.bookings.filter(function (b) { return b.status !== 'cancelled' && b.date >= today; }).length,
        revenue: db.bookings.filter(function (b) { return b.status !== 'cancelled'; }).reduce(function (s, b) { return s + (b.quote ? b.quote.pay : 0); }, 0),
        checkinsToday: db.checkins.filter(function (c) { return c.day === today; }).length,
        draws: db.box.length, coinsOutstanding: coins, transferRate: members.length ? Math.round(both / members.length * 100) : 0,
        leadsNew: db.leads.filter(function (l) { return l.status === 'new'; }).length,
        inquiriesOpen: db.inquiries.filter(function (q) { return q.status === 'open'; }).length,
        tradesOpen: db.trades.filter(function (t) { return t.status === 'paid' || t.status === 'dropped'; }).length,
        days: days
      });
    },
    adminList: function (kind) {
      if (kind === 'members') return ok(Object.keys(db.members).map(function (k) { return view(db.members[k]); }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }));
      if (kind === 'subs') { var c = {}; db.subs.forEach(function (s) { c[s.seriesId] = (c[s.seriesId] || 0) + 1; }); return ok(c); }
      var map = { bookings: 'bookings', leads: 'leads', inquiries: 'inquiries', posts: 'posts', trades: 'trades', regs: 'regs', checkins: 'checkins', reviews: 'reviews', box: 'box', arrivals: 'arrivals' };
      if (!map[kind]) return ok([]);
      return ok(db[map[kind]].slice().reverse());
    },
    adminUpdate: function (kind, id, patch) {
      var list = db[kind]; if (!list) return no('알 수 없는 항목이에요.');
      var x = list.filter(function (i) { return i.id === id; })[0]; if (!x) return no('항목을 찾지 못했어요.');
      for (var k in patch) x[k] = patch[k];
      if (kind === 'box' && patch.status === 'done' && x.memberId) note(x.memberId, '보관함 상품을 전달했어요', x.item);
      save(); return ok(x);
    },
    adminAddBooking: function (q) {
      var st = PLT.station(q.stationId), t = PLT.party.time(q.timeId); if (!st || !t || !q.date) return no('지점·날짜·타임을 확인해 주세요.');
      var span = PLT.party.span(q.timeId, q.startHour, q.hours);
      var real = function (d) { return spans(q.stationId, d).filter(function (b) { return b.src !== 'seed'; }); };
      if (!PLT.party.free(real(q.date), real(PLT.addDays(q.date, 1)), span)) return no('이미 예약이 있는 시간이에요.');
      var quote = PLT.party.quote({ stationId: q.stationId, date: q.date, timeId: q.timeId, startHour: q.startHour, hours: q.hours, people: q.people || 4 }, {});
      var b = { id: PLT.uid('b'), code: (q.channel === 'block' ? 'BL' : 'EX') + q.date.slice(2).replace(/-/g, '') + '-' + PLT.code('', 4), memberId: null, name: q.name || '', phone: PLT.phone.clean(q.phone || ''), stationId: q.stationId, date: q.date, timeId: q.timeId, startHour: q.timeId === 'hourly' ? q.startHour : t.start, hours: quote.hours, span: span, people: q.people || 4, options: [], quote: quote, status: 'confirmed', channel: q.channel || 'naver', memo: q.memo || '', createdAt: now() };
      var mm = b.phone ? memberByPhone(b.phone) : null; if (mm) b.memberId = mm.id;
      db.bookings.push(b); save(); return ok(b);
    },
    adminSetStatus: function (seriesId, status) {
      db.statuses[seriesId] = { status: status, checkedAt: now() };
      PLT.gacha.overlay[seriesId] = PLT.gacha.overlay[seriesId] || {}; PLT.gacha.overlay[seriesId].status = status; PLT.gacha.overlay[seriesId].checkedAt = db.statuses[seriesId].checkedAt;
      save(); return ok(db.statuses[seriesId]);
    },
    adminAddArrival: function (a) {
      if (!a.date || !a.series || !a.series.length) return no('날짜와 시리즈를 골라 주세요.');
      var x = { id: PLT.uid('ar'), date: a.date, series: a.series, note: (a.note || '').slice(0, 80), at: now() };
      db.arrivals.push(x);
      var sent = 0;
      db.subs.forEach(function (s) { if (a.series.indexOf(s.seriesId) >= 0) { var se = PLT.gacha.get(s.seriesId); note(s.memberId, '기다리던 시리즈가 들어와요', (se ? se.name : '') + ' · ' + PLT.fmtMD(a.date) + ' 입고', 'gacha/item?id=' + s.seriesId); sent++; } });
      save(); return ok({ arrival: x, notified: sent });
    },
    adminIssueCoupon: function (phone, defId) {
      var m = memberByPhone(phone); if (!m) return no('그 번호로 가입한 회원이 없어요.');
      var c = issue(m.id, defId, 'admin'); save(); return c ? ok(c) : no('쿠폰 종류를 확인해 주세요.');
    },
    adminStamp: function (phone, store) {
      var m = memberByPhone(phone); if (!m) return no('그 번호로 가입한 회원이 없어요.');
      var r = addStamp(m.id, 'manual', store || 'kd-gacha', 'admin'); save(); return ok(r);
    },
    adminReset: function () { db = blank(); save(); PLT.ls.del(SKEY); return ok(true); }
  };
})();
