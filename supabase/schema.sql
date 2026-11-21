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
create extension if not exists pgcrypto with schema extensions;   -- 운영자 임시 비밀번호(bcrypt)에 씀

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
  provider text not null default 'id',            -- id(아이디·비밀번호) · kakao · google · phone(예전 휴대폰 가입)
  username text,                                  -- 아이디 (소문자). 소셜 가입은 비어 있어요
  phone text unique,                              -- 예전 휴대폰 가입 회원만
  email text not null default '',                 -- 선택: 비밀번호 재설정 메일을 받을 주소
  gender text not null default '',                -- m · f
  age_group text not null default '',             -- 10s · 20e · 20l · 30s · 40s · 50p
  must_change_pw boolean not null default false,  -- 운영자가 임시 비밀번호를 만들면 true
  recover_sent_at timestamptz,
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
-- 포인트 응모·경품 신청
create table if not exists private.entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references private.members (id) on delete cascade,
  reward_id text not null, kind text not null, title text not null default '',
  qty int not null default 1, cost int not null default 0,
  status text not null default 'applied' check (status in ('applied', 'won', 'lost', 'ready', 'done', 'cancelled')),
  code text not null default '', at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists entries_reward on private.entries (reward_id);
create index if not exists entries_member on private.entries (member_id);
-- 아이디 찾기·비밀번호 재설정 메일 발송 기록 (너무 자주 보내지 않게)
create table if not exists private.mail_log (id bigint generated always as identity primary key, kind text not null, email text not null, at timestamptz not null default now());

-- 예전 휴대폰 가입 표에서 바뀐 것 (이미 만든 DB에 다시 실행해도 안전해요)
alter table private.members add column if not exists provider text not null default 'id';
alter table private.members add column if not exists username text;
alter table private.members add column if not exists email text not null default '';
alter table private.members add column if not exists gender text not null default '';
alter table private.members add column if not exists age_group text not null default '';
alter table private.members add column if not exists must_change_pw boolean not null default false;
alter table private.members add column if not exists recover_sent_at timestamptz;
alter table private.members alter column phone drop not null;
update private.members set provider = 'phone' where provider = 'id' and username is null and phone is not null;
create unique index if not exists members_username on private.members (username) where username is not null;

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
-- 운영 콘솔에서 회원 찾기 — 아이디, 회원 코드, 내부 id, 휴대폰 번호 중 무엇이든
create or replace function private.find_member(k text) returns uuid language sql stable as $$
  select m.id from private.members m
  where m.username = lower(trim(coalesce(k, ''))) or m.code = upper(trim(coalesce(k, ''))) or m.id::text = trim(coalesce(k, ''))
     or (length(private.clean_phone(k)) >= 10 and m.phone = private.clean_phone(k))
  limit 1
$$;
-- 아이디 → 로그인 계정 주소 (data/site.js 의 auth.idDomain 과 같아야 해요)
create or replace function private.id_domain() returns text language sql stable as $$ select coalesce(nullif(private.rules() -> 'auth' ->> 'idDomain', ''), 'id.playtion.kr') $$;

-- 지갑: 포인트·등급·스탬프 (등급은 최근 1년 동안 받은 포인트로)
create or replace function private.wallet(mid uuid) returns jsonb language plpgsql stable as $$
declare r jsonb := private.rules(); ps jsonb := r -> 'pass'; m private.members; v_pts int; v_cns int; v_earn int; v_st int; goal int; plus boolean;
  lv jsonb; nx jsonb; l jsonb; prog numeric; v_att boolean;
begin
  select * into m from private.members where id = mid;
  select coalesce(sum(lg.points), 0), coalesce(sum(lg.coins), 0) into v_pts, v_cns from private.ledger lg where lg.member_id = mid;
  select coalesce(sum(lg.points), 0) into v_earn from private.ledger lg where lg.member_id = mid and lg.points > 0 and lg.type <> 'refund' and lg.at >= now() - interval '365 days';
  select exists (select 1 from private.ledger lg where lg.member_id = mid and lg.type = 'attend' and (lg.at at time zone 'Asia/Seoul')::date = private.today()) into v_att;
  select count(*) into v_st from private.stamps sp where sp.member_id = mid;
  goal := coalesce((ps -> 'stamps' ->> 'goal')::int, 10);
  plus := m.plus_until is not null and m.plus_until > now();
  lv := coalesce(ps -> 'levels' -> 0, '{"id":"rookie","name":"루키","en":"Rookie","min":0}'::jsonb); nx := null;
  for l in select value from jsonb_array_elements(coalesce(ps -> 'levels', '[]'::jsonb)) loop
    if v_earn >= (l ->> 'min')::int then lv := l; nx := null; elsif nx is null then nx := l; end if;
  end loop;
  prog := case when nx is null then 1 else least(1, (v_earn - coalesce((lv ->> 'min')::numeric, 0)) / greatest(1, (nx ->> 'min')::numeric - coalesce((lv ->> 'min')::numeric, 0))) end;
  return jsonb_build_object('points', v_pts, 'coins', v_cns, 'earned', v_earn, 'xp', v_earn, 'level', lv, 'nextLevel', nx, 'progress', prog,
    'toNext', case when nx is null then 0 else (nx ->> 'min')::int - v_earn end,
    'stampsTotal', v_st, 'stamps', v_st % goal, 'stampGoal', goal, 'attendedToday', v_att, 'isPlus', plus, 'plusUntil', private.ts(m.plus_until),
    'earnRate', 0, 'noDeposit', false);
