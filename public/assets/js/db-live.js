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
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'plt-auth', flowType: 'pkce' }
  });
  var A = S.auth || {};
  /* 아이디 → 로그인 계정 주소 (메일을 보내지 않는 내부 주소예요) */
  var idEmail = function (u) { return String(u || '').trim().toLowerCase() + '@' + (A.idDomain || 'id.playtion.kr'); };
  PLT.sb = sb;

  var FRIENDLY = [
    [/rate limit|too many|security purposes/i, '요청이 많아요. 잠시 뒤에 다시 시도해 주세요.'],
    [/token has expired|otp.*expired|expired|invalid.*(otp|token)|token.*invalid/i, '링크가 만료됐어요. 비밀번호 찾기를 다시 해 주세요.'],
    [/invalid login credentials/i, '아이디나 비밀번호가 맞지 않아요.'],
    [/already registered|already been registered|user already exists/i, '이미 쓰고 있는 아이디예요. 다른 아이디를 골라 주세요.'],
    [/password.*(at least|should be|weak|characters)/i, '비밀번호는 영문과 숫자를 섞어 8자 이상으로 정해 주세요.'],
    [/same.*password|different from the old/i, '지금과 다른 비밀번호로 정해 주세요.'],
    [/email address .* is invalid|email_address_invalid/i, '가입 설정을 마치지 못했어요. 고객센터로 알려 주세요. (계정 주소 도메인 확인 필요)'],
    [/signups not allowed|signup.*disabled/i, '지금은 가입을 받지 않아요. 고객센터로 문의해 주세요.'],
    [/provider is not enabled|unsupported provider/i, '이 로그인 방식은 아직 연결하지 않았어요. 아이디로 가입해 주세요.'],
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
    /* 커뮤니티(db-community.js)가 같은 연결을 쓰도록 내부 도구를 건넵니다 */
    _live: { rpc: rpc, authed: authed, friendly: friendly, no: no },

    /* ---------------- 회원 ---------------- */
    me: function () { return authed().then(function (ok) { return ok ? rpc('plt_me') : null; }); },
    usernameFree: function (u) {
      if (!PLT.idOk(String(u || '').trim().toLowerCase())) return no('아이디는 영문 소문자로 시작해 영문 소문자·숫자·밑줄(_)로 4~20자를 써 주세요.');
      return rpc('plt_username_free', { p_username: String(u).trim().toLowerCase() });
    },
    /* 아이디·비밀번호 가입 — Supabase 이메일 로그인 위에 아이디 주소를 얹어요 (Confirm email 은 꺼 둬야 해요) */
    signup: function (p) {
      var u = String(p.username || '').trim().toLowerCase();
      if (!PLT.idOk(u)) return no('아이디는 영문 소문자로 시작해 영문 소문자·숫자·밑줄(_)로 4~20자를 써 주세요.');
      if (!PLT.pwOk(p.password)) return no('비밀번호는 영문과 숫자를 섞어 8자 이상으로 정해 주세요.');
      var body = Object.assign({}, p, { firstTouch: PLT.ls.get('firstTouch', 'web') }); delete body.password;
      return rpc('plt_username_free', { p_username: u }).then(function (free) {
        if (!free) throw PLT.fail('이미 쓰고 있는 아이디예요. 다른 아이디를 골라 주세요.');
        return sb.auth.signUp({ email: idEmail(u), password: p.password, options: { data: { username: u } } });
      }).then(function (r) {
        /* 지난번 가입이 중간에 끊긴 같은 사람이면 같은 비밀번호로 이어서 마무리해요 */
        if (r.error && /already|exists/i.test(r.error.message || '')) {
          return sb.auth.signInWithPassword({ email: idEmail(u), password: p.password }).then(function (r2) {
            if (r2.error) throw PLT.fail('이미 쓰고 있는 아이디예요. 다른 아이디를 골라 주세요.');
            return rpc('plt_me').then(function (me) { if (me) throw PLT.fail('이미 가입한 아이디예요. 로그인해 주세요.'); return r2; });
          });
        }
        if (r.error) throw PLT.fail(friendly(r.error.message));
        if (!r.data || !r.data.session) throw PLT.fail('가입 설정을 마치지 못했어요. 고객센터로 알려 주세요. (Supabase Confirm email 끄기 필요)');
        return r;
      }).then(function () { return rpc('plt_signup', { p: body }); });
    },
    login: function (username, password) {
      var u = String(username || '').trim().toLowerCase();
      if (!u || !password) return no('아이디와 비밀번호를 넣어 주세요.');
      return sb.auth.signInWithPassword({ email: idEmail(u), password: password }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return rpc('plt_me');
      }).then(function (me) {
        if (!me) return { me: null, pending: true };
        return { me: me, mustChange: !!me.mustChangePw };
      });
    },
    /* 카카오·구글 — 그 회사 로그인 화면으로 갔다가 /pass/login 으로 돌아와요 */
    social: function (provider, next) {
      if (provider !== 'kakao' && provider !== 'google') return no('지원하지 않는 로그인 방식이에요.');
      var back = location.origin + '/pass/login?oauth=' + provider + (next ? '&next=' + encodeURIComponent(next) : '');
      return sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: back } }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return { redirect: true };
      });
    },
    /* 돌아온 직후: 주소의 code 로 로그인을 마치고, 회원 정보가 없으면 가입 마무리로 */
    pendingSocial: function () {
      var code = PLT.param('code');
      var step = code ? sb.auth.exchangeCodeForSession(code).then(function (r) { if (r.error) throw PLT.fail(friendly(r.error.message)); }) : Promise.resolve();
      return step.then(function () { return sb.auth.getUser(); }).then(function (r) {
        var user = r && r.data && r.data.user; if (!user) return null;
        var prov = (user.app_metadata || {}).provider || '';
        if (prov !== 'kakao' && prov !== 'google') return null;
        return rpc('plt_me').then(function (me) {
          if (me) return null;
          var md = user.user_metadata || {};
          return { provider: prov, nick: String(md.nickname || md.name || md.full_name || '').slice(0, 12), email: user.email || md.email || '' };
        });
      });
    },
    cancelSocial: function () { return sb.auth.signOut().then(function () { return true; }); },
    completeSignup: function (p) { return rpc('plt_signup', { p: Object.assign({}, p, { firstTouch: PLT.ls.get('firstTouch', 'web') }) }); },
    changePassword: function (current, next) {
      if (!PLT.pwOk(next)) return no('새 비밀번호는 영문과 숫자를 섞어 8자 이상으로 정해 주세요.');
      var me = PLT.me || {};
      if (me.provider && me.provider !== 'id') return no('카카오·구글로 가입한 계정은 비밀번호가 없어요.');
      var check = me.mustChangePw ? Promise.resolve() : sb.auth.signInWithPassword({ email: idEmail(me.username), password: current || '' }).then(function (r) { if (r.error) throw PLT.fail('지금 비밀번호가 맞지 않아요.'); });
      return check.then(function () { return sb.auth.updateUser({ password: next }); }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return rpc('plt_pw_changed');
      });
    },
    /* 아이디 찾기·비밀번호 재설정 메일 (Cloudflare 함수 /api/auth/recover 가 보내요) */
    recover: function (d) {
      return fetch('/api/auth/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: d.kind === 'id' ? 'id' : 'password', username: String(d.username || '').trim().toLowerCase(), email: String(d.email || '').trim() }) })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { if (!res.ok || j.error) { var e = PLT.fail(j.error || '메일을 보내지 못했어요. 관리자에게 재설정을 요청해 주세요.'); e.fallback = !!j.fallback || res.status === 503; throw e; } return { sent: true }; }); },
          function () { throw PLT.fail('연결이 불안정해요. 잠시 뒤에 다시 시도해 주세요.'); });
    },
    checkReset: function (token) { return Promise.resolve(!!token); },
    resetPassword: function (token, next) {
      if (!PLT.pwOk(next)) return no('새 비밀번호는 영문과 숫자를 섞어 8자 이상으로 정해 주세요.');
      return sb.auth.verifyOtp({ token_hash: token, type: 'recovery' }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return sb.auth.updateUser({ password: next });
      }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return rpc('plt_pw_changed');
      });
    },
    pwRequest: function (d) {
      var text = ('아이디: ' + (d.username || '-') + ' / 닉네임: ' + (d.nick || '-') + (d.memo ? ' / ' + d.memo : '')).slice(0, 1500);
      return rpc('plt_inquiry', { d: { type: 'account', kind: '비밀번호 재설정 요청', text: text, contact: d.contact || '' } });
    },
    attend: function () { return rpc('plt_attend'); },
    rewardUsage: function () { return rpc('plt_reward_usage'); },
    redeem: function (id, qty) { return rpc('plt_redeem', { p_reward_id: id, p_qty: qty || 1 }); },
    myEntries: function () { return list('entries'); },
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
    /* 운영자 비밀번호 — 콘솔에서 바꾸기(current 가 null 이면 재설정 링크로 들어온 경우), 잊었을 때 메일 받기 */
    adminChangePassword: function (current, next) {
      return sb.auth.getUser().then(function (r) {
        var em = r && r.data && r.data.user && r.data.user.email;
        if (!em) throw PLT.fail('다시 로그인해 주세요.');
        if (current === null) return null;
        return sb.auth.signInWithPassword({ email: em, password: current }).then(function (r2) { if (r2.error) throw PLT.fail('지금 비밀번호가 맞지 않아요.'); });
      }).then(function () { return sb.auth.updateUser({ password: next }); }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return true;
      });
    },
    adminForgot: function (email) {
      return sb.auth.resetPasswordForEmail(String(email || '').trim(), { redirectTo: location.origin + '/admin/?reset=1' }).then(function (r) {
        if (r.error) throw PLT.fail(friendly(r.error.message));
        return true;
      });
    },
    adminRecover: function () {
      var code = PLT.param('code');
      if (!code) return Promise.resolve(false);
      return sb.auth.exchangeCodeForSession(code).then(function (r) { if (r.error) throw PLT.fail('재설정 링크가 만료됐어요. 비밀번호를 잊었어요에서 다시 받아 주세요.'); return true; });
    },
    adminLogout: function () { return sb.auth.signOut().then(function () { return true; }); },
    adminStats: function () { return rpc('plt_admin_stats'); },
    /* 운영 콘솔 KPI 가 서버 통계(/api/stats)에 운영자임을 알릴 때 씁니다 */
    accessToken: function () { return sb.auth.getSession().then(function (r) { return r.data && r.data.session ? r.data.session.access_token : null; }, function () { return null; }); },
    adminList: function (kind) { return rpc('plt_admin_list', { p_kind: kind }); },
    adminUpdate: function (kind, id, patch) { return rpc('plt_admin_update', { p_kind: kind, p_id: String(id), patch: patch }); },
    adminAddBooking: function (q) { return rpc('plt_admin_add_booking', { q: q }); },
    adminSetStatus: function (seriesId, status) { return rpc('plt_admin_set_status', { p_series_id: seriesId, p_status: status }).then(function (r) { return refreshOverlay().then(function () { return r; }); }); },
    adminAddArrival: function (a) { return rpc('plt_admin_add_arrival', { a: a }); },
    adminIssueCoupon: function (key, defId) { return rpc('plt_admin_issue_coupon', { p_key: key, p_def: defId }); },
    adminStamp: function (key, store) { return rpc('plt_admin_stamp', { p_key: key, p_store: store || 'kd-gacha' }); },
    adminPoints: function (key, points, memo) { return rpc('plt_admin_points', { p_key: key, p_points: parseInt(points, 10) || 0, p_memo: memo || '' }); },
    adminResetPassword: function (memberId) { return rpc('plt_admin_reset_password', { p_member: memberId }); },
    adminDraw: function (rewardId) { return rpc('plt_admin_draw', { p_reward_id: rewardId }); },
    adminSyncRules: function () { return rpc('plt_admin_sync_rules', { rules: PLT.rulesSnapshot() }); },
    adminSetKioskKey: function (store, key) { return rpc('plt_admin_set_kiosk_key', { p_store: store, p_key: key }); },
    adminReset: function () { return no('실서비스 데이터는 콘솔에서 지울 수 없어요.'); }
  };

  /* 로그인 상태가 바뀌면 화면에 알려 줍니다 (다른 탭에서 로그아웃 등) */
  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT' || ev === 'TOKEN_REFRESHED') { if (PLT.refreshMe) PLT.refreshMe().catch(function () { }); } });
})();
