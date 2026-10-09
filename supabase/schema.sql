-- =====================================================================
--  PLAYTION PLATFORM — Supabase 스키마 (schema.sql)
--  ---------------------------------------------------------------------
--  Supabase → SQL Editor → New query 에 이 파일 전체를 붙여 넣고 Run.
--  그다음 seed.sql(요금·규칙)을 한 번 더 Run 하면 준비가 끝납니다.
--
--  구조
--   · 모든 표는 private 스키마에 있어 홈페이지에서 직접 읽거나 쓸 수 없습니다.
--   · 홈페이지는 public 스키마의 plt_ 로 시작하는 함수만 부를 수 있고,
--     함수 안에서 로그인 여부, 본인 여부, 금액을 서버가 다시 확인합니다.
--   · 요금·적립·쿠폰 규칙은 private.config 의 'rules' 한 줄(JSON)에 있습니다.
--     data/*.js 를 고친 뒤 운영 콘솔 → 도구 → "규칙을 서버에 반영"을 누르면 바뀝니다.
--  여러 번 실행해도 안전하도록 작성했습니다.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;

-- 이전 버전 함수 정리 (표와 데이터는 그대로 둡니다)
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where (n.nspname = 'public' and p.proname like 'plt\_%') or n.nspname = 'private' loop
    execute 'drop function if exists ' || f.sig || ' cascade';
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  표
-- ---------------------------------------------------------------------
create table if not exists private.config (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table if not exists private.secrets (key text primary key, value text not null);
insert into private.secrets (key, value) values ('kiosk', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict (key) do nothing;

create table if not exists private.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('staff', 'admin')),
  name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists private.members (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null unique,
  nick text not null default '',
  name text not null default '',
  birth text not null default '',
  code text not null unique,
  invited_by text not null default '',
  plus_until timestamptz,
  plus_auto boolean not null default false,
  consents jsonb not null default '{}'::jsonb,
  first_touch text not null default '',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists private.ledger (
  id bigint generated always as identity primary key,
  member_id uuid not null references private.members (id) on delete cascade,
  at timestamptz not null default now(),
  type text not null, memo text not null default '',
  points int not null default 0, coins int not null default 0, xp int not null default 0,
  ref text not null default ''
);
create index if not exists ledger_member on private.ledger (member_id, at desc);

create table if not exists private.stamps (
  id bigint generated always as identity primary key,
  member_id uuid not null references private.members (id) on delete cascade,
  kind text not null, store text not null default '', ref text not null default '',
  at timestamptz not null default now()
);
create index if not exists stamps_member on private.stamps (member_id);

create table if not exists private.coupons (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references private.members (id) on delete cascade,
  def_id text not null, title text not null, line text not null, kind text not null, value numeric not null default 0,
  created_at timestamptz not null default now(), expires_at timestamptz not null, used_at timestamptz, source text not null default ''
);
create index if not exists coupons_member on private.coupons (member_id);

create table if not exists private.notes (
  id bigint generated always as identity primary key,
  member_id uuid not null references private.members (id) on delete cascade,
  title text not null, body text not null default '', link text not null default '',
  at timestamptz not null default now(), read boolean not null default false
);
create index if not exists notes_member on private.notes (member_id, at desc);

create table if not exists private.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  member_id uuid references private.members (id) on delete set null,
  name text not null default '', phone text not null default '',
  station_id text not null, date date not null, time_id text not null,
  start_hour int not null, hours int not null default 0,
  span_start int not null, span_end int not null,
  people int not null, options text[] not null default '{}', package_id text not null default '', memo text not null default '',
  quote jsonb not null default '{}'::jsonb, coupon_id uuid,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'done', 'noshow', 'cancelled', 'expired')),
  channel text not null default 'own', pay_method text not null default '', payment_key text not null default '',
  created_at timestamptz not null default now(), cancelled_at timestamptz, refund int, refund_rate numeric
);
create index if not exists bookings_slot on private.bookings (station_id, date);
create index if not exists bookings_member on private.bookings (member_id);

create table if not exists private.orders (
  order_no text primary key,
  member_id uuid references private.members (id) on delete set null,
  kind text not null check (kind in ('booking', 'coin', 'plus')),
  amount int not null, coin int not null default 0, ref text not null default '',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  payment_key text not null default '', created_at timestamptz not null default now(), paid_at timestamptz
);

create table if not exists private.checkins (
  id bigint generated always as identity primary key,
  member_id uuid not null references private.members (id) on delete cascade,
  store text not null, day date not null, at timestamptz not null default now(),
  unique (member_id, store, day)
);
create table if not exists private.kiosk_keys (store text primary key, key_hash text not null, updated_at timestamptz not null default now());

create table if not exists private.series_status (series_id text primary key, status text, checked_at timestamptz, online_sold int not null default 0);
create table if not exists private.arrivals (id bigint generated always as identity primary key, date date not null, series text[] not null, note text not null default '', at timestamptz not null default now());
create table if not exists private.subs (member_id uuid not null references private.members (id) on delete cascade, series_id text not null, at timestamptz not null default now(), primary key (member_id, series_id));
create table if not exists private.box (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references private.members (id) on delete cascade,
  series_id text not null, idx int not null, item text not null,
  at timestamptz not null default now(), status text not null default 'stored', code text not null default '', address text not null default '',
  free_ship boolean not null default false, updated_at timestamptz
);
create index if not exists box_member on private.box (member_id);
create table if not exists private.collection (member_id uuid not null references private.members (id) on delete cascade, series_id text not null, idx int not null, primary key (member_id, series_id, idx));

create table if not exists private.posts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references private.members (id) on delete set null,
  nick text not null default '', type text not null check (type in ('sell', 'swap', 'want')),
  title text not null, series_id text not null default '', have text not null default '', want text not null default '',
  price int not null default 0, method text not null default 'meet', condition text not null default '', body text not null default '',
  status text not null default 'open', created_at timestamptz not null default now()
);
create table if not exists private.messages (
  id bigint generated always as identity primary key,
  post_id uuid not null references private.posts (id) on delete cascade,
  from_id uuid references private.members (id) on delete set null, to_id uuid references private.members (id) on delete set null,
  nick text not null default '', text text not null, at timestamptz not null default now()
);
create table if not exists private.trades (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references private.posts (id) on delete cascade, title text not null,
  buyer_id uuid references private.members (id) on delete set null, seller_id uuid references private.members (id) on delete set null,
  price int not null, fee int not null, method text not null, status text not null default 'paid', code text not null,
  at timestamptz not null default now(), done_at timestamptz
);

create table if not exists private.reviews (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references private.members (id) on delete set null, nick text not null default '',
  booking_id uuid unique references private.bookings (id) on delete set null, station_id text not null,
  rating int not null check (rating between 1 and 5), text text not null, photo boolean not null default false,
  status text not null default 'approved', at timestamptz not null default now()
);
create table if not exists private.gifts (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references private.members (id) on delete set null, to_phone text not null, amount int not null,
  message text not null default '', at timestamptz not null default now(), claimed_at timestamptz
);
create table if not exists private.regs (
  id uuid primary key default gen_random_uuid(), event_id text not null,
  member_id uuid references private.members (id) on delete set null, name text not null default '', phone text not null,
  people int not null default 1, memo text not null default '', status text not null default 'applied', at timestamptz not null default now()
);
create table if not exists private.leads (
  id uuid primary key default gen_random_uuid(), kind text not null default 'general',
  name text not null, phone text not null, email text not null default '', company text not null default '', region text not null default '',
  area text not null default '', budget text not null default '', has_space text not null default '', message text not null default '',
  status text not null default 'new', at timestamptz not null default now()
);
create table if not exists private.inquiries (
  id uuid primary key default gen_random_uuid(), type text not null default 'general', kind text not null default '', machine text not null default '',
  text text not null default '', contact text not null default '', member_id uuid references private.members (id) on delete set null,
  status text not null default 'open', at timestamptz not null default now()
);

-- 표는 함수로만 다룹니다
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'private' loop
    execute format('alter table private.%I enable row level security', t.tablename);
    execute format('revoke all on private.%I from public', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  내부 도구
-- ---------------------------------------------------------------------
create or replace function private.rules() returns jsonb language sql stable as $$ select coalesce((select value from private.config where key = 'rules'), '{}'::jsonb) $$;
create or replace function private.today() returns date language sql stable as $$ select (now() at time zone 'Asia/Seoul')::date $$;
create or replace function private.hour_now() returns int language sql stable as $$ select extract(hour from now() at time zone 'Asia/Seoul')::int $$;
create or replace function private.fail(msg text) returns void language plpgsql as $$ begin raise exception using message = msg, errcode = 'P0001'; end $$;
create or replace function private.uid() returns uuid language sql stable as $$ select auth.uid() $$;
create or replace function private.need() returns uuid language plpgsql stable as $$
declare u uuid := auth.uid();
begin
  if u is null or not exists (select 1 from private.members where id = u) then perform private.fail('로그인이 필요해요.'); end if;
  return u;
end $$;
create or replace function private.is_staff() returns boolean language sql stable as $$ select exists (select 1 from private.staff where user_id = auth.uid()) $$;
create or replace function private.need_staff() returns void language plpgsql stable as $$ begin if not private.is_staff() then perform private.fail('운영자만 쓸 수 있어요.'); end if; end $$;
create or replace function private.code(prefix text, len int) returns text language plpgsql volatile as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; o text := ''; i int;
begin
  for i in 1..len loop o := o || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
  return case when prefix = '' then o else prefix || '-' || o end;
end $$;
create or replace function private.clean_phone(p text) returns text language sql immutable as $$ select left(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 11) $$;
create or replace function private.valid_phone(p text) returns boolean language sql immutable as $$ select private.clean_phone(p) ~ '^01[016789][0-9]{7,8}$' $$;
create or replace function private.hmac(k text, m text) returns text language plpgsql immutable as $$
declare key bytea := convert_to(k, 'UTF8'); ip bytea; op bytea; i int;
begin
  if length(key) > 64 then key := sha256(key); end if;
  key := key || decode(repeat('00', 64 - length(key)), 'hex');
  ip := key; op := key;
  for i in 0..63 loop ip := set_byte(ip, i, get_byte(key, i) # 54); op := set_byte(op, i, get_byte(key, i) # 92); end loop;
  return encode(sha256(op || sha256(ip || convert_to(m, 'UTF8'))), 'hex');
end $$;
create or replace function private.ts(t timestamptz) returns text language sql immutable as $$ select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;
create or replace function private.station(sid text) returns jsonb language sql stable as $$ select s from jsonb_array_elements(private.rules() -> 'stations') s where s ->> 'id' = sid limit 1 $$;
create or replace function private.ptime(tid text) returns jsonb language sql stable as $$ select t from jsonb_array_elements(private.rules() -> 'party' -> 'times') t where t ->> 'id' = tid limit 1 $$;
create or replace function private.series(sid text) returns jsonb language sql stable as $$ select s from jsonb_array_elements(private.rules() -> 'gacha' -> 'series') s where s ->> 'id' = sid limit 1 $$;
create or replace function private.jint(j jsonb, k text, d int default 0) returns int language sql immutable as $$ select coalesce(nullif(j ->> k, '')::numeric, d)::int $$;

-- 지갑: 포인트·코인·XP·등급·스탬프
create or replace function private.wallet(mid uuid) returns jsonb language plpgsql stable as $$
declare r jsonb := private.rules(); ps jsonb := r -> 'pass'; m private.members; v_pts int; v_cns int; v_xp int; v_st int; goal int; plus boolean;
  lv jsonb; nx jsonb; l jsonb; prog numeric; earn int;
begin
  select * into m from private.members where id = mid;
  select coalesce(sum(lg.points), 0), coalesce(sum(lg.coins), 0) into v_pts, v_cns from private.ledger lg where lg.member_id = mid;
  select coalesce(sum(lg.xp), 0) into v_xp from private.ledger lg where lg.member_id = mid and lg.at >= now() - interval '365 days';
  select count(*) into v_st from private.stamps sp where sp.member_id = mid;
  goal := coalesce((ps -> 'stamps' ->> 'goal')::int, 10);
  plus := m.plus_until is not null and m.plus_until > now();
  lv := ps -> 'levels' -> 0; nx := null;
  for l in select value from jsonb_array_elements(ps -> 'levels') loop
    if v_xp >= (l ->> 'min')::int then lv := l; nx := null; elsif nx is null then nx := l; end if;
  end loop;
  prog := case when nx is null then 1 else least(1, (v_xp - (lv ->> 'min')::numeric) / greatest(1, (nx ->> 'min')::numeric - (lv ->> 'min')::numeric)) end;
  earn := (lv ->> 'earn')::int + case when plus then 1 else 0 end;
  return jsonb_build_object('points', v_pts, 'coins', v_cns, 'xp', v_xp, 'level', lv, 'nextLevel', nx, 'progress', prog,
    'toNext', case when nx is null then 0 else (nx ->> 'min')::int - v_xp end,
    'stampsTotal', v_st, 'stamps', v_st % goal, 'stampGoal', goal, 'isPlus', plus, 'plusUntil', private.ts(m.plus_until),
    'earnRate', earn, 'noDeposit', plus or lv ->> 'id' in ('pro', 'legend'));
end $$;
create or replace function private.me_json(mid uuid) returns jsonb language sql stable as $$
  select case when m.id is null then null else jsonb_build_object('id', m.id, 'phone', m.phone, 'nick', m.nick, 'name', m.name, 'birth', m.birth, 'code', m.code,
    'invitedBy', m.invited_by, 'plusAuto', m.plus_auto, 'consents', m.consents, 'createdAt', private.ts(m.created_at),
    'unreadNotes', (select count(*) from private.notes n where n.member_id = m.id and not n.read)) || private.wallet(m.id) end
  from private.members m where m.id = mid
$$;
create or replace function private.ledger_add(mid uuid, t text, memo text, p int default 0, c int default 0, x int default 0, ref text default '') returns void language sql as $$
  insert into private.ledger (member_id, type, memo, points, coins, xp, ref) values (mid, t, coalesce(memo, ''), coalesce(p, 0), coalesce(c, 0), coalesce(x, 0), coalesce(ref, ''))
$$;
create or replace function private.note(mid uuid, title text, body text default '', link text default '') returns void language sql as $$
  insert into private.notes (member_id, title, body, link) select mid, title, coalesce(body, ''), coalesce(link, '') where mid is not null
$$;
create or replace function private.coupon_json(c private.coupons) returns jsonb language sql stable as $$
  select jsonb_build_object('id', c.id, 'memberId', c.member_id, 'defId', c.def_id, 'title', c.title, 'line', c.line, 'kind', c.kind, 'value', c.value,
    'createdAt', private.ts(c.created_at), 'expiresAt', private.ts(c.expires_at), 'usedAt', private.ts(c.used_at), 'source', c.source,
    'expired', c.used_at is null and c.expires_at < now())
$$;
create or replace function private.issue(mid uuid, def_id text, src text) returns jsonb language plpgsql as $$
declare d jsonb := private.rules() -> 'pass' -> 'coupons' -> def_id; c private.coupons;
begin
  if d is null or mid is null then return null; end if;
  insert into private.coupons (member_id, def_id, title, line, kind, value, expires_at, source)
    values (mid, def_id, d ->> 'title', d ->> 'line', d ->> 'kind', coalesce((d ->> 'value')::numeric, 0), now() + make_interval(days => coalesce((d ->> 'days')::int, 30)), coalesce(src, ''))
    returning * into c;
  if c.kind = 'coin' then
    update private.coupons set used_at = now() where id = c.id returning * into c;
    perform private.ledger_add(mid, 'coupon', c.title, 0, c.value::int, 0, c.id::text);
  end if;
  perform private.note(mid, '쿠폰이 들어왔어요', c.title, 'pass/me#coupons');
  return private.coupon_json(c);
end $$;
create or replace function private.add_stamp(mid uuid, kind text, store text, ref text) returns jsonb language plpgsql as $$
declare ps jsonb := private.rules() -> 'pass'; total int; goal int; rw jsonb := '[]'::jsonb; c jsonb; st jsonb := private.station(store); n int;
begin
  if mid is null then return jsonb_build_object('rewards', rw); end if;
  insert into private.stamps (member_id, kind, store, ref) values (mid, kind, coalesce(store, ''), coalesce(ref, ''));
  select count(*) into total from private.stamps where member_id = mid;
  goal := coalesce((ps -> 'stamps' ->> 'goal')::int, 10);
  if total % goal = 0 then c := private.issue(mid, coalesce(ps -> 'stamps' -> 'reward' ->> 'couponId', 'stamp10'), 'stamp'); if c is not null then rw := rw || jsonb_build_array(c); end if; end if;
  if kind = 'checkin' and st ->> 'type' = 'gacha' and ps -> 'transfer' is not null then
    select count(*) into n from private.stamps s where s.member_id = mid and s.kind = 'checkin' and (private.station(s.store) ->> 'type') = 'gacha';
    if n % coalesce((ps -> 'transfer' ->> 'gachaVisitsForParty')::int, 3) = 0 then
      c := private.issue(mid, ps -> 'transfer' ->> 'gachaToParty', 'transfer'); if c is not null then rw := rw || jsonb_build_array(c); end if;
    end if;
  end if;
  return jsonb_build_object('rewards', rw, 'total', total);
end $$;

-- ---------------------------------------------------------------------
--  파티룸 요금 · 빈 시간
-- ---------------------------------------------------------------------
create or replace function private.span(tid text, start_hour int, hours int) returns int[] language plpgsql stable as $$
declare t jsonb := private.ptime(tid);
begin
  if t is null then return null; end if;
  if tid = 'hourly' then return array[start_hour, start_hour + hours]; end if;
  return array[(t ->> 'start')::int, (t ->> 'end')::int];
end $$;
create or replace function private.started(d date, tid text, start_hour int) returns boolean language plpgsql stable as $$
declare h int := private.hour_now();
begin
  if d < private.today() then return true; end if;
  if d > private.today() then return false; end if;
  if tid = 'night' then return h >= 23; end if;
  if tid = 'day' then return h >= 13; end if;
  return start_hour <= h;
end $$;
-- 결제를 30분 안에 마치지 않은 예약은 자리를 풀고 쓴 포인트·코인·쿠폰을 돌려줍니다
create or replace function private.expire_holds() returns void language plpgsql as $$
declare b private.bookings;
begin
  for b in select * from private.bookings where status = 'requested' and channel = 'own' and created_at < now() - interval '30 minutes' and pay_method <> 'manual' for update skip locked loop
    update private.bookings set status = 'expired' where id = b.id;
    update private.orders set status = 'cancelled' where order_no = b.code and status = 'pending';
    if b.member_id is not null then
      if coalesce((b.quote ->> 'usePoints')::int, 0) > 0 then perform private.ledger_add(b.member_id, 'refund', '결제 시간 초과 환급 ' || b.code, (b.quote ->> 'usePoints')::int, 0, 0, b.id::text); end if;
      if coalesce((b.quote ->> 'useCoins')::int, 0) > 0 then perform private.ledger_add(b.member_id, 'refund', '결제 시간 초과 환급 ' || b.code, 0, (b.quote ->> 'useCoins')::int, 0, b.id::text); end if;
      if b.coupon_id is not null then update private.coupons set used_at = null where id = b.coupon_id; end if;
      perform private.note(b.member_id, '결제 시간이 지나 예약을 풀었어요', b.code || ' · 다시 예약해 주세요.', 'party/booking');
    end if;
  end loop;
end $$;
create or replace function private.spans(sid text, d date) returns table (s int, e int, src text) language sql stable as $$
  select span_start, span_end, channel from private.bookings where station_id = sid and date = d and status in ('requested', 'confirmed', 'done')
  union all
  select 0, span_end - 24, channel from private.bookings where station_id = sid and date = d - 1 and span_end > 24 and status in ('requested', 'confirmed', 'done')
$$;
create or replace function private.is_free(sid text, d date, sp int[], only_real boolean default false) returns boolean language sql stable as $$
  select not exists (select 1 from private.spans(sid, d) x where x.s < sp[2] and sp[1] < x.e)
     and not (sp[2] > 24 and exists (select 1 from private.spans(sid, d + 1) y where y.s + 24 < sp[2] and sp[1] < y.e + 24))
$$;

-- 금액 계산 (assets/js/core.js 의 PLT.party.quote 와 같은 규칙)
create or replace function private.quote(q jsonb, ctx jsonb) returns jsonb language plpgsql stable as $$
declare P jsonb := private.rules() -> 'party'; tid text := q ->> 'timeId'; t jsonb := private.ptime(tid); st jsonb := private.station(q ->> 'stationId');
  d date := (q ->> 'date')::date; dow int; we boolean; unit int; hours int := 0; base int; lines jsonb := '[]'::jsonb; hh jsonb; hd int;
  people int; extra int; opts text[] := '{}'; o jsonb; optsum int := 0; subtotal int; disc int := 0; op jsonb; start_h int; pd int;
  cp jsonb := ctx -> 'coupon'; def jsonb; cp_amt int := 0; cp_note text := ''; payable int; use_pt int := 0; use_cn int := 0; deposit int; min_use int;
begin
  if t is null or st is null or d is null then return null; end if;
  dow := extract(dow from d)::int;
  we := dow in (0, 6) or (dow = 5 and tid = 'night');
  unit := case when we then (t ->> 'we')::int else (t ->> 'wd')::int end;
  if tid = 'hourly' then hours := greatest(coalesce((t ->> 'minHours')::int, 2), least(coalesce((t ->> 'maxHours')::int, 8), private.jint(q, 'hours', 2))); end if;
  base := case when tid = 'hourly' then unit * hours else unit end;
  lines := lines || jsonb_build_array(jsonb_build_object('label', (t ->> 'name') || case when tid = 'hourly' then ' ' || hours || '시간' else '' end || case when we then ' · 주말' else ' · 평일' end, 'amount', base));
  hh := P -> 'happyHour';
  if tid = 'hourly' and hh is not null and (hh ->> 'enabled')::boolean and (hh -> 'days') @> to_jsonb(dow) and private.jint(q, 'startHour') >= (hh ->> 'from')::int and private.jint(q, 'startHour') < (hh ->> 'to')::int then
    hd := -round(base * (hh ->> 'rate')::numeric / 100) * 100;
    lines := lines || jsonb_build_array(jsonb_build_object('label', hh ->> 'label', 'amount', hd, 'kind', 'disc')); base := base + hd;
  end if;
  people := greatest(1, least(coalesce((st ->> 'max')::int, 30), private.jint(q, 'people', coalesce((P ->> 'basePeople')::int, 4))));
  extra := greatest(0, people - coalesce((P ->> 'basePeople')::int, 4)) * coalesce((P ->> 'extraPerPerson')::int, 0);
  if extra > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label', '추가 인원 ' || (people - (P ->> 'basePeople')::int) || '명', 'amount', extra)); end if;
  for o in select value from jsonb_array_elements(P -> 'options') loop
    if coalesce((q -> 'options' ->> (o ->> 'id'))::boolean, false) then
      opts := opts || (o ->> 'id'); optsum := optsum + (o ->> 'price')::int;
      if (o ->> 'price')::int > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label', o ->> 'name', 'amount', (o ->> 'price')::int)); end if;
    end if;
  end loop;
  subtotal := base + extra + optsum;
  op := P -> 'offPeak'; start_h := case when tid = 'hourly' then private.jint(q, 'startHour') else (t ->> 'start')::int end;
  if coalesce((ctx ->> 'isPlus')::boolean, false) and op is not null and (op -> 'days') @> to_jsonb(dow) and start_h >= (op ->> 'from')::int and start_h < (op ->> 'to')::int then
    pd := -round(base * 0.1 / 100) * 100;
    lines := lines || jsonb_build_array(jsonb_build_object('label', 'PASS+ 평일 낮 10%', 'amount', pd, 'kind', 'disc')); disc := disc - pd;
  end if;
  if cp is not null and jsonb_typeof(cp) = 'object' then
    def := cp -> 'def';
    if def ->> 'line' <> 'party' then cp_note := '파티룸에 쓸 수 없는 쿠폰이에요.';
    elsif coalesce((def ->> 'weekdayOnly')::boolean, false) and dow in (0, 6) then cp_note := '평일 예약에만 쓸 수 있는 쿠폰이에요.';
    elsif coalesce((def ->> 'minSpend')::int, 0) > 0 and subtotal < (def ->> 'minSpend')::int then cp_note := to_char((def ->> 'minSpend')::int, 'FM999,999,999') || '원 이상 예약에 쓸 수 있어요.';
    elsif def ->> 'kind' = 'amount' then cp_amt := least((def ->> 'value')::int, subtotal - disc);
    elsif def ->> 'kind' = 'rate' then cp_amt := round((subtotal - disc) * (def ->> 'value')::numeric / 100) * 100;
    end if;
    if cp_amt <> 0 then lines := lines || jsonb_build_array(jsonb_build_object('label', def ->> 'title', 'amount', -cp_amt, 'kind', 'disc')); disc := disc + cp_amt; end if;
  end if;
  payable := greatest(0, subtotal - disc);
  min_use := coalesce((private.rules() -> 'pass' -> 'points' ->> 'minUse')::int, 5000);
  if coalesce((ctx ->> 'usePoints')::boolean, false) and private.jint(ctx, 'points') >= min_use then use_pt := least(private.jint(ctx, 'points'), payable); end if;
  payable := payable - use_pt;
  if coalesce((ctx ->> 'useCoins')::boolean, false) and private.jint(ctx, 'coins') > 0 then use_cn := least(private.jint(ctx, 'coins'), payable); end if;
  payable := payable - use_cn;
  if use_pt > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label', '포인트 사용', 'amount', -use_pt, 'kind', 'disc')); end if;
  if use_cn > 0 then lines := lines || jsonb_build_array(jsonb_build_object('label', '플레이 코인 사용', 'amount', -use_cn, 'kind', 'disc')); end if;
  deposit := case when coalesce((ctx ->> 'noDeposit')::boolean, false) then 0 else coalesce((P ->> 'deposit')::int, 0) end;
  return jsonb_build_object('weekend', we, 'unit', unit, 'hours', hours, 'people', people, 'base', base, 'extra', extra, 'options', to_jsonb(opts),
    'subtotal', subtotal, 'discount', disc, 'usePoints', use_pt, 'useCoins', use_cn, 'couponAmount', cp_amt, 'couponNote', cp_note,
    'deposit', deposit, 'pay', payable, 'total', payable + deposit, 'lines', lines);
end $$;
create or replace function private.booking_json(b private.bookings) returns jsonb language sql stable as $$
  select jsonb_build_object('id', b.id, 'code', b.code, 'memberId', b.member_id, 'name', b.name, 'phone', b.phone, 'stationId', b.station_id, 'date', to_char(b.date, 'YYYY-MM-DD'),
    'timeId', b.time_id, 'startHour', b.start_hour, 'hours', b.hours, 'span', jsonb_build_array(b.span_start, b.span_end), 'people', b.people, 'options', to_jsonb(b.options),
    'packageId', b.package_id, 'memo', b.memo, 'quote', b.quote, 'couponId', b.coupon_id, 'status', b.status, 'channel', b.channel, 'pay', b.pay_method,
    'createdAt', private.ts(b.created_at), 'cancelledAt', private.ts(b.cancelled_at), 'refund', b.refund, 'refundRate', b.refund_rate)
$$;
-- 예약이 확정될 때 적립·스탬프·환승 쿠폰
create or replace function private.confirm_effects(bid uuid) returns jsonb language plpgsql as $$
declare b private.bookings; w jsonb; ps jsonb := private.rules() -> 'pass'; st jsonb; rw jsonb := '[]'::jsonb; r jsonb; tc jsonb; inv private.members; m private.members; inv_pt int;
begin
  select * into b from private.bookings where id = bid;
  if b.member_id is null then return rw; end if;
  w := private.wallet(b.member_id); st := private.station(b.station_id);
  perform private.ledger_add(b.member_id, 'booking', (st ->> 'short') || ' 예약 적립', floor((b.quote ->> 'pay')::int * (w ->> 'earnRate')::int / 100.0)::int, 0,
    floor((b.quote ->> 'pay')::int / 1000.0)::int * coalesce((ps -> 'xp' ->> 'perThousandWon')::int, 1) + coalesce((ps -> 'xp' ->> 'perBooking')::int, 0), b.id::text);
  if 'coin' = any (b.options) then perform private.ledger_add(b.member_id, 'option', '가챠 코인 팩', 0, 5000, 0, b.id::text); end if;
  r := private.add_stamp(b.member_id, 'party', b.station_id, b.id::text); rw := r -> 'rewards';
  tc := private.issue(b.member_id, ps -> 'transfer' ->> 'partyToGacha', 'transfer'); if tc is not null then rw := rw || jsonb_build_array(tc); end if;
  select * into m from private.members where id = b.member_id;
  if m.invited_by <> '' and (select count(*) from private.bookings x where x.member_id = m.id and x.status in ('confirmed', 'done')) = 1 then
    select * into inv from private.members where code = upper(m.invited_by);
    inv_pt := coalesce((ps -> 'points' ->> 'invite')::int, 0);
    if inv.id is not null and inv.id <> m.id and inv_pt > 0 then
      perform private.ledger_add(m.id, 'invite', '친구 초대 첫 예약', inv_pt);
      perform private.ledger_add(inv.id, 'invite', coalesce(nullif(m.nick, ''), '친구') || '님 첫 예약', inv_pt);
      perform private.note(inv.id, '초대한 친구가 첫 예약을 했어요', to_char(inv_pt, 'FM999,999') || 'P를 넣어 드렸어요.');
    end if;
  end if;
  perform private.note(b.member_id, '예약이 확정됐어요', (st ->> 'name') || ' · ' || to_char(b.date, 'MM"월" DD"일"') || ' · 예약번호 ' || b.code, 'pass/me#bookings');
  return rw;
end $$;

-- ---------------------------------------------------------------------
--  PASS 회원
-- ---------------------------------------------------------------------
create or replace function public.plt_me() returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := auth.uid(); m private.members; y text := to_char(now() at time zone 'Asia/Seoul', 'YYYY');
begin
  if u is null then return null; end if;
  select * into m from private.members where id = u;
  if m.id is null then return null; end if;
  update private.members set last_login_at = now() where id = u and (last_login_at is null or last_login_at < now() - interval '1 hour');
  if m.birth ~ '^\d{2}-\d{2}$' and left(m.birth, 2)::int = extract(month from now() at time zone 'Asia/Seoul')::int
     and not exists (select 1 from private.coupons where member_id = u and def_id = 'birthday' and to_char(created_at at time zone 'Asia/Seoul', 'YYYY') = y) then
    perform private.issue(u, 'birthday', 'birthday');
  end if;
  return private.me_json(u);
end $$;

create or replace function public.plt_signup(p jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := auth.uid(); ph text; g private.gifts; v_code text;
begin
  if u is null then perform private.fail('휴대폰 인증을 먼저 해 주세요.'); end if;
  if exists (select 1 from private.members where id = u) then return private.me_json(u); end if;
  select private.clean_phone(regexp_replace(phone, '^\+?82', '0')) into ph from auth.users where id = u;
  if ph is null or not private.valid_phone(ph) then perform private.fail('휴대폰 번호를 확인하지 못했어요.'); end if;
  if exists (select 1 from private.members where phone = ph) then perform private.fail('이미 가입된 번호예요.'); end if;
  if length(coalesce(trim(p ->> 'nick'), '')) < 2 then perform private.fail('닉네임을 2자 이상 적어 주세요.'); end if;
  loop v_code := private.code('PLT', 6); exit when not exists (select 1 from private.members mm where mm.code = v_code); end loop;
  insert into private.members (id, phone, nick, name, birth, code, invited_by, consents, first_touch)
    values (u, ph, left(trim(p ->> 'nick'), 12), left(coalesce(trim(p ->> 'name'), ''), 20),
      case when coalesce(p ->> 'birth', '') ~ '^\d{2}-\d{2}$' then p ->> 'birth' else '' end, v_code, upper(left(coalesce(p ->> 'invite', ''), 12)),
      jsonb_build_object('terms', true, 'age', true, 'mktSms', coalesce((p ->> 'mktSms')::boolean, false), 'mktKakao', coalesce((p ->> 'mktKakao')::boolean, false),
        'mktNight', coalesce((p ->> 'mktNight')::boolean, false), 'at', private.ts(now()), 'ver', '2026-10'), left(coalesce(p ->> 'firstTouch', 'web'), 40));
  perform private.issue(u, 'welcomeParty', 'welcome');
  perform private.issue(u, 'welcomeDraw', 'welcome');
  update private.bookings set member_id = u where member_id is null and phone = ph;
  update private.regs set member_id = u where member_id is null and phone = ph;
  for g in select * from private.gifts where to_phone = ph and claimed_at is null loop
    update private.gifts set claimed_at = now() where id = g.id;
    perform private.ledger_add(u, 'gift', '선물 받은 코인', 0, g.amount);
    perform private.note(u, '선물이 도착했어요', to_char(g.amount, 'FM999,999') || 'C' || case when g.message <> '' then ' · ' || g.message else '' end);
  end loop;
  perform private.note(u, 'PASS에 오신 걸 환영해요', '첫 예약 할인과 온라인 뽑기 1회권을 넣어 뒀어요.', 'pass/me#coupons');
  return private.me_json(u);
end $$;

create or replace function public.plt_update_profile(p jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need();
begin
  update private.members set
    nick = case when p ? 'nick' and length(trim(p ->> 'nick')) >= 1 then left(trim(p ->> 'nick'), 12) else nick end,
    name = case when p ? 'name' then left(coalesce(p ->> 'name', ''), 20) else name end,
    birth = case when p ? 'birth' and coalesce(p ->> 'birth', '') ~ '^(\d{2}-\d{2})?$' then coalesce(p ->> 'birth', '') else birth end,
    consents = case when p ? 'consents' then consents || jsonb_build_object('mktSms', coalesce((p -> 'consents' ->> 'mktSms')::boolean, (consents ->> 'mktSms')::boolean),
      'mktKakao', coalesce((p -> 'consents' ->> 'mktKakao')::boolean, (consents ->> 'mktKakao')::boolean), 'mktNight', coalesce((p -> 'consents' ->> 'mktNight')::boolean, (consents ->> 'mktNight')::boolean), 'at', private.ts(now())) else consents end
  where id = u;
  return private.me_json(u);
end $$;

create or replace function public.plt_delete_account() returns boolean language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need();
begin
  delete from private.members where id = u;      -- 적립·쿠폰·보관함 등은 함께 지워지고, 예약·거래 기록은 회원 연결만 끊깁니다
  delete from auth.users where id = u;
  return true;
end $$;

create or replace function public.plt_list(p_kind text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need();
begin
  if p_kind = 'ledger' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'at', private.ts(x.at), 'type', x.type, 'memo', x.memo, 'points', x.points, 'coins', x.coins, 'xp', x.xp, 'ref', x.ref) order by x.at desc, x.id desc) from (select * from private.ledger lg where lg.member_id = u order by lg.at desc limit 300) x), '[]');
  elsif p_kind = 'coupons' then return coalesce((select jsonb_agg(private.coupon_json(c) order by c.created_at desc) from private.coupons c where c.member_id = u), '[]');
  elsif p_kind = 'stamps' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind, 'store', x.store, 'at', private.ts(x.at)) order by x.at desc) from private.stamps x where x.member_id = u), '[]');
  elsif p_kind = 'notes' then return coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'link', n.link, 'at', private.ts(n.at), 'read', n.read) order by n.at desc) from (select * from private.notes nn where nn.member_id = u order by nn.at desc limit 100) n), '[]');
  elsif p_kind = 'box' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'memberId', x.member_id, 'seriesId', x.series_id, 'idx', x.idx, 'item', x.item, 'at', private.ts(x.at), 'status', x.status, 'code', x.code, 'address', x.address, 'updatedAt', private.ts(x.updated_at)) order by x.at desc) from private.box x where x.member_id = u), '[]');
  elsif p_kind = 'subs' then return coalesce((select jsonb_agg(jsonb_build_object('memberId', x.member_id, 'seriesId', x.series_id, 'at', private.ts(x.at))) from private.subs x where x.member_id = u), '[]');
  elsif p_kind = 'collection' then return coalesce((select jsonb_object_agg(c.series_id, c.idxs) from (select x.series_id, jsonb_agg(x.idx order by x.idx) idxs from private.collection x where x.member_id = u group by x.series_id) c), '{}');
  elsif p_kind = 'bookings' then return coalesce((select jsonb_agg(private.booking_json(b) order by b.date desc) from private.bookings b where b.member_id = u or b.phone = (select mm.phone from private.members mm where mm.id = u)), '[]');
  elsif p_kind = 'trades' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'postId', x.post_id, 'title', x.title, 'buyerId', x.buyer_id, 'sellerId', x.seller_id, 'price', x.price, 'fee', x.fee, 'method', x.method, 'status', x.status, 'code', x.code, 'at', private.ts(x.at), 'doneAt', private.ts(x.done_at)) order by x.at desc) from private.trades x where x.buyer_id = u or x.seller_id = u), '[]');
  elsif p_kind = 'regs' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'eventId', x.event_id, 'people', x.people, 'memo', x.memo, 'status', x.status, 'at', private.ts(x.at))) from private.regs x where x.member_id = u), '[]');
  end if;
  return '[]';
end $$;

create or replace function public.plt_read_notes() returns boolean language sql security definer set search_path = private, public, pg_temp as $$
  update private.notes set read = true where member_id = private.need() and not read; select true
$$;

create or replace function public.plt_gift(p jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); me private.members; amt int := private.jint(p, 'amount'); ph text := private.clean_phone(p ->> 'phone'); r private.members; allowed jsonb := private.rules() -> 'pass' -> 'gift' -> 'coinAmounts';
begin
  select * into me from private.members where id = u;
  if not private.valid_phone(ph) then perform private.fail('받는 분 전화번호를 확인해 주세요.'); end if;
  if ph = me.phone then perform private.fail('나에게는 보낼 수 없어요.'); end if;
  if amt <= 0 or (allowed is not null and not allowed @> to_jsonb(amt)) then perform private.fail('보낼 코인을 골라 주세요.'); end if;
  if (private.wallet(u) ->> 'coins')::int < amt then perform private.fail('코인이 부족해요. 먼저 충전해 주세요.'); end if;
  perform private.ledger_add(u, 'gift', left(ph, 3) || '-****-' || right(ph, 4) || '님께 선물', 0, -amt);
  select * into r from private.members where phone = ph;
  insert into private.gifts (from_id, to_phone, amount, message, claimed_at) values (u, ph, amt, left(coalesce(p ->> 'message', ''), 60), case when r.id is not null then now() end);
  if r.id is not null then
    perform private.ledger_add(r.id, 'gift', '선물 받은 코인', 0, amt);
    perform private.note(r.id, '선물이 도착했어요', to_char(amt, 'FM999,999') || 'C · ' || coalesce(nullif(me.nick, ''), '친구') || '님이 보냈어요');
  end if;
  return jsonb_build_object('delivered', r.id is not null);
end $$;

create or replace function public.plt_cancel_plus() returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); begin update private.members set plus_auto = false where id = u; return private.me_json(u); end $$;

-- 매장 체크인 (입구 화면 QR은 30초마다 바뀝니다)
create or replace function public.plt_kiosk_token(p_store text, p_key text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare w bigint := floor(extract(epoch from now()) / 30); sec text := (select value from private.secrets where key = 'kiosk');
begin
  if private.station(p_store) is null then perform private.fail('매장 코드를 확인해 주세요.'); end if;
  if not exists (select 1 from private.kiosk_keys k where k.store = p_store and k.key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex')) then perform private.fail('키오스크 키가 맞지 않아요.'); end if;
  return jsonb_build_object('token', p_store || '.' || w || '.' || left(private.hmac(sec, p_store || '|' || w), 20), 'ttl', 30 - (floor(extract(epoch from now()))::bigint % 30));
end $$;
create or replace function public.plt_checkin(token text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p text[] := string_to_array(coalesce(token, ''), '.'); sec text := (select value from private.secrets where key = 'kiosk'); age bigint; r jsonb; ps jsonb := private.rules() -> 'pass';
begin
  if array_length(p, 1) <> 3 or p[2] !~ '^\d+$' or left(private.hmac(sec, p[1] || '|' || p[2]), 20) <> p[3] then perform private.fail('QR을 다시 찍어 주세요.'); end if;
  age := floor(extract(epoch from now()) / 30)::bigint - p[2]::bigint;
  if age < 0 or age > 2 then perform private.fail('QR 유효 시간이 지났어요. 화면의 새 QR을 찍어 주세요.'); end if;
  insert into private.checkins (member_id, store, day) values (u, p[1], private.today()) on conflict do nothing;
  if not found then return jsonb_build_object('already', true, 'rewards', '[]'::jsonb, 'me', private.me_json(u)); end if;
  perform private.ledger_add(u, 'visit', coalesce(private.station(p[1]) ->> 'name', p[1]) || ' 체크인', 0, 0, coalesce((ps -> 'xp' ->> 'perVisit')::int, 10));
  r := private.add_stamp(u, 'checkin', p[1], private.today()::text);
  return jsonb_build_object('already', false, 'rewards', r -> 'rewards', 'me', private.me_json(u));
end $$;

-- ---------------------------------------------------------------------
--  파티룸 예약
-- ---------------------------------------------------------------------
create or replace function public.plt_busy(station_ids text[], dates text[]) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare v_out jsonb := '{}'::jsonb; sid text; d text; arr jsonb;
begin
  perform private.expire_holds();
  foreach sid in array station_ids loop
    v_out := v_out || jsonb_build_object(sid, '{}'::jsonb);
    foreach d in array dates loop
      select coalesce(jsonb_agg(jsonb_build_object('start', x.s, 'end', x.e, 'src', case when x.src = 'own' then 'own' else 'ext' end)), '[]') into arr from private.spans(sid, d::date) x;
      v_out := jsonb_set(v_out, array[sid, d], arr);
    end loop;
  end loop;
  return v_out;
end $$;

create or replace function public.plt_book(q jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := auth.uid(); m private.members; st jsonb := private.station(q ->> 'stationId'); t jsonb := private.ptime(q ->> 'timeId'); d date; sp int[];
  w jsonb; cp private.coupons; ctx jsonb; qt jsonb; b private.bookings; v_code text; rw jsonb := '[]'::jsonb; ph text; pkg text := coalesce(q ->> 'packageId', '');
begin
  perform private.expire_holds();
  if u is not null then select * into m from private.members where id = u; end if;
  if st is null or st ->> 'type' <> 'party' then perform private.fail('지점을 골라 주세요.'); end if;
  if t is null then perform private.fail('이용 타임을 골라 주세요.'); end if;
  begin d := (q ->> 'date')::date; exception when others then perform private.fail('날짜를 다시 골라 주세요.'); end;
  if d is null or d < private.today() or d > private.today() + 180 then perform private.fail('날짜를 다시 골라 주세요.'); end if;
  sp := private.span(q ->> 'timeId', private.jint(q, 'startHour'), private.jint(q, 'hours', 2));
  if q ->> 'timeId' = 'hourly' and (sp[1] < (t ->> 'open')::int or sp[2] > (t ->> 'close')::int or sp[2] - sp[1] < coalesce((t ->> 'minHours')::int, 2)) then perform private.fail('시간제 이용 시간을 다시 골라 주세요.'); end if;
  if private.started(d, q ->> 'timeId', sp[1]) then perform private.fail('이미 시작한 시간이에요. 다른 시간을 골라 주세요.'); end if;
  perform pg_advisory_xact_lock(hashtext((st ->> 'id') || d::text));
  if not private.is_free(st ->> 'id', d, sp) then perform private.fail('그 시간은 방금 예약이 찼어요. 다른 시간을 골라 주세요.'); end if;
  if private.jint(q, 'people', 4) > (st ->> 'max')::int then perform private.fail((st ->> 'short') || '은 최대 ' || (st ->> 'max') || '명까지 이용할 수 있어요.'); end if;
  if m.id is null then
    ph := private.clean_phone(q ->> 'phone');
    if not private.valid_phone(ph) then perform private.fail('예약자 휴대폰 번호를 확인해 주세요.'); end if;
    if length(trim(coalesce(q ->> 'name', ''))) < 1 then perform private.fail('예약자 이름을 적어 주세요.'); end if;
  else ph := m.phone; w := private.wallet(m.id); end if;
  if m.id is not null and coalesce(q ->> 'couponId', '') <> '' then
    select * into cp from private.coupons where id = (q ->> 'couponId')::uuid and member_id = m.id and used_at is null and expires_at > now();
  end if;
  ctx := case when m.id is null then '{}'::jsonb else jsonb_build_object('isPlus', w -> 'isPlus', 'usePoints', coalesce((q ->> 'usePoints')::boolean, false), 'points', w -> 'points',
    'useCoins', coalesce((q ->> 'useCoins')::boolean, false), 'coins', w -> 'coins', 'noDeposit', w -> 'noDeposit',
    'coupon', case when cp.id is null then null else jsonb_build_object('def', private.rules() -> 'pass' -> 'coupons' -> cp.def_id) end) end;
  qt := private.quote(q, ctx);
  loop v_code := 'PT' || to_char(d, 'YYMMDD') || '-' || private.code('', 4); exit when not exists (select 1 from private.bookings bb where bb.code = v_code); end loop;
  insert into private.bookings (code, member_id, name, phone, station_id, date, time_id, start_hour, hours, span_start, span_end, people, options, package_id, memo, quote, coupon_id, status, channel, pay_method)
    values (v_code, m.id, left(coalesce(nullif(trim(q ->> 'name'), ''), nullif(m.name, ''), m.nick, ''), 20), ph, st ->> 'id', d, q ->> 'timeId', case when q ->> 'timeId' = 'hourly' then sp[1] else (t ->> 'start')::int end,
      (qt ->> 'hours')::int, sp[1], sp[2], (qt ->> 'people')::int, array(select jsonb_array_elements_text(qt -> 'options')), pkg, left(coalesce(q ->> 'memo', ''), 200), qt,
      case when cp.id is not null and (qt ->> 'couponAmount')::int > 0 then cp.id end, case when (qt ->> 'total')::int = 0 then 'confirmed' else 'requested' end, 'own', left(coalesce(q ->> 'payMethod', ''), 20))
    returning * into b;
  if m.id is not null then
    if b.coupon_id is not null then update private.coupons set used_at = now() where id = b.coupon_id; end if;
    if (qt ->> 'usePoints')::int > 0 then perform private.ledger_add(m.id, 'use', '예약 ' || v_code, -(qt ->> 'usePoints')::int, 0, 0, b.id::text); end if;
    if (qt ->> 'useCoins')::int > 0 then perform private.ledger_add(m.id, 'use', '예약 ' || v_code, 0, -(qt ->> 'useCoins')::int, 0, b.id::text); end if;
  end if;
  if b.status = 'confirmed' then rw := private.confirm_effects(b.id);
  else insert into private.orders (order_no, member_id, kind, amount, ref) values (v_code, m.id, 'booking', (qt ->> 'total')::int, b.id::text);
  end if;
  return jsonb_build_object('booking', private.booking_json(b), 'rewards', rw,
    'order', case when b.status = 'requested' then jsonb_build_object('orderNo', v_code, 'amount', (qt ->> 'total')::int, 'orderName', '플레이션 ' || (st ->> 'short') || ' 예약') end);
end $$;

create or replace function public.plt_find_booking(p_code text, p_phone text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare b private.bookings;
begin
  select * into b from private.bookings x where x.code = upper(trim(p_code)) and x.phone = private.clean_phone(p_phone);
  if b.id is null then perform private.fail('예약을 찾지 못했어요. 예약번호와 전화번호를 확인해 주세요.'); end if;
  return private.booking_json(b);
end $$;

create or replace function public.plt_cancel_booking(p_id uuid, p_phone text default null) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := auth.uid(); b private.bookings; days int; rate numeric; m private.members; v_ok boolean;
begin
  select * into b from private.bookings x where x.id = p_id for update;
  if u is not null then select * into m from private.members where members.id = u; end if;
  v_ok := (u is not null and b.member_id is not null and b.member_id = u)
       or (m.id is not null and b.phone = m.phone)
       or (p_phone is not null and private.clean_phone(p_phone) <> '' and b.phone = private.clean_phone(p_phone));
  if b.id is null or not coalesce(v_ok, false) then perform private.fail('예약을 찾지 못했어요.'); end if;
  if b.status in ('cancelled', 'expired') then perform private.fail('이미 취소한 예약이에요.'); end if;
  if b.status <> 'requested' and b.status <> 'confirmed' then perform private.fail('지금 상태에서는 취소할 수 없어요.'); end if;
  days := b.date - private.today();
  rate := case when b.status = 'requested' then 1 when days >= 7 then 1 when days >= 5 then 0.7 when days >= 3 then 0.5 else 0 end;
  if rate = 0 then perform private.fail('이용 2일 전부터는 취소할 수 없어요. 3일 전까지 요청하면 일정 변경은 가능해요.'); end if;
  update private.bookings set status = 'cancelled', cancelled_at = now(), refund_rate = rate,
    refund = case when b.status = 'requested' then 0 else round((b.quote ->> 'pay')::int * rate) + (b.quote ->> 'deposit')::int end where bookings.id = b.id returning * into b;
  update private.orders set status = 'cancelled' where order_no = b.code and status = 'pending';
  if b.member_id is not null then
    delete from private.ledger where ref = b.id::text and type in ('booking', 'option');
    if (b.quote ->> 'usePoints')::int > 0 then perform private.ledger_add(b.member_id, 'refund', '취소 환급 ' || b.code, round((b.quote ->> 'usePoints')::int * rate)::int); end if;
    if (b.quote ->> 'useCoins')::int > 0 then perform private.ledger_add(b.member_id, 'refund', '취소 환급 ' || b.code, 0, round((b.quote ->> 'useCoins')::int * rate)::int); end if;
    if b.coupon_id is not null and rate = 1 then update private.coupons set used_at = null where coupons.id = b.coupon_id; end if;
    perform private.note(b.member_id, '예약을 취소했어요', b.code || ' · 환불 ' || to_char(coalesce(b.refund, 0), 'FM999,999,999') || '원');
  end if;
  return private.booking_json(b);
end $$;

create or replace function public.plt_review(r jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); b private.bookings; m private.members; ps jsonb := private.rules() -> 'pass' -> 'points'; rv private.reviews; photo boolean := coalesce((r ->> 'photo')::boolean, false);
begin
  select * into b from private.bookings where id = (r ->> 'bookingId')::uuid and member_id = u;
  if b.id is null then perform private.fail('예약을 찾지 못했어요.'); end if;
  if b.status not in ('confirmed', 'done') or b.date > private.today() then perform private.fail('이용한 뒤에 후기를 남길 수 있어요.'); end if;
  if exists (select 1 from private.reviews where booking_id = b.id) then perform private.fail('이미 후기를 남긴 예약이에요.'); end if;
  if length(trim(coalesce(r ->> 'text', ''))) < 10 then perform private.fail('후기는 10자 이상 적어 주세요.'); end if;
  select * into m from private.members where id = u;
  insert into private.reviews (member_id, nick, booking_id, station_id, rating, text, photo)
    values (u, coalesce(nullif(m.nick, ''), '회원'), b.id, b.station_id, greatest(1, least(5, private.jint(r, 'rating', 5))), left(trim(r ->> 'text'), 500), photo) returning * into rv;
  perform private.ledger_add(u, 'review', '후기 적립', coalesce((ps ->> 'review')::int, 0) + case when photo then coalesce((ps ->> 'photoReview')::int, 0) else 0 end);
  return jsonb_build_object('id', rv.id, 'rating', rv.rating);
end $$;

create or replace function public.plt_reviews(p_station text) returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nick', nick, 'stationId', station_id, 'rating', rating, 'text', text, 'photo', photo, 'at', private.ts(at),
    'bookingId', case when member_id = auth.uid() then booking_id end) order by at desc), '[]')
  from (select * from private.reviews where status = 'approved' and (coalesce(p_station, '') = '' or station_id = p_station) order by at desc limit 60) r
$$;

-- ---------------------------------------------------------------------
--  결제 (토스페이먼츠) — 주문 만들기와 승인 반영
-- ---------------------------------------------------------------------
create or replace function public.plt_order_create(p_kind text, p_ref jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); ps jsonb := private.rules() -> 'pass'; pkg jsonb; v_no text; amt int; cn int := 0; v_name text;
begin
  if p_kind = 'coin' then
    pkg := ps -> 'coins' -> 'packages' -> private.jint(p_ref, 'index', -1);
    if pkg is null then perform private.fail('충전 상품을 골라 주세요.'); end if;
    amt := (pkg ->> 'pay')::int; cn := (pkg ->> 'coin')::int; v_name := '플레이 코인 ' || to_char(cn, 'FM999,999') || 'C';
  elsif p_kind = 'plus' then
    amt := (ps -> 'plus' ->> 'price')::int; v_name := 'PASS+ 30일';
  else perform private.fail('알 수 없는 주문이에요.'); end if;
  loop v_no := upper(p_kind) || to_char(now() at time zone 'Asia/Seoul', 'YYMMDD') || '-' || private.code('', 6); exit when not exists (select 1 from private.orders oo where oo.order_no = v_no); end loop;
  insert into private.orders (order_no, member_id, kind, amount, coin) values (v_no, u, p_kind, amt, cn);
  return jsonb_build_object('orderNo', v_no, 'amount', amt, 'orderName', v_name, 'customerKey', u);
end $$;

create or replace function public.plt_order_peek(p_order_no text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare o private.orders; ready boolean;
begin
  perform private.expire_holds();
  select * into o from private.orders x where x.order_no = p_order_no;
  if o.order_no is null then return null; end if;
  ready := o.status = 'pending' and (o.kind <> 'booking' or exists (select 1 from private.bookings b where b.id = o.ref::uuid and b.status = 'requested'));
  return jsonb_build_object('orderNo', o.order_no, 'amount', o.amount, 'status', o.status, 'kind', o.kind, 'ready', ready);
end $$;

-- 결제 승인이 끝난 뒤 서버(Cloudflare 함수)만 부릅니다
create or replace function public.plt_pay_confirm(p_order_no text, p_payment_key text, p_amount int) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare o private.orders; b private.bookings; rw jsonb := '[]'::jsonb; w jsonb; ps jsonb := private.rules() -> 'pass';
begin
  select * into o from private.orders x where x.order_no = p_order_no for update;
  if o.order_no is null then perform private.fail('주문을 찾지 못했어요.'); end if;
  if o.status = 'paid' then
    if o.kind = 'booking' then select * into b from private.bookings where id = o.ref::uuid; return jsonb_build_object('kind', o.kind, 'booking', private.booking_json(b), 'rewards', '[]'::jsonb, 'already', true); end if;
    return jsonb_build_object('kind', o.kind, 'already', true);
  end if;
  if o.amount <> p_amount then perform private.fail('결제 금액이 주문과 달라요.'); end if;
  update private.orders oo set status = 'paid', payment_key = p_payment_key, paid_at = now() where oo.order_no = o.order_no;
  if o.kind = 'booking' then
    update private.bookings bb set status = 'confirmed', pay_method = 'toss', payment_key = p_payment_key where bb.id = o.ref::uuid and bb.status = 'requested' returning * into b;
    if b.id is null then
      update private.orders oo set status = 'failed' where oo.order_no = o.order_no;
      select * into b from private.bookings where id = o.ref::uuid;
      return jsonb_build_object('kind', o.kind, 'booking', private.booking_json(b), 'rewards', rw, 'needsRefund', true);
    end if;
    rw := private.confirm_effects(b.id);
    return jsonb_build_object('kind', o.kind, 'booking', private.booking_json(b), 'rewards', rw);
  elsif o.kind = 'coin' then
    w := private.wallet(o.member_id);
    perform private.ledger_add(o.member_id, 'charge', '코인 충전 ' || to_char(o.amount, 'FM999,999') || '원', floor(o.amount * (w ->> 'earnRate')::int / 100.0)::int, o.coin, floor(o.amount / 1000.0)::int * coalesce((ps -> 'xp' ->> 'perThousandWon')::int, 1), o.order_no);
    perform private.note(o.member_id, '코인을 충전했어요', to_char(o.coin, 'FM999,999') || 'C (결제 ' || to_char(o.amount, 'FM999,999') || '원)');
  elsif o.kind = 'plus' then
    update private.members set plus_until = greatest(now(), coalesce(plus_until, now())) + interval '30 days', plus_auto = false where id = o.member_id;
    perform private.ledger_add(o.member_id, 'plus', 'PASS+ 30일 코인', 0, 5000, floor(o.amount / 1000.0)::int, o.order_no);
    perform private.note(o.member_id, 'PASS+ 30일을 더했어요', '플레이 코인 5,000C를 넣어 드렸어요. ' || to_char((select plus_until from private.members where id = o.member_id) at time zone 'Asia/Seoul', 'FMMM"월" FMDD"일"') || '까지 쓸 수 있어요.');
  end if;
  return jsonb_build_object('kind', o.kind, 'me', private.me_json(o.member_id));
end $$;

-- ---------------------------------------------------------------------
--  가챠
-- ---------------------------------------------------------------------
create or replace function public.plt_series_overlay() returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(jsonb_object_agg(series_id, jsonb_strip_nulls(jsonb_build_object('status', status, 'checkedAt', private.ts(checked_at), 'onlineSold', online_sold))), '{}') from private.series_status
$$;
create or replace function public.plt_arrivals() returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'date', to_char(date, 'YYYY-MM-DD'), 'series', to_jsonb(series), 'note', note) order by date), '[]') from private.arrivals where date >= private.today() - 60
$$;
create or replace function public.plt_subscribe(p_series_id text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need();
begin
  delete from private.subs s where s.member_id = u and s.series_id = p_series_id;
  if found then return jsonb_build_object('on', false); end if;
  if private.series(p_series_id) is null then perform private.fail('시리즈를 찾지 못했어요.'); end if;
  insert into private.subs (member_id, series_id) values (u, p_series_id);
  return jsonb_build_object('on', true);
end $$;
create or replace function public.plt_draw(p_series_id text, p_cnt int, p_coupon_id text default '') returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare cnt int; u uuid := private.need(); s jsonb := private.series(p_series_id); g jsonb := private.rules() -> 'gacha' -> 'online'; sold int; lft int; cost int; cp private.coupons; items jsonb := '[]'::jsonb; i int; idx int; nm text; bx private.box; n int;
begin
  if s is null or not coalesce((s ->> 'online')::boolean, false) then perform private.fail('온라인으로 뽑을 수 없는 시리즈예요.'); end if;
  cnt := greatest(1, least(coalesce((g ->> 'maxPerDraw')::int, 10), coalesce(p_cnt, 1)));
  perform pg_advisory_xact_lock(hashtext('draw' || p_series_id));
  insert into private.series_status as ss (series_id) values (p_series_id) on conflict on constraint series_status_pkey do nothing;
  select ss.online_sold into sold from private.series_status ss where ss.series_id = p_series_id for update;
  lft := coalesce((s ->> 'onlineStock')::int, 0) - sold;
  if lft < cnt then perform private.fail(case when lft > 0 then '남은 수량은 ' || lft || '개예요.' else '온라인 수량이 모두 나갔어요.' end); end if;
  cost := (s ->> 'price')::int * cnt;
  if coalesce(p_coupon_id, '') <> '' then
    select * into cp from private.coupons c where c.id = p_coupon_id::uuid and c.member_id = u and c.used_at is null and c.expires_at > now() and c.kind = 'draw';
    if cp.id is null then perform private.fail('쓸 수 없는 쿠폰이에요.'); end if;
    cost := greatest(0, cost - (s ->> 'price')::int);
  end if;
  if (private.wallet(u) ->> 'coins')::int < cost then perform private.fail('코인이 ' || to_char(cost - (private.wallet(u) ->> 'coins')::int, 'FM999,999') || 'C 부족해요.'); end if;
  if cp.id is not null then update private.coupons set used_at = now() where id = cp.id; end if;
  if cost > 0 then perform private.ledger_add(u, 'draw', (s ->> 'name') || ' ' || cnt || '회', 0, -cost, floor(cost / 1000.0)::int, p_series_id); end if;
  n := jsonb_array_length(s -> 'lineup');
  for i in 1..cnt loop
    idx := floor(random() * n)::int; nm := s -> 'lineup' ->> idx;
    insert into private.box (member_id, series_id, idx, item) values (u, p_series_id, idx, nm) returning * into bx;
    insert into private.collection (member_id, series_id, idx) values (u, p_series_id, idx) on conflict do nothing;
    items := items || jsonb_build_array(jsonb_build_object('id', bx.id, 'seriesId', p_series_id, 'idx', idx, 'item', nm, 'at', private.ts(bx.at), 'status', 'stored'));
  end loop;
  update private.series_status ss set online_sold = ss.online_sold + cnt where ss.series_id = p_series_id;
  return jsonb_build_object('items', items, 'cost', cost, 'me', private.me_json(u));
end $$;
create or replace function public.plt_box_action(ids uuid[], action text, opt jsonb default '{}'::jsonb) returns boolean language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); n int; g jsonb := private.rules() -> 'gacha' -> 'online'; w jsonb; fee int; v_code text; s jsonb; items text; first_series text; m private.members;
begin
  select count(*) into n from private.box where member_id = u and id = any (ids) and status = 'stored';
  if n = 0 then perform private.fail('보관함에 있는 상품을 골라 주세요.'); end if;
  if action = 'pickup' then
    v_code := private.code('PK', 5);
    update private.box set status = 'pickup', code = v_code, updated_at = now() where member_id = u and id = any (ids) and status = 'stored';
    perform private.note(u, '매장 수령 준비 중', n || '개 · 수령 코드 ' || v_code);
  elsif action = 'ship' then
    if length(trim(coalesce(opt ->> 'address', ''))) < 6 then perform private.fail('받을 주소를 적어 주세요.'); end if;
    w := private.wallet(u); fee := coalesce((g ->> 'shippingFee')::int, 0);
    if n >= coalesce((g ->> 'freeShipOver')::int, 999) then fee := 0; end if;
    if (w ->> 'isPlus')::boolean and not exists (select 1 from private.box where member_id = u and free_ship and date_trunc('month', updated_at) = date_trunc('month', now())) then
      fee := 0; update private.box set free_ship = true where id = (select id from private.box where member_id = u and id = any (ids) and status = 'stored' limit 1);
    end if;
    if (w ->> 'coins')::int < fee then perform private.fail('배송비 ' || to_char(fee, 'FM999,999') || 'C가 부족해요. 코인을 충전해 주세요.'); end if;
    if fee > 0 then perform private.ledger_add(u, 'ship', '보관함 배송비', 0, -fee); end if;
    update private.box set status = 'ship', address = left(trim(opt ->> 'address'), 120), updated_at = now() where member_id = u and id = any (ids) and status = 'stored';
    perform private.note(u, '배송 신청을 받았어요', n || '개 · 배송비 ' || to_char(fee, 'FM999,999') || 'C');
  elsif action = 'market' then
    select string_agg(item, ', '), min(series_id) into items, first_series from private.box where member_id = u and id = any (ids) and status = 'stored';
    s := private.series(first_series); select * into m from private.members where id = u;
    update private.box set status = 'listed', updated_at = now() where member_id = u and id = any (ids) and status = 'stored';
    insert into private.posts (member_id, nick, type, title, series_id, have, want, price, method, condition)
      values (u, coalesce(nullif(m.nick, ''), '회원'), coalesce(nullif(opt ->> 'type', ''), 'swap'), left(coalesce(s ->> 'name', '수집품') || ' ' || items, 60), first_series, left(items, 120), left(coalesce(opt ->> 'want', ''), 120), private.jint(opt, 'price'), coalesce(nullif(opt ->> 'method', ''), 'locker'), '미개봉');
  else perform private.fail('알 수 없는 요청이에요.'); end if;
  return true;
end $$;
create or replace function public.plt_toggle_item(p_series_id text, p_idx int) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); s jsonb := private.series(p_series_id); arr jsonb;
begin
  if s is null or p_idx < 0 or p_idx >= jsonb_array_length(s -> 'lineup') then perform private.fail('종류를 찾지 못했어요.'); end if;
  delete from private.collection c where c.member_id = u and c.series_id = p_series_id and c.idx = p_idx;
  if not found then
    insert into private.collection (member_id, series_id, idx) values (u, p_series_id, p_idx);
    if (select count(*) from private.collection c where c.member_id = u and c.series_id = p_series_id) = jsonb_array_length(s -> 'lineup') then
      perform private.note(u, '시리즈를 완성했어요', (s ->> 'name') || ' 컬렉션 완성! 매장 컴플리트 인증을 하면 한정 캡슐을 드려요.');
    end if;
  end if;
  select coalesce(jsonb_agg(c.idx order by c.idx), '[]') into arr from private.collection c where c.member_id = u and c.series_id = p_series_id;
  return arr;
end $$;

-- ---------------------------------------------------------------------
--  마켓
-- ---------------------------------------------------------------------
create or replace function private.post_json(p private.posts) returns jsonb language sql stable as $$
  select jsonb_build_object('id', p.id, 'memberId', p.member_id, 'nick', p.nick, 'type', p.type, 'title', p.title, 'seriesId', p.series_id, 'have', p.have, 'want', p.want,
    'price', p.price, 'method', p.method, 'condition', p.condition, 'body', p.body, 'status', p.status, 'createdAt', private.ts(p.created_at))
$$;
create or replace function public.plt_posts(f jsonb default '{}'::jsonb) returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(jsonb_agg(private.post_json(p) order by p.created_at desc), '[]') from (
    select * from private.posts p where p.status <> 'hidden'
      and (coalesce(f ->> 'type', '') = '' or p.type = f ->> 'type')
      and (coalesce(f ->> 'seriesId', '') = '' or p.series_id = f ->> 'seriesId')
      and (coalesce(f ->> 'q', '') = '' or (p.title || ' ' || p.have || ' ' || p.want) ilike '%' || (f ->> 'q') || '%')
      and (not coalesce((f ->> 'mine')::boolean, false) or p.member_id = auth.uid())
    order by p.created_at desc limit 100) p
$$;
create or replace function public.plt_post(p_id uuid) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare p private.posts;
begin select * into p from private.posts x where x.id = p_id and x.status <> 'hidden'; if p.id is null then perform private.fail('글을 찾지 못했어요.'); end if; return private.post_json(p); end $$;
create or replace function public.plt_create_post(d jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); m private.members; p private.posts; ty text := d ->> 'type';
begin
  select * into m from private.members where id = u;
  if ty not in ('sell', 'swap', 'want') then perform private.fail('글 종류를 골라 주세요.'); end if;
  if length(trim(coalesce(d ->> 'title', ''))) < 4 then perform private.fail('제목을 4자 이상 적어 주세요.'); end if;
  if ty = 'sell' and private.jint(d, 'price') <= 0 then perform private.fail('판매 가격을 적어 주세요.'); end if;
  if (coalesce(d ->> 'title', '') || coalesce(d ->> 'body', '')) ~ '(01[0-9][- ]?[0-9]{3,4}[- ]?[0-9]{4})|(오픈채팅|카톡 ?아이디|계좌)' then perform private.fail('연락처나 계좌는 글에 적지 말고 쪽지로 주고받아 주세요.'); end if;
  if (select count(*) from private.posts where member_id = u and created_at > now() - interval '1 hour') >= 10 then perform private.fail('글은 한 시간에 10개까지 올릴 수 있어요.'); end if;
  insert into private.posts (member_id, nick, type, title, series_id, have, want, price, method, condition, body)
    values (u, coalesce(nullif(m.nick, ''), '회원'), ty, left(trim(d ->> 'title'), 60), coalesce(d ->> 'seriesId', ''), left(coalesce(d ->> 'have', ''), 120), left(coalesce(d ->> 'want', ''), 120),
      case when ty = 'swap' then 0 else greatest(0, private.jint(d, 'price')) end, coalesce(nullif(d ->> 'method', ''), 'meet'), left(coalesce(d ->> 'condition', ''), 40), left(coalesce(d ->> 'body', ''), 1000))
    returning * into p;
  return private.post_json(p);
end $$;
create or replace function public.plt_update_post(p_id uuid, patch jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.posts;
begin
  update private.posts x set status = case when patch ->> 'status' in ('open', 'reserved', 'done', 'hidden') then patch ->> 'status' else x.status end,
    price = case when patch ? 'price' then greatest(0, private.jint(patch, 'price')) else x.price end,
    title = case when patch ? 'title' and length(trim(patch ->> 'title')) >= 4 then left(trim(patch ->> 'title'), 60) else x.title end,
    body = case when patch ? 'body' then left(coalesce(patch ->> 'body', ''), 1000) else x.body end
  where x.id = p_id and x.member_id = u returning * into p;
  if p.id is null then perform private.fail('내가 쓴 글만 바꿀 수 있어요.'); end if;
  return private.post_json(p);
end $$;
create or replace function public.plt_messages(p_post_id uuid) returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'postId', m.post_id, 'fromId', m.from_id, 'toId', m.to_id, 'nick', m.nick, 'text', m.text, 'at', private.ts(m.at)) order by m.at), '[]')
  from private.messages m join private.posts p on p.id = m.post_id
  where m.post_id = p_post_id and auth.uid() is not null and (m.from_id = auth.uid() or m.to_id = auth.uid() or p.member_id = auth.uid())
$$;
create or replace function public.plt_send_message(p_post_id uuid, p_text text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.posts; m private.members; v_to uuid;
begin
  if length(trim(coalesce(p_text, ''))) = 0 then perform private.fail('내용을 적어 주세요.'); end if;
  select * into p from private.posts x where x.id = p_post_id;
  if p.id is null then perform private.fail('글을 찾지 못했어요.'); end if;
  if (select count(*) from private.messages mg where mg.from_id = u and mg.at > now() - interval '10 minutes') >= 30 then perform private.fail('쪽지를 너무 빨리 보내고 있어요. 잠시 뒤에 다시 보내 주세요.'); end if;
  select * into m from private.members mm where mm.id = u;
  if p.member_id is not null and p.member_id <> u then v_to := p.member_id;
  else select mg.from_id into v_to from private.messages mg where mg.post_id = p.id and mg.from_id <> u order by mg.at desc limit 1; end if;
  insert into private.messages (post_id, from_id, to_id, nick, text) values (p.id, u, v_to, coalesce(nullif(m.nick, ''), '회원'), left(trim(p_text), 500));
  if v_to is not null then perform private.note(v_to, '쪽지가 왔어요', p.title, 'gacha/market?id=' || p.id); end if;
  return jsonb_build_object('ok', true);
end $$;
create or replace function public.plt_request_trade(p_post_id uuid, p_method text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.posts; mk jsonb := private.rules() -> 'gacha' -> 'market'; fee int; t private.trades;
begin
  select * into p from private.posts x where x.id = p_post_id for update;
  if p.id is null or p.type <> 'sell' or p.method = 'meet' then perform private.fail('안전거래를 고른 판매 글에서만 결제할 수 있어요.'); end if;
  if p.member_id = u then perform private.fail('내 글은 구매할 수 없어요.'); end if;
  if p.status <> 'open' or exists (select 1 from private.trades tt where tt.post_id = p.id and tt.status <> 'cancelled') then perform private.fail('이미 거래가 진행 중인 글이에요.'); end if;
  if (private.wallet(u) ->> 'coins')::int < p.price then perform private.fail('코인이 ' || to_char(p.price - (private.wallet(u) ->> 'coins')::int, 'FM999,999') || 'C 부족해요. 충전 후 다시 시도해 주세요.'); end if;
  fee := greatest(coalesce((mk ->> 'feeMin')::int, 0), round(p.price * coalesce((mk ->> 'feeRate')::numeric, 0))::int);
  insert into private.trades (post_id, title, buyer_id, seller_id, price, fee, method, code) values (p.id, p.title, u, p.member_id, p.price, fee, p.method, private.code('LK', 5)) returning * into t;
  perform private.ledger_add(u, 'trade', '안전거래 결제 · ' || p.title, 0, -p.price, 0, t.id::text);
  update private.posts set status = 'reserved' where id = p.id;
  perform private.note(u, '안전거래 결제를 마쳤어요', '판매자가 ' || case when t.method = 'locker' then '매장 보관함에 넣으면' else '보내면' end || ' 알려 드릴게요.');
  perform private.note(t.seller_id, '판매 글에 결제가 들어왔어요', p.title || ' · 3일 안에 ' || case when t.method = 'locker' then '가챠샵 보관함에 넣어 주세요.' else '택배로 보내 주세요.' end);
  return jsonb_build_object('id', t.id, 'status', t.status, 'code', t.code);
end $$;
create or replace function public.plt_trade_action(p_id uuid, p_action text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := auth.uid(); t private.trades; staff boolean := private.is_staff();
begin
  select * into t from private.trades x where x.id = p_id for update;
  if t.id is null then perform private.fail('거래를 찾지 못했어요.'); end if;
  if p_action = 'dropped' and t.status = 'paid' and (staff or t.seller_id = u) then
    update private.trades set status = 'dropped' where trades.id = t.id;
    perform private.note(t.buyer_id, case when t.method = 'locker' then '보관함에 도착했어요' else '상품이 출발했어요' end, t.title || case when t.method = 'locker' then ' · 수령 코드 ' || t.code else '' end);
  elsif p_action = 'received' and t.status = 'dropped' and t.buyer_id = u then
    update private.trades set status = 'done', done_at = now() where trades.id = t.id;
    if t.seller_id is not null then
      perform private.ledger_add(t.seller_id, 'trade', '판매 정산 · ' || t.title, 0, t.price - t.fee, 0, t.id::text);
      perform private.note(t.seller_id, '판매 대금이 정산됐어요', to_char(t.price - t.fee, 'FM999,999') || 'C (수수료 ' || to_char(t.fee, 'FM999,999') || 'C)');
    end if;
    update private.posts set status = 'done' where posts.id = t.post_id;
  elsif p_action = 'cancel' and t.status = 'paid' and (staff or t.buyer_id = u or t.seller_id = u) then
    update private.trades set status = 'cancelled' where trades.id = t.id;
    perform private.ledger_add(t.buyer_id, 'refund', '안전거래 취소 환불', 0, t.price, 0, t.id::text);
    update private.posts set status = 'open' where posts.id = t.post_id;
    perform private.note(t.buyer_id, '안전거래가 취소됐어요', to_char(t.price, 'FM999,999') || 'C를 돌려드렸어요.');
  else perform private.fail('지금 단계에서는 할 수 없는 요청이에요.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
--  행사·문의·상담 (로그인 없이도 받습니다)
-- ---------------------------------------------------------------------
create or replace function public.plt_register(p_event_id text, d jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := auth.uid(); m private.members; ph text; r private.regs;
begin
  if u is not null then select * into m from private.members where id = u; end if;
  ph := coalesce(m.phone, private.clean_phone(d ->> 'phone'));
  if not private.valid_phone(ph) then perform private.fail('휴대폰 번호를 확인해 주세요.'); end if;
  if exists (select 1 from private.regs x where x.event_id = p_event_id and x.phone = ph and x.status <> 'cancelled') then perform private.fail('이미 신청한 행사예요.'); end if;
  insert into private.regs (event_id, member_id, name, phone, people, memo) values (left(p_event_id, 40), m.id, left(coalesce(nullif(d ->> 'name', ''), m.name, m.nick, ''), 20), ph, greatest(1, least(10, private.jint(d, 'people', 1))), left(coalesce(d ->> 'memo', ''), 300)) returning * into r;
  if m.id is not null then perform private.note(m.id, '행사 신청을 받았어요', ''); end if;
  return jsonb_build_object('id', r.id);
end $$;
create or replace function public.plt_lead(d jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare ph text := private.clean_phone(d ->> 'phone'); l private.leads;
begin
  if length(trim(coalesce(d ->> 'name', ''))) = 0 or not private.valid_phone(ph) then perform private.fail('이름과 연락처를 확인해 주세요.'); end if;
  if (select count(*) from private.leads where phone = ph and at > now() - interval '1 hour') >= 3 then perform private.fail('이미 신청을 받았어요. 곧 연락드릴게요.'); end if;
  insert into private.leads (kind, name, phone, email, company, region, area, budget, has_space, message)
    values (left(coalesce(nullif(d ->> 'kind', ''), 'general'), 20), left(trim(d ->> 'name'), 30), ph, left(coalesce(d ->> 'email', ''), 80), left(coalesce(d ->> 'company', ''), 40), left(coalesce(d ->> 'region', ''), 40),
      left(coalesce(d ->> 'area', ''), 10), left(coalesce(d ->> 'budget', ''), 30), left(coalesce(d ->> 'hasSpace', ''), 10), left(coalesce(d ->> 'message', ''), 1500)) returning * into l;
  return jsonb_build_object('id', l.id);
end $$;
create or replace function public.plt_inquiry(d jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := auth.uid(); ph text; x private.inquiries;
begin
  if length(trim(coalesce(d ->> 'text', '') || coalesce(d ->> 'kind', ''))) < 5 then perform private.fail('문의 내용을 조금 더 적어 주세요.'); end if;
  ph := private.clean_phone(coalesce(nullif(d ->> 'contact', ''), (select phone from private.members where id = u)));
  insert into private.inquiries (type, kind, machine, text, contact, member_id)
    values (left(coalesce(nullif(d ->> 'type', ''), 'general'), 20), left(coalesce(d ->> 'kind', ''), 60), left(coalesce(d ->> 'machine', ''), 20), left(coalesce(d ->> 'text', ''), 1500), ph, u) returning * into x;
  return jsonb_build_object('id', x.id);
end $$;

-- ---------------------------------------------------------------------
--  운영 콘솔 (private.staff 에 등록된 계정만)
-- ---------------------------------------------------------------------
create or replace function public.plt_admin_check() returns boolean language sql security definer set search_path = private, public, pg_temp as $$ select private.is_staff() $$;
create or replace function public.plt_admin_stats() returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare days jsonb := '[]'::jsonb; d date; total int; v_both int;
begin
  perform private.need_staff();
  for d in select generate_series(private.today() - 13, private.today(), interval '1 day')::date loop
    days := days || jsonb_build_array(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'),
      'bookings', (select count(*) from private.bookings where (created_at at time zone 'Asia/Seoul')::date = d and status not in ('cancelled', 'expired')),
      'checkins', (select count(*) from private.checkins where day = d),
      'members', (select count(*) from private.members where (created_at at time zone 'Asia/Seoul')::date = d)));
  end loop;
  select count(*) into total from private.members;
  select count(*) into v_both from private.members m where exists (select 1 from private.bookings b where b.member_id = m.id and b.status in ('confirmed', 'done'))
    and (exists (select 1 from private.checkins c where c.member_id = m.id) or exists (select 1 from private.box x where x.member_id = m.id));
  return jsonb_build_object('members', total,
    'bookings', (select count(*) from private.bookings where status in ('confirmed', 'done', 'requested')),
    'upcoming', (select count(*) from private.bookings where status in ('confirmed', 'requested') and date >= private.today()),
    'revenue', (select coalesce(sum((quote ->> 'pay')::int), 0) from private.bookings where status in ('confirmed', 'done')),
    'checkinsToday', (select count(*) from private.checkins where day = private.today()),
    'draws', (select count(*) from private.box), 'coinsOutstanding', (select coalesce(sum(coins), 0) from private.ledger),
    'transferRate', case when total > 0 then round(v_both * 100.0 / total) else 0 end,
    'leadsNew', (select count(*) from private.leads where status = 'new'), 'inquiriesOpen', (select count(*) from private.inquiries where status = 'open'),
    'tradesOpen', (select count(*) from private.trades where status in ('paid', 'dropped')), 'days', days);
end $$;
create or replace function public.plt_admin_list(p_kind text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
begin
  perform private.need_staff();
  if p_kind = 'bookings' then return coalesce((select jsonb_agg(private.booking_json(b) order by b.date desc) from (select * from private.bookings bb where bb.date >= private.today() - 120 order by bb.date desc limit 2000) b), '[]');
  elsif p_kind = 'members' then return coalesce((select jsonb_agg(private.me_json(m.id) order by m.created_at desc) from (select mm.id, mm.created_at from private.members mm order by mm.created_at desc limit 1000) m), '[]');
  elsif p_kind = 'leads' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind, 'name', x.name, 'phone', x.phone, 'email', x.email, 'company', x.company, 'region', x.region, 'area', x.area, 'budget', x.budget, 'hasSpace', x.has_space, 'message', x.message, 'status', x.status, 'at', private.ts(x.at)) order by x.at desc) from private.leads x), '[]');
  elsif p_kind = 'inquiries' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'type', x.type, 'kind', x.kind, 'machine', x.machine, 'text', x.text, 'contact', x.contact, 'status', x.status, 'at', private.ts(x.at)) order by x.at desc) from private.inquiries x), '[]');
  elsif p_kind = 'posts' then return coalesce((select jsonb_agg(private.post_json(p) order by p.created_at desc) from private.posts p), '[]');
  elsif p_kind = 'trades' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'postId', x.post_id, 'title', x.title, 'price', x.price, 'fee', x.fee, 'method', x.method, 'status', x.status, 'code', x.code, 'at', private.ts(x.at)) order by x.at desc) from private.trades x), '[]');
  elsif p_kind = 'regs' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'eventId', x.event_id, 'name', x.name, 'phone', x.phone, 'people', x.people, 'memo', x.memo, 'status', x.status, 'at', private.ts(x.at)) order by x.at desc) from private.regs x), '[]');
  elsif p_kind = 'box' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'memberId', x.member_id, 'seriesId', x.series_id, 'item', x.item, 'status', x.status, 'code', x.code, 'address', x.address, 'at', private.ts(x.at), 'updatedAt', private.ts(x.updated_at)) order by x.at desc) from private.box x where x.status in ('pickup', 'ship')), '[]');
  elsif p_kind = 'arrivals' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'date', to_char(x.date, 'YYYY-MM-DD'), 'series', to_jsonb(x.series), 'note', x.note, 'at', private.ts(x.at)) order by x.at desc) from private.arrivals x), '[]');
  elsif p_kind = 'reviews' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nick', x.nick, 'stationId', x.station_id, 'rating', x.rating, 'text', x.text, 'status', x.status, 'at', private.ts(x.at)) order by x.at desc) from private.reviews x), '[]');
  elsif p_kind = 'subs' then return coalesce((select jsonb_object_agg(c.series_id, c.n) from (select x.series_id, count(*) n from private.subs x group by x.series_id) c), '{}');
  end if;
  return '[]';
end $$;
create or replace function public.plt_admin_update(p_kind text, p_id text, patch jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare st text := patch ->> 'status'; mid uuid; v_item text;
begin
  perform private.need_staff();
  if p_kind = 'bookings' and st in ('requested', 'confirmed', 'done', 'noshow', 'cancelled') then
    if st = 'confirmed' and exists (select 1 from private.bookings bb where bb.id = p_id::uuid and bb.status = 'requested') then
      update private.bookings bb set status = 'confirmed', pay_method = 'manual' where bb.id = p_id::uuid;
      update private.orders oo set status = 'paid', paid_at = now() where oo.ref = p_id and oo.status = 'pending';
      perform private.confirm_effects(p_id::uuid);
    else update private.bookings bb set status = st where bb.id = p_id::uuid; end if;
  elsif p_kind = 'leads' and st in ('new', 'contacted', 'meeting', 'won', 'lost') then update private.leads x set status = st where x.id = p_id::uuid;
  elsif p_kind = 'inquiries' and st in ('open', 'doing', 'done') then update private.inquiries x set status = st where x.id = p_id::uuid;
  elsif p_kind = 'posts' and st in ('open', 'reserved', 'done', 'hidden') then update private.posts x set status = st where x.id = p_id::uuid;
  elsif p_kind = 'reviews' and st in ('approved', 'hidden') then update private.reviews x set status = st where x.id = p_id::uuid;
  elsif p_kind = 'box' and st = 'done' then
    update private.box x set status = 'done', updated_at = now() where x.id = p_id::uuid returning x.member_id, x.item into mid, v_item;
    perform private.note(mid, '보관함 상품을 전달했어요', v_item);
  else perform private.fail('바꿀 수 없는 항목이에요.'); end if;
  return jsonb_build_object('ok', true);
end $$;
create or replace function public.plt_admin_add_booking(q jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare st jsonb := private.station(q ->> 'stationId'); t jsonb := private.ptime(q ->> 'timeId'); d date := (q ->> 'date')::date; sp int[]; qt jsonb; b private.bookings; ch text := coalesce(nullif(q ->> 'channel', ''), 'naver'); ph text := private.clean_phone(q ->> 'phone');
begin
  perform private.need_staff();
  if st is null or t is null or d is null then perform private.fail('지점·날짜·타임을 확인해 주세요.'); end if;
  sp := private.span(q ->> 'timeId', private.jint(q, 'startHour'), private.jint(q, 'hours', 2));
  if not private.is_free(st ->> 'id', d, sp) then perform private.fail('이미 예약이 있는 시간이에요.'); end if;
  qt := private.quote(q, '{}'::jsonb);
  insert into private.bookings (code, member_id, name, phone, station_id, date, time_id, start_hour, hours, span_start, span_end, people, quote, status, channel, memo)
    values ((case when ch = 'block' then 'BL' else 'EX' end) || to_char(d, 'YYMMDD') || '-' || private.code('', 4), (select id from private.members where phone = ph and ph <> ''), left(coalesce(q ->> 'name', ''), 20), ph,
      st ->> 'id', d, q ->> 'timeId', sp[1], (qt ->> 'hours')::int, sp[1], sp[2], greatest(1, private.jint(q, 'people', 4)), qt, 'confirmed', ch, left(coalesce(q ->> 'memo', ''), 200)) returning * into b;
  return private.booking_json(b);
end $$;
create or replace function public.plt_admin_set_status(p_series_id text, p_status text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
begin
  perform private.need_staff();
  if p_status not in ('sale', 'low', 'soldout', 'check') then perform private.fail('상태를 확인해 주세요.'); end if;
  insert into private.series_status as ss (series_id, status, checked_at) values (p_series_id, p_status, now()) on conflict on constraint series_status_pkey do update set status = excluded.status, checked_at = now();
  return jsonb_build_object('status', p_status, 'checkedAt', private.ts(now()));
end $$;
create or replace function public.plt_admin_add_arrival(a jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare ids text[] := array(select jsonb_array_elements_text(a -> 'series')); x private.arrivals; s record; sent int := 0;
begin
  perform private.need_staff();
  if (a ->> 'date') is null or coalesce(array_length(ids, 1), 0) = 0 then perform private.fail('날짜와 시리즈를 골라 주세요.'); end if;
  insert into private.arrivals (date, series, note) values ((a ->> 'date')::date, ids, left(coalesce(a ->> 'note', ''), 80)) returning * into x;
  for s in select sb.member_id, sb.series_id from private.subs sb where sb.series_id = any (ids) loop
    perform private.note(s.member_id, '기다리던 시리즈가 들어와요', coalesce(private.series(s.series_id) ->> 'name', '') || ' · ' || to_char(x.date, 'MM"월" DD"일"') || ' 입고', 'gacha/item?id=' || s.series_id);
    sent := sent + 1;
  end loop;
  return jsonb_build_object('notified', sent);
end $$;
create or replace function public.plt_admin_issue_coupon(p_phone text, p_def text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare mid uuid; c jsonb;
begin
  perform private.need_staff();
  select id into mid from private.members where members.phone = private.clean_phone(p_phone);
  if mid is null then perform private.fail('그 번호로 가입한 회원이 없어요.'); end if;
  c := private.issue(mid, p_def, 'admin'); if c is null then perform private.fail('쿠폰 종류를 확인해 주세요.'); end if;
  return c;
end $$;
create or replace function public.plt_admin_stamp(p_phone text, p_store text default 'kd-gacha') returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare mid uuid;
begin
  perform private.need_staff();
  select id into mid from private.members where members.phone = private.clean_phone(p_phone);
  if mid is null then perform private.fail('그 번호로 가입한 회원이 없어요.'); end if;
  return private.add_stamp(mid, 'manual', coalesce(p_store, 'kd-gacha'), 'admin');
end $$;
create or replace function public.plt_admin_sync_rules(rules jsonb) returns boolean language plpgsql security definer set search_path = private, public, pg_temp as $$
begin
  perform private.need_staff();
  if rules -> 'party' is null or rules -> 'pass' is null or rules -> 'stations' is null then perform private.fail('규칙 형식을 확인해 주세요.'); end if;
  insert into private.config (key, value) values ('rules', rules) on conflict (key) do update set value = excluded.value, updated_at = now();
  return true;
end $$;
create or replace function public.plt_admin_set_kiosk_key(p_store text, p_key text) returns boolean language plpgsql security definer set search_path = private, public, pg_temp as $$
begin
  perform private.need_staff();
  if private.station(p_store) is null or length(coalesce(p_key, '')) < 6 then perform private.fail('매장과 6자 이상의 키를 넣어 주세요.'); end if;
  insert into private.kiosk_keys as kk (store, key_hash) values (p_store, encode(sha256(convert_to(p_key, 'UTF8')), 'hex')) on conflict on constraint kiosk_keys_pkey do update set key_hash = excluded.key_hash, updated_at = now();
  return true;
end $$;

-- 알림 발송(Cloudflare 함수)이 받는 사람 정보를 확인할 때 씁니다 — 서버 전용
create or replace function public.plt_notify_target(p_member uuid) returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select jsonb_build_object('phone', m.phone, 'nick', m.nick, 'consents', m.consents) from private.members m where m.id = p_member
$$;

-- ---------------------------------------------------------------------
--  권한: plt_ 함수만 열어 둡니다
-- ---------------------------------------------------------------------
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'plt\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname in ('plt_pay_confirm', 'plt_order_peek', 'plt_notify_target') then
      execute format('grant execute on function %s to service_role', f.sig);
    else
      execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
    end if;
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' loop
    execute format('revoke all on function %s from public', f.sig);
  end loop;
end $$;