end $$;
create or replace function private.me_json(mid uuid) returns jsonb language sql stable as $$
  select case when m.id is null then null else jsonb_build_object('id', m.id, 'provider', m.provider, 'username', coalesce(m.username, ''), 'phone', coalesce(m.phone, ''),
    'email', m.email, 'gender', m.gender, 'ageGroup', m.age_group, 'nick', m.nick, 'name', m.name, 'birth', m.birth, 'code', m.code,
    'invitedBy', m.invited_by, 'plusAuto', m.plus_auto, 'consents', m.consents, 'mustChangePw', m.must_change_pw, 'createdAt', private.ts(m.created_at),
    'unreadNotes', (select count(*) from private.notes n where n.member_id = m.id and not n.read)) || private.wallet(m.id) end
  from private.members m where m.id = mid
$$;
create or replace function private.ledger_add(mid uuid, t text, memo text, p int default 0, c int default 0, x int default 0, ref text default '') returns void language sql as $$
  insert into private.ledger (member_id, type, memo, points, coins, xp, ref) values (mid, t, coalesce(memo, ''), coalesce(p, 0), coalesce(c, 0), coalesce(x, 0), coalesce(ref, ''))
$$;
create or replace function private.note(mid uuid, title text, body text default '', link text default '') returns void language sql as $$
  insert into private.notes (member_id, title, body, link) select mid, title, coalesce(body, ''), coalesce(link, '') where mid is not null
$$;
-- 적립 기준(data/pass.js 의 points.earn)대로 포인트 넣기
create or replace function private.earn(mid uuid, k text, memo text default null, ref text default '') returns int language plpgsql as $$
declare e jsonb := private.rules() -> 'pass' -> 'points' -> 'earn' -> k; p int := coalesce((e ->> 'points')::int, 0);
begin
  if mid is null or p <= 0 then return 0; end if;
  perform private.ledger_add(mid, k, coalesce(memo, e ->> 'title', '포인트 적립'), p, 0, 0, coalesce(ref, ''));
  return p;
end $$;
create or replace function private.pt(n int) returns text language sql immutable as $$ select to_char(coalesce(n, 0), 'FM999,999,999') || 'P' $$;
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
declare ps jsonb := private.rules() -> 'pass'; total int; goal int; rw jsonb := '[]'::jsonb; got int;
begin
  if mid is null then return jsonb_build_object('rewards', rw); end if;
  insert into private.stamps (member_id, kind, store, ref) values (mid, kind, coalesce(store, ''), coalesce(ref, ''));
  select count(*) into total from private.stamps where member_id = mid;
  goal := coalesce((ps -> 'stamps' ->> 'goal')::int, 10);
  if total % goal = 0 then
    got := private.earn(mid, 'stamp10', '스탬프 ' || goal || '칸 완성');
    if got > 0 then
      rw := rw || jsonb_build_array(jsonb_build_object('title', '스탬프 ' || goal || '칸 완성 · ' || private.pt(got)));
      perform private.note(mid, '스탬프 카드를 다 채웠어요', private.pt(got) || '를 넣어 드렸어요. 새 카드가 시작돼요.', 'pass/me#points');
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
declare u uuid := auth.uid(); m private.members; y text := to_char(now() at time zone 'Asia/Seoul', 'YYYY'); bal int; last_at timestamptz; days int; got int;
begin
  if u is null then return null; end if;
  select * into m from private.members where id = u;
  if m.id is null then return null; end if;
  update private.members set last_login_at = now() where id = u and (last_login_at is null or last_login_at < now() - interval '1 hour');
  -- 1년 동안 포인트가 한 번도 움직이지 않았으면 남은 포인트 정리
  days := coalesce((private.rules() -> 'pass' -> 'points' ->> 'expireDays')::int, 0);
  if days > 0 then
    select coalesce(sum(points), 0), max(at) into bal, last_at from private.ledger where member_id = u and points <> 0;
    if bal > 0 and last_at < now() - make_interval(days => days) then
      perform private.ledger_add(u, 'expire', '1년 동안 활동이 없어 포인트가 사라졌어요', -bal);
      perform private.note(u, '포인트가 사라졌어요', '1년 동안 적립도 사용도 없어 남은 ' || private.pt(bal) || '가 사라졌어요.');
    end if;
  end if;
  -- 생일 달 포인트 — 그해 한 번
  if m.birth ~ '^\d{2}-\d{2}$' and left(m.birth, 2)::int = extract(month from now() at time zone 'Asia/Seoul')::int
     and not exists (select 1 from private.ledger where member_id = u and type = 'birthday' and to_char(at at time zone 'Asia/Seoul', 'YYYY') = y) then
    got := private.earn(u, 'birthday', '생일 축하 포인트');
    if got > 0 then perform private.note(u, '생일 축하해요', '생일 축하 포인트 ' || private.pt(got) || '를 넣어 드렸어요.', 'pass/me#points'); end if;
  end if;
  return private.me_json(u);
