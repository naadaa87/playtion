/* =====================================================================
   PLAYTION — 실서비스 데이터 연결 (db-live.js)
   ---------------------------------------------------------------------
   site.js 의 mode 가 "live" 이고 supabase 값이 채워져 있을 때 쓰입니다.
   체험 모드(db-demo.js)와 같은 함수 이름·결과 모양을 따르고,
   실제 계산과 확인은 Supabase의 plt_ 함수(supabase/schema.sql)가 합니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, S = PLT.S, G = window.PLT_GACHA || {};
  var sb = window.supabase.createClient(S.supabase.url, S.supabase.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'plt-auth' }
  });
  PLT.sb = sb;

  var FRIENDLY = [
    [/rate limit|too many|security purposes/i, '요청이 많아요. 잠시 뒤에 다시 시도해 주세요.'],
    [/token has expired|otp.*expired|expired/i, '인증 시간이 지났어요. 인증번호를 다시 받아 주세요.'],
    [/invalid.*(otp|token)|token.*invalid/i, '인증번호가 맞지 않아요.'],
    [/invalid login credentials/i, '이메일이나 비밀번호가 맞지 않아요.'],
    [/sms|phone provider|send.*otp/i, '문자를 보내지 못했어요. 잠시 뒤에 다시 시도하거나 고객센터로 연락 주세요.'],
    [/permission denied|not allowed|JWT/i, '권한이 없어요. 다시 로그인해 주세요.'],
    [/Failed to fetch|NetworkError|network/i, '연결이 불안정해요. 잠시 뒤에 다시 시도해 주세요.']
  ];
  function friendly(msg) {
    msg = String(msg || '');
    if (/[가-힣]/.test(msg)) return msg;   // 서버가 보낸 한국어 안내는 그대로
    for (var i = 0; i < FRIENDLY.length; i++) if (FRIENDLY[i][0].test(msg)) return FRIENDLY[i][1];
    return '처리하지 못했어요. 잠시 뒤에 다시 시도해 주세요.';
  }
  function rpc(fn, args) {
    return sb.rpc(fn, args || {}).then(function (r) {
      if (r.error) { console.warn(fn, r.error); throw PLT.fail(friendly(r.error.message)); }
      return r.data;
    });
  }
  function authed() { return sb.auth.getSession().then(function (r) { return !!(r.data && r.data.session); }); }
  function list(kind, empty) { return authed().then(function (ok) { return ok ? rpc('plt_list', { p_kind: kind }) : (empty !== undefined ? empty : []); }); }
  function no(msg) { return Promise.reject(PLT.fail(msg)); }
  var isSample = function (id) { return /^m-ex/.test(String(id || '')); };
  var samples = function () { return PLT.features.showSamples !== false ? (G.marketSamples || []) : []; };
  var lastLookupPhone = '';

  /* 토스페이먼츠 결제창 (실서비스 결제) */
  function tossPay(order, back, phone) {
    if (!(S.toss && S.toss.clientKey)) return no('온라인 결제를 준비하고 있어요. 고객센터로 연락 주세요.');
    return PLT.loadScript('https://js.tosspayments.com/v2/standard').then(function () {
      var tp = window.TossPayments(S.toss.clientKey);
      var payment = tp.payment({ customerKey: order.customerKey || window.TossPayments.ANONYMOUS });
      var url = function (flag) { return location.origin + back + (back.indexOf('?') >= 0 ? '&' : '?') + flag; };
      return payment.requestPayment({
        method: 'CARD', amount: { currency: 'KRW', value: order.amount }, orderId: order.orderNo, orderName: order.orderName,
        successUrl: url('pay=ok'), failUrl: url('fail=1'), customerMobilePhone: phone ? PLT.phone.clean(phone) : undefined
      });
    }).then(function () { return { redirect: true }; }, function (e) {
      if (e && (e.code === 'USER_CANCEL' || /취소/.test(e.message || ''))) throw PLT.fail('결제를 취소했어요.');
      throw PLT.fail((e && e.message) || '결제창을 열지 못했어요.');
    });
  }
  function refreshOverlay() { return rpc('plt_series_overlay').then(function (o) { PLT.gacha.overlay = o || {}; }, function () { }); }

  PLT.db = {
    kind: 'live',
    init: function () { return sb.auth.getSession(); },

    /* ---------------- 회원 ---------------- */
    me: function () { return authed().then(function (ok) { return ok ? rpc('plt_me') : null; }); },
    requestOtp: function (phone) {
      if (!PLT.phone.valid(phone)) return no('휴대폰 번호를 다시 확인해 주세요.');
      return sb.auth.signInWithOtp({ phone: PLT.phone.e164(phone) }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return { sent: true, hint: '' };
      });
    },
    verifyOtp: function (phone, code) {
      return sb.auth.verifyOtp({ phone: PLT.phone.e164(phone), token: String(code).trim(), type: 'sms' }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return rpc('plt_me').then(function (me) { return me ? { isNew: false, me: me } : { isNew: true }; });
      });
    },
    signup: function (p) { p = Object.assign({}, p, { firstTouch: PLT.ls.get('firstTouch', 'web') }); return rpc('plt_signup', { p: p }); },
    logout: function () { return sb.auth.signOut().then(function () { return true; }); },
    updateProfile: function (patch) { return rpc('plt_update_profile', { p: patch }); },
    deleteAccount: function () { return rpc('plt_delete_account').then(function () { return sb.auth.signOut(); }).then(function () { return true; }); },
    ledger: function () { return list('ledger'); },
    coupons: function () { return list('coupons'); },
    stampsList: function () { return list('stamps'); },
    notes: function () { return list('notes'); },
    readNotes: function () { return rpc('plt_read_notes'); },

    /* ---------------- 지갑 (결제창을 거칩니다) ---------------- */
    charge: function (index) {
      return rpc('plt_order_create', { p_kind: 'coin', p_ref: { index: index } }).then(function (o) { return tossPay(o, '/pass/wallet', PLT.me && PLT.me.phone); });
    },
    subscribePlus: function () {
      return rpc('plt_order_create', { p_kind: 'plus', p_ref: {} }).then(function (o) { return tossPay(o, '/pass/wallet', PLT.me && PLT.me.phone); });
    },
    cancelPlus: function () { return rpc('plt_cancel_plus'); },
    gift: function (g) { return rpc('plt_gift', { p: { phone: g.phone, amount: g.amount, message: g.message || '' } }); },
    confirmPayment: function (p) {
      return sb.auth.getSession().then(function (r) {
        var token = r.data && r.data.session ? r.data.session.access_token : '';
        return fetch('/api/pay/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : '' }, body: JSON.stringify(p) });
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (!res.ok || j.error) throw PLT.fail(j.error || '결제를 확인하지 못했어요. 고객센터로 연락 주세요.');
          return j;
        });
      });
    },

    /* ---------------- 체크인 ---------------- */
    kioskToken: function (store, key) { return rpc('plt_kiosk_token', { p_store: store, p_key: key }); },
    checkin: function (token) { return rpc('plt_checkin', { token: token }); },

    /* ---------------- 파티룸 ---------------- */
    busy: function (stationId, date) { return PLT.db.busyMany([stationId], [date]).then(function (m) { return (m[stationId] || {})[date] || []; }); },
    busyMany: function (ids, dates) { return rpc('plt_busy', { station_ids: ids, dates: dates }); },
    book: function (q) {
      var payload = {
        stationId: q.stationId, date: q.date, timeId: q.timeId, startHour: q.startHour, hours: q.hours, people: q.people, options: q.options,
        packageId: q.packageId || '', memo: q.memo || '', couponId: q.couponId || '', usePoints: !!q.usePoints, useCoins: !!q.useCoins,
        name: q.name || '', phone: q.phone || '', payMethod: q.payMethod || ''
      };
      return rpc('plt_book', { q: payload }).then(function (r) {
        PLT.track('begin_checkout', { value: r.order ? r.order.amount : 0, station: q.stationId });
        if (r.order && S.toss && S.toss.clientKey) {
          var order = Object.assign({ customerKey: PLT.me ? PLT.me.id : '' }, r.order);
          var back = '/party/booking?station=' + encodeURIComponent(q.stationId) + '&date=' + q.date + '&time=' + encodeURIComponent(q.timeId) + '&people=' + q.people +
            (q.timeId === 'hourly' ? '&start=' + q.startHour + '&hours=' + q.hours : '') + (q.packageId ? '&package=' + encodeURIComponent(q.packageId) : '');
          return tossPay(order, back, PLT.me ? PLT.me.phone : q.phone);
        }
        if (r.booking.status === 'confirmed') PLT.track('complete_booking', { value: r.booking.quote.total, station: q.stationId });
        return { booking: r.booking, rewards: r.rewards || [] };
      });
    },
    myBookings: function () { return list('bookings'); },
    findBooking: function (code, phone) { lastLookupPhone = phone; return rpc('plt_find_booking', { p_code: code, p_phone: phone }); },
    cancelBooking: function (id) { return rpc('plt_cancel_booking', { p_id: id, p_phone: lastLookupPhone || null }); },
    review: function (r) { return rpc('plt_review', { r: r }); },
    reviews: function (stationId) { return rpc('plt_reviews', { p_station: stationId || '' }); },

    /* ---------------- 가챠 ---------------- */
    seriesOverlay: function () { return rpc('plt_series_overlay'); },
    subscribe: function (seriesId) { return rpc('plt_subscribe', { p_series_id: seriesId }); },
    mySubs: function () { return list('subs'); },
    report: function (r) { return rpc('plt_inquiry', { d: { type: 'machine', machine: r.machine || '', kind: r.kind || '', text: r.text || '', contact: r.contact || '' } }); },
    draw: function (seriesId, count, opt) {
      return rpc('plt_draw', { p_series_id: seriesId, p_cnt: count, p_coupon_id: (opt && opt.couponId) || '' }).then(function (r) { return refreshOverlay().then(function () { return r; }); });
    },
    box: function () { return list('box'); },
    boxAction: function (ids, action, opt) { return rpc('plt_box_action', { ids: ids, action: action, opt: opt || {} }); },
    collection: function () { return list('collection', {}); },
    toggleItem: function (seriesId, idx) { return rpc('plt_toggle_item', { p_series_id: seriesId, p_idx: idx }); },
    arrivalsExtra: function () { return rpc('plt_arrivals'); },

    /* ---------------- 마켓 ---------------- */
    posts: function (f) {
      f = f || {};
      return rpc('plt_posts', { f: { type: f.type || '', seriesId: f.seriesId || '', q: f.q || '', mine: !!f.mine } }).then(function (list) {
        if (f.mine) return list;
        var extra = samples().filter(function (p) { return (!f.type || p.type === f.type) && (!f.seriesId || p.seriesId === f.seriesId) && (!f.q || (p.title + p.have + p.want).indexOf(f.q) >= 0); });
        return list.concat(extra);
      });
    },
    post: function (id) {
      if (isSample(id)) { var p = samples().filter(function (x) { return x.id === id; })[0]; return p ? Promise.resolve(p) : no('글을 찾지 못했어요.'); }
      return rpc('plt_post', { p_id: id });
    },
    createPost: function (d) { return rpc('plt_create_post', { d: d }); },
    updatePost: function (id, patch) { return rpc('plt_update_post', { p_id: id, patch: patch }); },
    messages: function (postId) { return isSample(postId) ? Promise.resolve([]) : rpc('plt_messages', { p_post_id: postId }); },
    sendMessage: function (postId, text) { return isSample(postId) ? no('예시 글에는 쪽지를 보낼 수 없어요.') : rpc('plt_send_message', { p_post_id: postId, p_text: text }); },
    requestTrade: function (postId, method) { return isSample(postId) ? no('예시 글은 거래할 수 없어요.') : rpc('plt_request_trade', { p_post_id: postId, p_method: method }); },
    myTrades: function () { return list('trades'); },
    tradeAction: function (id, action) { return rpc('plt_trade_action', { p_id: id, p_action: action }); },

    /* ---------------- 행사·상담·문의 ---------------- */
    register: function (eventId, d) { return rpc('plt_register', { p_event_id: eventId, d: d }); },
    myRegs: function () { return list('regs'); },
    lead: function (d) { return rpc('plt_lead', { d: d }); },
    inquiry: function (d) { return rpc('plt_inquiry', { d: d }); },
    portalLogin: function () { return no('파트너 포털은 계약한 매장에 따로 열어 드려요.'); },
    portalData: function () { return no('파트너 로그인이 필요해요.'); },

    /* ---------------- 운영 콘솔 ---------------- */
    adminLogin: function (password, email) {
      if (!email) return no('운영자 이메일을 넣어 주세요.');
      return sb.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return rpc('plt_admin_check');
      }).then(function (ok) {
        if (!ok) return sb.auth.signOut().then(function () { throw PLT.fail('운영자로 등록되지 않은 계정이에요.'); });
        return true;
      });
    },
    adminCheck: function () { return authed().then(function (ok) { return ok ? rpc('plt_admin_check') : false; }); },
    adminLogout: function () { return sb.auth.signOut().then(function () { return true; }); },
    adminStats: function () { return rpc('plt_admin_stats'); },
    adminList: function (kind) { return rpc('plt_admin_list', { p_kind: kind }); },
    adminUpdate: function (kind, id, patch) { return rpc('plt_admin_update', { p_kind: kind, p_id: String(id), patch: patch }); },
    adminAddBooking: function (q) { return rpc('plt_admin_add_booking', { q: q }); },
    adminSetStatus: function (seriesId, status) { return rpc('plt_admin_set_status', { p_series_id: seriesId, p_status: status }).then(function (r) { return refreshOverlay().then(function () { return r; }); }); },
    adminAddArrival: function (a) { return rpc('plt_admin_add_arrival', { a: a }); },
    adminIssueCoupon: function (phone, defId) { return rpc('plt_admin_issue_coupon', { p_phone: phone, p_def: defId }); },
    adminStamp: function (phone, store) { return rpc('plt_admin_stamp', { p_phone: phone, p_store: store || 'kd-gacha' }); },
    adminSyncRules: function () { return rpc('plt_admin_sync_rules', { rules: PLT.rulesSnapshot() }); },
    adminSetKioskKey: function (store, key) { return rpc('plt_admin_set_kiosk_key', { p_store: store, p_key: key }); },
    adminReset: function () { return no('실서비스 데이터는 콘솔에서 지울 수 없어요.'); }
  };

  /* 로그인 상태가 바뀌면 화면에 알려 줍니다 (다른 탭에서 로그아웃 등) */
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT' || ev === 'TOKEN_REFRESHED') { if (PLT.refreshMe) PLT.refreshMe().catch(function () { }); } });
})();