end $$;

-- 아이디를 쓸 수 있는지 (가입 화면)
create or replace function public.plt_username_free(p_username text) returns boolean language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(p_username, '') ~ '^[a-z][a-z0-9_]{3,19}$' and not exists (select 1 from private.members where username = lower(p_username))
$$;

-- 가입 (아이디 가입은 Supabase 계정을 먼저 만든 뒤, 소셜 가입은 카카오·구글 로그인 뒤 부릅니다)
create or replace function public.plt_signup(p jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := auth.uid(); au auth.users; prov text; v_user text := null; v_code text; v_nick text := trim(coalesce(p ->> 'nick', ''));
  v_gender text := coalesce(p ->> 'gender', ''); v_age text := coalesce(p ->> 'ageGroup', ''); v_email text := lower(trim(coalesce(p ->> 'email', '')));
  a jsonb := private.rules() -> 'auth'; ages jsonb := private.rules() -> 'pass' -> 'member' -> 'ages'; got int;
begin
  if u is null then perform private.fail('로그인을 먼저 해 주세요.'); end if;
  if exists (select 1 from private.members where id = u) then return private.me_json(u); end if;
  select * into au from auth.users where id = u;
  prov := coalesce(au.raw_app_meta_data ->> 'provider', 'email');
  if prov = 'email' then
    if au.email is null or au.email !~ ('^[a-z][a-z0-9_]{3,19}@' || replace(private.id_domain(), '.', '\.') || '$') then perform private.fail('아이디 가입 정보를 확인하지 못했어요.'); end if;
    v_user := split_part(au.email, '@', 1); prov := 'id';
    if exists (select 1 from private.members where username = v_user) then perform private.fail('이미 쓰고 있는 아이디예요.'); end if;
  elsif prov not in ('kakao', 'google') then perform private.fail('지원하지 않는 가입 방식이에요.');
  end if;
  if length(v_nick) < 2 or length(v_nick) > 12 then perform private.fail('닉네임을 2~12자로 적어 주세요.'); end if;
  if v_gender <> '' and v_gender not in ('m', 'f') then perform private.fail('성별을 다시 골라 주세요.'); end if;
  if v_gender = '' and coalesce((a ->> 'genderRequired')::boolean, true) then perform private.fail('성별을 골라 주세요.'); end if;
  if v_age <> '' and ages is not null and not exists (select 1 from jsonb_array_elements(ages) x where x ->> 0 = v_age) then perform private.fail('연령대를 다시 골라 주세요.'); end if;
  if v_age = '' and coalesce((a ->> 'ageRequired')::boolean, true) then perform private.fail('연령대를 골라 주세요.'); end if;
  if v_email <> '' and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then perform private.fail('이메일 주소를 확인해 주세요.'); end if;
  loop v_code := private.code('PLT', 6); exit when not exists (select 1 from private.members mm where mm.code = v_code); end loop;
  insert into private.members (id, provider, username, email, gender, age_group, nick, birth, code, invited_by, consents, first_touch)
    values (u, prov, v_user, left(v_email, 80), v_gender, v_age, left(v_nick, 12),
      case when coalesce(p ->> 'birth', '') ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$' then p ->> 'birth' else '' end, v_code, upper(left(coalesce(p ->> 'invite', ''), 12)),
      jsonb_build_object('terms', true, 'age', true, 'mktEmail', coalesce((p ->> 'mktEmail')::boolean, false), 'at', private.ts(now()), 'ver', '2026-11'), left(coalesce(p ->> 'firstTouch', 'web'), 40));
  got := private.earn(u, 'welcome', '가입 축하 포인트');
  perform private.note(u, 'PASS에 오신 걸 환영해요', case when got > 0 then '가입 축하 포인트 ' || private.pt(got) || '를 넣어 드렸어요. ' else '' end || '출석 체크와 가챠샵 체크인으로 포인트를 모아 보세요.', 'pass/me#points');
  return private.me_json(u);
end $$;

create or replace function public.plt_update_profile(p jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); m private.members; a jsonb := private.rules() -> 'auth'; ages jsonb := private.rules() -> 'pass' -> 'member' -> 'ages';
  v_nick text; v_gender text; v_age text; v_email text; v_birth text;
begin
  select * into m from private.members where id = u;
  v_nick := case when p ? 'nick' then trim(coalesce(p ->> 'nick', '')) else m.nick end;
  v_gender := case when p ? 'gender' then coalesce(p ->> 'gender', '') else m.gender end;
  v_age := case when p ? 'ageGroup' then coalesce(p ->> 'ageGroup', '') else m.age_group end;
  v_email := case when p ? 'email' then lower(trim(coalesce(p ->> 'email', ''))) else m.email end;
  v_birth := case when p ? 'birth' then coalesce(p ->> 'birth', '') else m.birth end;
  if length(v_nick) < 2 or length(v_nick) > 12 then perform private.fail('닉네임을 2~12자로 적어 주세요.'); end if;
  if v_gender <> '' and v_gender not in ('m', 'f') then perform private.fail('성별을 다시 골라 주세요.'); end if;
  if v_gender = '' and coalesce((a ->> 'genderRequired')::boolean, true) then perform private.fail('성별을 골라 주세요.'); end if;
  if v_age <> '' and ages is not null and not exists (select 1 from jsonb_array_elements(ages) x where x ->> 0 = v_age) then perform private.fail('연령대를 다시 골라 주세요.'); end if;
  if v_age = '' and coalesce((a ->> 'ageRequired')::boolean, true) then perform private.fail('연령대를 골라 주세요.'); end if;
  if v_email <> '' and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then perform private.fail('이메일 주소를 확인해 주세요.'); end if;
  if v_birth <> '' and v_birth !~ '^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$' then perform private.fail('생일을 다시 골라 주세요.'); end if;
  update private.members set nick = left(v_nick, 12), gender = v_gender, age_group = v_age, email = left(v_email, 80), birth = v_birth,
    consents = case when p ? 'consents' then consents || jsonb_build_object(
      'mktEmail', coalesce((p -> 'consents' ->> 'mktEmail')::boolean, (consents ->> 'mktEmail')::boolean, false),
      'mktSms', coalesce((p -> 'consents' ->> 'mktSms')::boolean, (consents ->> 'mktSms')::boolean, false),
      'mktKakao', coalesce((p -> 'consents' ->> 'mktKakao')::boolean, (consents ->> 'mktKakao')::boolean, false), 'at', private.ts(now())) else consents end
  where id = u;
  return private.me_json(u);
end $$;

-- 비밀번호를 바꾼 뒤 (임시 비밀번호 표시 지우기)
create or replace function public.plt_pw_changed() returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need();
begin
  update private.members set must_change_pw = false where id = u;
  return private.me_json(u);
end $$;

-- 출석 체크 — 하루 한 번
create or replace function public.plt_attend() returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); got int;
begin
  perform pg_advisory_xact_lock(hashtext('attend:' || u::text));
  if exists (select 1 from private.ledger where member_id = u and type = 'attend' and (at at time zone 'Asia/Seoul')::date = private.today()) then perform private.fail('오늘은 이미 출석했어요. 내일 또 만나요.'); end if;
  got := private.earn(u, 'attend', '출석 체크');
  return jsonb_build_object('points', got, 'me', private.me_json(u));
end $$;

-- 경품별로 나간 수량 (남은 수량 표시)
create or replace function public.plt_reward_usage() returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(jsonb_object_agg(reward_id, n), '{}'::jsonb) from (select reward_id, sum(qty) n from private.entries where status <> 'cancelled' group by reward_id) x
$$;

-- 포인트로 응모하기·경품 신청하기
create or replace function public.plt_redeem(p_reward_id text, p_qty int default 1) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); r jsonb; q int := greatest(1, least(50, coalesce(p_qty, 1))); w jsonb; cost int; mine int; used int; lvs jsonb; need_i int := 0; my_i int := 0; i int := 0; l jsonb;
  e private.entries; raffle boolean;
begin
  select x into r from jsonb_array_elements(coalesce(private.rules() -> 'pass' -> 'rewards', '[]'::jsonb)) x where x ->> 'id' = p_reward_id limit 1;
  if r is null or coalesce(r ->> 'kind', '') not in ('raffle', 'prize') then perform private.fail('신청할 수 없는 항목이에요.'); end if;
  if coalesce((r ->> 'sample')::boolean, false) then perform private.fail('예시로 보여 드리는 경품이에요. 진짜 이벤트가 열리면 알려 드릴게요.'); end if;
  if coalesce(r ->> 'status', '') <> 'open' then perform private.fail(case when r ->> 'status' = 'soon' then '아직 준비 중이에요.' else '마감됐어요.' end); end if;
  if coalesce(r ->> 'ends', '') <> '' and private.today() > (r ->> 'ends')::date then perform private.fail('마감됐어요.'); end if;
  raffle := r ->> 'kind' = 'raffle';
  if not raffle then q := 1; end if;
  perform pg_advisory_xact_lock(hashtext('redeem:' || p_reward_id));
  w := private.wallet(u);
  if coalesce(r ->> 'minLevel', '') <> '' then
    lvs := coalesce(private.rules() -> 'pass' -> 'levels', '[]'::jsonb);
    for l in select value from jsonb_array_elements(lvs) loop
      if l ->> 'id' = r ->> 'minLevel' then need_i := i; end if;
      if l ->> 'id' = w -> 'level' ->> 'id' then my_i := i; end if;
      i := i + 1;
    end loop;
    if my_i < need_i then perform private.fail((lvs -> need_i ->> 'name') || ' 등급부터 신청할 수 있어요.'); end if;
  end if;
  select coalesce(sum(qty), 0) into mine from private.entries where member_id = u and reward_id = p_reward_id and status <> 'cancelled';
  if coalesce((r ->> 'perMember')::int, 0) > 0 and mine + q > (r ->> 'perMember')::int then
    perform private.fail('한 사람이 ' || (r ->> 'perMember') || '번까지 ' || case when raffle then '응모' else '신청' end || '할 수 있어요.' || case when mine > 0 then ' 지금까지 ' || mine || '번 했어요.' else '' end);
  end if;
  if not raffle and coalesce((r ->> 'stock')::int, 0) > 0 then
    select coalesce(sum(qty), 0) into used from private.entries where reward_id = p_reward_id and status <> 'cancelled';
    if used + q > (r ->> 'stock')::int then perform private.fail('준비한 수량이 다 나갔어요.'); end if;
  end if;
  cost := coalesce((r ->> 'cost')::int, 0) * q;
  if (w ->> 'points')::int < cost then perform private.fail('포인트가 ' || private.pt(cost - (w ->> 'points')::int) || ' 모자라요.'); end if;
  insert into private.entries (member_id, reward_id, kind, title, qty, cost, status, code)
    values (u, p_reward_id, r ->> 'kind', left(coalesce(r ->> 'title', ''), 80), q, cost, case when raffle then 'applied' else 'ready' end, case when raffle then '' else private.code('', 6) end)
    returning * into e;
  perform private.ledger_add(u, 'use', e.title || case when q > 1 then ' ×' || q else '' end, -cost, 0, 0, e.id::text);
  perform private.note(u, case when raffle then '응모했어요' else '경품 신청을 받았어요' end, e.title || case when raffle then ' · ' || q || '번' else ' · 수령 코드 ' || e.code end, 'pass/wallet#mine');
  return jsonb_build_object('entry', jsonb_build_object('id', e.id, 'rewardId', e.reward_id, 'kind', e.kind, 'title', e.title, 'qty', e.qty, 'cost', e.cost, 'status', e.status, 'code', e.code, 'at', private.ts(e.at)), 'me', private.me_json(u));
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
  elsif p_kind = 'entries' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'rewardId', x.reward_id, 'kind', x.kind, 'title', x.title, 'qty', x.qty, 'cost', x.cost, 'status', x.status, 'code', case when x.status in ('ready', 'won') then x.code else '' end, 'at', private.ts(x.at)) order by x.at desc) from private.entries x where x.member_id = u), '[]');
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
declare u uuid := private.need(); p text[] := string_to_array(coalesce(token, ''), '.'); sec text := (select value from private.secrets where key = 'kiosk'); age bigint; r jsonb;
  first_visit boolean; got int; ip int; rw jsonb; m private.members; inv uuid;
begin
  if array_length(p, 1) <> 3 or p[2] !~ '^\d+$' or left(private.hmac(sec, p[1] || '|' || p[2]), 20) <> p[3] then perform private.fail('QR을 다시 찍어 주세요.'); end if;
  age := floor(extract(epoch from now()) / 30)::bigint - p[2]::bigint;
  if age < 0 or age > 2 then perform private.fail('QR 유효 시간이 지났어요. 화면의 새 QR을 찍어 주세요.'); end if;
  first_visit := not exists (select 1 from private.checkins c where c.member_id = u);
  insert into private.checkins (member_id, store, day) values (u, p[1], private.today()) on conflict do nothing;
  if not found then return jsonb_build_object('already', true, 'rewards', '[]'::jsonb, 'me', private.me_json(u)); end if;
  got := private.earn(u, 'checkin', coalesce(private.station(p[1]) ->> 'name', p[1]) || ' 체크인');
  r := private.add_stamp(u, 'checkin', p[1], private.today()::text);
  rw := coalesce(r -> 'rewards', '[]'::jsonb);
  -- 친구 초대: 초대받은 회원이 처음 체크인하면 두 사람 모두
  select * into m from private.members where id = u;
  if first_visit and m.invited_by <> '' then
    select id into inv from private.members where code = m.invited_by and id <> u;
    if inv is not null then
      ip := private.earn(u, 'invite', '친구 초대 · 첫 체크인');
      perform private.earn(inv, 'invite', coalesce(nullif(m.nick, ''), '친구') || '님 첫 체크인');
      if ip > 0 then
        rw := rw || jsonb_build_array(jsonb_build_object('title', '친구 초대 · ' || private.pt(ip)));
        perform private.note(inv, '초대한 친구가 가챠샵에 왔어요', private.pt(ip) || '를 넣어 드렸어요.', 'pass/me#points');
      end if;
    end if;
  end if;
  return jsonb_build_object('already', false, 'points', got, 'rewards', rw, 'me', private.me_json(u));
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
  ph := coalesce(nullif(m.phone, ''), private.clean_phone(d ->> 'phone'));
  if not private.valid_phone(ph) then perform private.fail('휴대폰 번호를 확인해 주세요.'); end if;
  if exists (select 1 from private.regs x where x.event_id = p_event_id and x.phone = ph and x.status <> 'cancelled') then perform private.fail('이미 신청한 행사예요.'); end if;
  insert into private.regs (event_id, member_id, name, phone, people, memo) values (left(p_event_id, 40), m.id, left(coalesce(nullif(d ->> 'name', ''), nullif(m.name, ''), m.nick, ''), 20), ph, greatest(1, least(10, private.jint(d, 'people', 1))), left(coalesce(d ->> 'memo', ''), 300)) returning * into r;
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
  ph := case when coalesce(d ->> 'contact', '') ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then lower(left(trim(d ->> 'contact'), 80))
             else private.clean_phone(coalesce(nullif(d ->> 'contact', ''), (select phone from private.members where id = u))) end;
  if coalesce(d ->> 'type', '') = 'account' and ph = '' then perform private.fail('연락받을 휴대폰 번호나 이메일을 적어 주세요.'); end if;
  if coalesce(d ->> 'type', '') = 'account' and (select count(*) from private.inquiries where type = 'account' and contact = ph and at > now() - interval '1 hour') >= 3 then perform private.fail('이미 요청을 받았어요. 확인하고 연락드릴게요.'); end if;
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
    'pointsOutstanding', (select coalesce(sum(points), 0) from private.ledger),
    'attendToday', (select count(*) from private.ledger where type = 'attend' and (at at time zone 'Asia/Seoul')::date = private.today()),
    'entriesOpen', (select count(*) from private.entries where status in ('ready', 'won')),
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
  elsif p_kind = 'entries' then return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'memberId', x.member_id, 'rewardId', x.reward_id, 'kind', x.kind, 'title', x.title, 'qty', x.qty, 'cost', x.cost, 'status', x.status, 'code', x.code,
      'at', private.ts(x.at), 'updatedAt', private.ts(x.updated_at), 'nick', coalesce(m.nick, '(탈퇴)'), 'username', coalesce(m.username, ''), 'memberCode', coalesce(m.code, '')) order by x.at desc)
    from private.entries x left join private.members m on m.id = x.member_id), '[]');
  end if;
  return '[]';
end $$;
create or replace function public.plt_admin_update(p_kind text, p_id text, patch jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare st text := patch ->> 'status'; mid uuid; v_item text; en private.entries;
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
  elsif p_kind = 'entries' and st in ('applied', 'won', 'lost', 'ready', 'done', 'cancelled') then
    select * into en from private.entries x where x.id = p_id::uuid;
    if en.id is null then perform private.fail('신청을 찾지 못했어요.'); end if;
    if en.status = 'cancelled' and st <> 'cancelled' then perform private.fail('취소한 신청은 되돌릴 수 없어요. 포인트는 이미 돌려드렸어요.'); end if;
    update private.entries x set status = st, updated_at = now(), code = case when st in ('won', 'ready') and x.code = '' then private.code('', 6) else x.code end where x.id = en.id;
    if st = 'done' and en.status <> 'done' then perform private.note(en.member_id, '경품을 전달했어요', en.title); end if;
    if st = 'cancelled' and en.status <> 'cancelled' then
      perform private.ledger_add(en.member_id, 'refund', en.title || ' 취소 · 포인트 돌려드림', en.cost, 0, 0, en.id::text);
      perform private.note(en.member_id, '신청이 취소됐어요', en.title || ' · ' || private.pt(en.cost) || '를 돌려드렸어요.');
    end if;
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
create or replace function public.plt_admin_issue_coupon(p_key text, p_def text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare mid uuid; c jsonb;
begin
  perform private.need_staff();
  mid := private.find_member(p_key);
  if mid is null then perform private.fail('그 아이디나 회원 코드로 가입한 회원이 없어요.'); end if;
  c := private.issue(mid, p_def, 'admin'); if c is null then perform private.fail('쿠폰 종류를 확인해 주세요.'); end if;
  return c;
end $$;
create or replace function public.plt_admin_stamp(p_key text, p_store text default 'kd-gacha') returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare mid uuid;
begin
  perform private.need_staff();
  mid := private.find_member(p_key);
  if mid is null then perform private.fail('그 아이디나 회원 코드로 가입한 회원이 없어요.'); end if;
  return private.add_stamp(mid, 'manual', coalesce(p_store, 'kd-gacha'), 'admin');
end $$;
-- 포인트 넣기·빼기 (행사 참여, 돌려드림, 부정 적립 회수)
create or replace function public.plt_admin_points(p_key text, p_points int, p_memo text default '') returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare mid uuid; v_memo text := left(trim(coalesce(p_memo, '')), 60);
begin
  perform private.need_staff();
  mid := private.find_member(p_key);
  if mid is null then perform private.fail('그 아이디나 회원 코드로 가입한 회원이 없어요.'); end if;
  if coalesce(p_points, 0) = 0 or abs(p_points) > 100000 then perform private.fail('넣거나 뺄 포인트를 확인해 주세요.'); end if;
  if p_points < 0 and (private.wallet(mid) ->> 'points')::int + p_points < 0 then perform private.fail('남은 포인트보다 많이 뺄 수 없어요.'); end if;
  if v_memo = '' then v_memo := case when p_points > 0 then '운영자 지급' else '운영자 회수' end; end if;
  perform private.ledger_add(mid, case when p_points > 0 then 'admin' else 'adjust' end, v_memo, p_points);
  perform private.note(mid, case when p_points > 0 then '포인트가 들어왔어요' else '포인트를 정리했어요' end, v_memo || ' · ' || case when p_points > 0 then '+' else '' end || private.pt(p_points), 'pass/me#points');
  return private.me_json(mid);
end $$;
-- 임시 비밀번호 만들기 — 아이디 가입 회원만. 회원은 이걸로 로그인한 뒤 바로 새 비밀번호로 바꿔요
create or replace function public.plt_admin_reset_password(p_member text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare mid uuid; m private.members; chars text := 'abcdefghjkmnpqrstuvwxyz'; tmp text := ''; i int;
begin
  perform private.need_staff();
  mid := private.find_member(p_member);
  select * into m from private.members where id = mid;
  if m.id is null then perform private.fail('회원을 찾지 못했어요.'); end if;
  if m.provider <> 'id' then perform private.fail('카카오·구글로 가입한 회원은 비밀번호가 없어요. 같은 계정으로 다시 로그인하도록 안내해 주세요.'); end if;
  for i in 1..4 loop tmp := tmp || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
  tmp := tmp || (1000 + floor(random() * 9000))::int::text;
  update auth.users set encrypted_password = extensions.crypt(tmp, extensions.gen_salt('bf', 10)), updated_at = now() where id = m.id;
  update private.members set must_change_pw = true where id = m.id;
  perform private.note(m.id, '비밀번호를 다시 설정했어요', '운영자가 안내한 임시 비밀번호로 로그인하면 새 비밀번호를 정하는 화면이 나와요.');
  return jsonb_build_object('temp', tmp, 'username', m.username);
end $$;
-- 응모 추첨 — 넣은 횟수만큼 확률이 올라가고, 한 사람은 한 번만 뽑혀요
create or replace function public.plt_admin_draw(p_reward_id text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare r jsonb; n int; picked uuid[] := '{}'; w record; total int; v_code text; c int := 0; e record; title text;
begin
  perform private.need_staff();
  select x into r from jsonb_array_elements(coalesce(private.rules() -> 'pass' -> 'rewards', '[]'::jsonb)) x where x ->> 'id' = p_reward_id limit 1;
  select min(en.title) into title from private.entries en where en.reward_id = p_reward_id;
  if (r is not null and r ->> 'kind' <> 'raffle') or title is null then perform private.fail('추첨할 응모가 없어요.'); end if;
  n := greatest(1, coalesce((r ->> 'winners')::int, 1));
  select count(*) into total from private.entries where reward_id = p_reward_id and status = 'applied';
  if total = 0 then perform private.fail('추첨할 응모가 없어요.'); end if;
  -- 회원별 응모 횟수로 가중치를 두고 뽑아요 (Efraimidis–Spirakis)
  for w in select member_id from (select member_id, sum(qty) q from private.entries where reward_id = p_reward_id and status = 'applied' group by member_id) t order by -ln(1 - random()) / q limit n loop
    picked := picked || w.member_id;
  end loop;
  for w in select distinct member_id from private.entries where reward_id = p_reward_id and status = 'applied' loop
    if w.member_id = any (picked) then
      v_code := private.code('', 6);
      update private.entries set status = 'won', code = v_code, updated_at = now() where reward_id = p_reward_id and member_id = w.member_id and status = 'applied';
      perform private.note(w.member_id, '응모에 당첨됐어요', title || ' · 수령 코드 ' || v_code, 'pass/wallet#mine');
    else
      update private.entries set status = 'lost', updated_at = now() where reward_id = p_reward_id and member_id = w.member_id and status = 'applied';
      perform private.note(w.member_id, '추첨 결과를 알려 드려요', title || ' · 이번에는 당첨되지 않았어요. 다음 응모에서 만나요.', 'pass/wallet#mine');
    end if;
  end loop;
  return jsonb_build_object('winners', coalesce(array_length(picked, 1), 0), 'entries', total);
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

-- 비밀번호 재설정 메일(Cloudflare 함수 /api/auth/recover) — 서버 전용
-- 아이디와 이메일이 맞으면 로그인 계정 주소를 돌려줘요. 같은 회원에게 2분 안에 다시 보내지 않아요.
create or replace function public.plt_srv_recover(p_username text, p_email text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare m private.members; e text := lower(trim(coalesce(p_email, '')));
begin
  select * into m from private.members where username = lower(trim(coalesce(p_username, ''))) and provider = 'id';
  if m.id is null or m.email = '' or m.email <> e then return null; end if;
  if m.recover_sent_at is not null and m.recover_sent_at > now() - interval '2 minutes' then return null; end if;
  update private.members set recover_sent_at = now() where id = m.id;
  return jsonb_build_object('authEmail', (select email from auth.users where id = m.id), 'nick', m.nick, 'username', m.username);
end $$;
-- 아이디 찾기 메일 — 서버 전용. 같은 이메일로 한 시간에 세 번까지
create or replace function public.plt_srv_find_ids(p_email text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare e text := lower(trim(coalesce(p_email, ''))); ids jsonb;
begin
  if e = '' then return null; end if;
  if (select count(*) from private.mail_log where kind = 'id' and email = e and at > now() - interval '1 hour') >= 3 then return null; end if;
  select jsonb_agg(username order by created_at) into ids from private.members where email = e and provider = 'id' and username is not null;
  if ids is null then return null; end if;
  insert into private.mail_log (kind, email) values ('id', e);
  return jsonb_build_object('ids', ids);
end $$;

-- 알림 발송(Cloudflare 함수)이 받는 사람 정보를 확인할 때 씁니다 — 서버 전용
create or replace function public.plt_notify_target(p_member uuid) returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select jsonb_build_object('phone', coalesce(m.phone, ''), 'nick', m.nick, 'consents', m.consents) from private.members m where m.id = p_member
$$;

-- ---------------------------------------------------------------------
--  권한: plt_ 함수만 열어 둡니다
-- ---------------------------------------------------------------------
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'plt\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname in ('plt_pay_confirm', 'plt_order_peek', 'plt_notify_target', 'plt_srv_recover', 'plt_srv_find_ids') then
      execute format('grant execute on function %s to service_role', f.sig);
    else
      execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
    end if;
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' loop
    execute format('revoke all on function %s from public', f.sig);
  end loop;
end $$;
