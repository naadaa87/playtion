-- =====================================================================
--  PLAYTION — 커뮤니티 (자랑하기 · 교환 판매 · 문의함 · 신고 · 운영) — community.sql
--  schema.sql 을 먼저 적용한 뒤, Supabase SQL Editor 에서 이 파일을 통째로 실행하세요.
--  · 표는 모두 private 스키마에 두고, 화면은 public.plt_c_* 함수로만 읽고 씁니다.
--  · 사진은 Storage 의 community 버킷(공개 읽기)에 회원별 폴더로 올라갑니다.
--  · 결제·배송·보증 기능은 없습니다. 글과 비공개 문의함만 제공합니다.
--  다시 실행해도 안전하도록 if not exists / or replace 로 적었습니다.
-- =====================================================================

-- ---------------------------------------------------------------------
--  표
-- ---------------------------------------------------------------------
create table if not exists private.cposts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references private.members (id) on delete cascade,
  cat text not null default 'today',
  title text not null,
  body text not null default '',
  tags text[] not null default '{}',
  source text not null default '',
  station text not null default '',
  images jsonb not null default '[]'::jsonb,           -- [{path,w,h}]
  status text not null default 'public' check (status in ('public', 'hidden')),
  hidden_reason text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cposts_created on private.cposts (status, created_at desc);
create index if not exists cposts_member on private.cposts (member_id, created_at desc);
create index if not exists cposts_tags on private.cposts using gin (tags);

create table if not exists private.cmarket (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references private.members (id) on delete cascade,
  type text not null check (type in ('swap', 'sell', 'both')),
  title text not null,
  item text not null default '',
  parts text not null default '',
  qty int not null default 1,
  condition text not null default '',
  defect boolean not null default false,
  defect_note text not null default '',
  price int not null default 0,
  basis text not null default 'each',
  want text not null default '',
  method text not null default 'either',
  shipping text not null default 'talk',
  region text not null default '',
  body text not null default '',
  images jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'reserved', 'done', 'closed')),
  hidden boolean not null default false,
  hidden_reason text not null default '',
  from_post uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cmarket_created on private.cmarket (hidden, status, created_at desc);
create index if not exists cmarket_member on private.cmarket (member_id, created_at desc);

create table if not exists private.ccomments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references private.cposts (id) on delete cascade,
  member_id uuid not null references private.members (id) on delete cascade,
  parent_id uuid references private.ccomments (id) on delete cascade,
  text text not null default '',
  deleted boolean not null default false,
  hidden_text text not null default '',
  at timestamptz not null default now()
);
create index if not exists ccomments_post on private.ccomments (post_id, at);

create table if not exists private.chearts (
  post_id uuid not null references private.cposts (id) on delete cascade,
  member_id uuid not null references private.members (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create index if not exists chearts_at on private.chearts (post_id, at desc);

create table if not exists private.csaves (
  post_id uuid not null references private.cposts (id) on delete cascade,
  member_id uuid not null references private.members (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create table if not exists private.cconvs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,                                          -- 글이 지워져도 대화는 남아요
  item_title text not null default '',
  author_id uuid not null references private.members (id) on delete cascade,
  asker_id uuid not null references private.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, asker_id)
);
create table if not exists private.cmsgs (
  id uuid primary key default gen_random_uuid(),
  conv_id uuid not null references private.cconvs (id) on delete cascade,
  from_id uuid not null references private.members (id) on delete cascade,
  text text not null,
  at timestamptz not null default now()
);
create index if not exists cmsgs_conv on private.cmsgs (conv_id, at);
create table if not exists private.creads (
  conv_id uuid not null references private.cconvs (id) on delete cascade,
  member_id uuid not null references private.members (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (conv_id, member_id)
);
create table if not exists private.cblocks (
  member_id uuid not null references private.members (id) on delete cascade,
  blocked_id uuid not null references private.members (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (member_id, blocked_id)
);
create table if not exists private.creports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('post', 'item', 'comment', 'member')),
  target_id text not null,
  title text not null default '',
  reporter_id uuid not null references private.members (id) on delete cascade,
  reason text not null default 'other',
  text text not null default '',
  status text not null default 'open' check (status in ('open', 'checking', 'actioned', 'held', 'closed')),
  note text not null default '',
  at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists private.caudit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null,
  kind text not null default '',
  target_id text not null default '',
  reason text not null default '',
  by_user uuid
);
create table if not exists private.climits (
  member_id uuid primary key references private.members (id) on delete cascade,
  until timestamptz not null,
  reason text not null default '',
  at timestamptz not null default now()
);

do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'private' and tablename like 'c%' loop
    execute format('alter table private.%I enable row level security', t.tablename);
    execute format('revoke all on private.%I from public', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  사진 저장소 — community 버킷 (공개 읽기, 회원은 자기 폴더에만 올리고 지울 수 있어요)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('community', 'community', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
drop policy if exists "community read" on storage.objects;
create policy "community read" on storage.objects for select using (bucket_id = 'community');
drop policy if exists "community insert own" on storage.objects;
create policy "community insert own" on storage.objects for insert to authenticated with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "community delete own" on storage.objects;
create policy "community delete own" on storage.objects for delete to authenticated using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
--  내부 도구
-- ---------------------------------------------------------------------
create or replace function private.c_contact(t text) returns boolean language sql immutable as $$
  select regexp_replace(coalesce(t, ''), '[‐-―]', '-', 'g') ~ '(01[016789][-. ]?[0-9]{3,4}[-. ]?[0-9]{4})|([0-9]{10,14})|(계좌|오픈 ?채팅|카톡 ?(아이디|ID|id)|카카오톡 ?(아이디|ID|id)|텔레그램|라인 ?(아이디|ID|id))'
$$;
create or replace function private.c_nick(mid uuid) returns text language sql stable as $$ select coalesce(nullif(m.nick, ''), '회원') from private.members m where m.id = mid $$;
create or replace function private.c_limit_check(u uuid) returns void language plpgsql stable as $$
declare l private.climits;
begin
  select * into l from private.climits where member_id = u;
  if l.member_id is not null and l.until > now() then perform private.fail('운영팀이 글쓰기를 잠시 제한했어요. ' || to_char(l.until at time zone 'Asia/Seoul', 'MM월 DD일 HH24:MI') || '까지 · ' || l.reason); end if;
end $$;
create or replace function private.c_rate(last_at timestamptz, sec int, label text) returns void language plpgsql stable as $$
declare left_s int;
begin
  if last_at is not null and last_at > now() - make_interval(secs => sec) then
    left_s := ceil(extract(epoch from (last_at + make_interval(secs => sec) - now())))::int;
    perform private.fail(label || ' ' || case when left_s >= 60 then ceil(left_s / 60.0)::int || '분' else left_s || '초' end || ' 뒤에 다시 할 수 있어요.');
  end if;
end $$;
create or replace function private.c_audit(a text, k text, t text, r text) returns void language sql as $$
  insert into private.caudit (action, kind, target_id, reason, by_user) values (a, coalesce(k, ''), coalesce(t, ''), coalesce(r, ''), auth.uid())
$$;
create or replace function private.c_clean_tags(j jsonb) returns text[] language sql immutable as $$
  select coalesce(array_agg(t), '{}') from (
    select distinct t from (select left(trim(both '#' from trim(x)), 15) t from jsonb_array_elements_text(coalesce(j, '[]'::jsonb)) x) s where t <> '' limit 5) q
$$;
create or replace function private.c_images(j jsonb) returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object('path', x ->> 'path', 'w', private.jint(x, 'w'), 'h', private.jint(x, 'h'))), '[]'::jsonb)
  from (select x from jsonb_array_elements(coalesce(j, '[]'::jsonb)) x where coalesce(x ->> 'path', '') <> '' limit 8) q
$$;
create or replace function private.c_blocked(author uuid, asker uuid) returns boolean language sql stable as $$ select exists (select 1 from private.cblocks where member_id = author and blocked_id = asker) $$;

create or replace function private.cpost_json(p private.cposts) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'memberId', p.member_id, 'nick', private.c_nick(p.member_id), 'cat', p.cat, 'title', p.title, 'body', p.body,
    'tags', to_jsonb(p.tags), 'source', p.source, 'station', p.station, 'images', p.images, 'status', p.status, 'hiddenReason', p.hidden_reason,
    'featured', p.featured, 'createdAt', private.ts(p.created_at), 'updatedAt', private.ts(p.updated_at),
    'hearts', (select count(*) from private.chearts h where h.post_id = p.id),
    'comments', (select count(*) from private.ccomments c where c.post_id = p.id and not c.deleted),
    'hearted', exists (select 1 from private.chearts h where h.post_id = p.id and h.member_id = auth.uid()),
    'saved', exists (select 1 from private.csaves s where s.post_id = p.id and s.member_id = auth.uid()),
    'mine', coalesce(p.member_id = auth.uid(), false))
$$;
create or replace function private.citem_json(p private.cmarket) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p.id, 'memberId', p.member_id, 'nick', private.c_nick(p.member_id), 'type', p.type, 'title', p.title, 'item', p.item, 'parts', p.parts, 'qty', p.qty,
    'condition', p.condition, 'defect', p.defect, 'defectNote', p.defect_note, 'price', p.price, 'basis', p.basis, 'want', p.want, 'method', p.method,
    'shipping', p.shipping, 'region', p.region, 'body', p.body, 'images', p.images, 'status', p.status, 'hidden', p.hidden, 'hiddenReason', p.hidden_reason,
    'fromPost', p.from_post, 'createdAt', private.ts(p.created_at), 'updatedAt', private.ts(p.updated_at), 'mine', coalesce(p.member_id = auth.uid(), false),
    'inquiries', case when p.member_id = auth.uid() then (select count(*) from private.cconvs c where c.item_id = p.id) else null end,
    'myConv', coalesce((select c.id::text from private.cconvs c where c.item_id = p.id and c.asker_id = auth.uid()), ''))
$$;
create or replace function private.cconv_json(c private.cconvs, u uuid) returns jsonb language plpgsql stable as $$
declare it private.cmarket; last private.cmsgs; ra timestamptz; role text := case when c.author_id = u then 'author' else 'asker' end; other uuid := case when c.author_id = u then c.asker_id else c.author_id end;
begin
  select * into it from private.cmarket where id = c.item_id;
  select * into last from private.cmsgs where conv_id = c.id order by at desc limit 1;
  select read_at into ra from private.creads where conv_id = c.id and member_id = u;
  return jsonb_build_object('id', c.id, 'itemId', c.item_id, 'itemTitle', coalesce(it.title, c.item_title), 'authorId', c.author_id, 'askerId', c.asker_id, 'createdAt', private.ts(c.created_at),
    'item', case when it.id is null then null else jsonb_build_object('id', it.id, 'title', it.title, 'type', it.type, 'status', it.status, 'hidden', it.hidden) end,
    'role', role, 'otherId', other, 'otherNick', private.c_nick(other), 'lastText', coalesce(last.text, ''), 'lastAt', private.ts(coalesce(last.at, c.created_at)),
    'unread', (select count(*) from private.cmsgs m where m.conv_id = c.id and m.from_id <> u and (ra is null or m.at > ra)),
    'blocked', private.c_blocked(c.author_id, c.asker_id), 'canBlock', role = 'author');
end $$;
create or replace function private.c_page(f jsonb) returns int language sql immutable as $$ select greatest(1, private.jint(f, 'page', 1)) $$;

-- ---------------------------------------------------------------------
--  자랑하기
-- ---------------------------------------------------------------------
create or replace function private.c_feed_rows(p_f jsonb, u uuid) returns setof private.cposts language sql stable as $$
  select p.* from private.cposts p
    where (case when coalesce((p_f ->> 'mine')::boolean, false) then p.member_id = u else p.status = 'public' end)
      and (not coalesce((p_f ->> 'saved')::boolean, false) or exists (select 1 from private.csaves s where s.post_id = p.id and s.member_id = u))
      and (not coalesce((p_f ->> 'featured')::boolean, false) or p.featured)
      and (coalesce(p_f ->> 'cat', '') = '' or p.cat = p_f ->> 'cat')
      and (coalesce(p_f ->> 'tag', '') = '' or (p_f ->> 'tag') = any (p.tags))
      and (coalesce(p_f ->> 'station', '') = '' or p.station = p_f ->> 'station')
      and (coalesce(p_f ->> 'q', '') = '' or (p.title || ' ' || p.body || ' ' || array_to_string(p.tags, ' ') || ' ' || private.c_nick(p.member_id)) ilike '%' || (p_f ->> 'q') || '%')
$$;
create or replace function private.c_hot(pid uuid) returns bigint language sql stable as $$ select count(*) from private.chearts h where h.post_id = pid and h.at > now() - interval '7 days' $$;
create or replace function public.plt_c_feed(p_f jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare pg int := private.c_page(p_f); size int := 20; u uuid := auth.uid(); total int; items jsonb; hot boolean := coalesce(p_f ->> 'sort', '') = 'hot';
begin
  if (coalesce((p_f ->> 'mine')::boolean, false) or coalesce((p_f ->> 'saved')::boolean, false)) and u is null then return jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', 1, 'more', false); end if;
  select count(*) into total from private.c_feed_rows(p_f, u);
  if hot then
    select coalesce(jsonb_agg(private.cpost_json(p) order by private.c_hot(p.id) desc, p.created_at desc), '[]') into items
      from (select * from private.c_feed_rows(p_f, u) r order by private.c_hot(r.id) desc, r.created_at desc limit size offset (pg - 1) * size) p;
  else
    select coalesce(jsonb_agg(private.cpost_json(p) order by p.created_at desc), '[]') into items
      from (select * from private.c_feed_rows(p_f, u) r order by r.created_at desc limit size offset (pg - 1) * size) p;
  end if;
  return jsonb_build_object('items', items, 'total', total, 'page', pg, 'more', pg * size < total);
end $$;

create or replace function public.plt_c_post(p_id uuid) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare p private.cposts;
begin
  select * into p from private.cposts where id = p_id;
  if p.id is null then perform private.fail('글을 찾지 못했어요.'); end if;
  if p.status <> 'public' and p.member_id is distinct from auth.uid() and not private.is_staff() then perform private.fail('지금 볼 수 없는 글입니다. 다른 게시물을 둘러보세요'); end if;
  return private.cpost_json(p);
end $$;

create or replace function private.c_check_post(d jsonb) returns void language plpgsql as $$
begin
  if length(trim(coalesce(d ->> 'title', ''))) = 0 then perform private.fail('제목을 적어 주세요.'); end if;
  if length(trim(coalesce(d ->> 'body', ''))) = 0 then perform private.fail('본문을 한 줄이라도 적어 주세요.'); end if;
  if coalesce(d ->> 'cat', '') not in ('today', 'collection', 'deco', 'ask') then perform private.fail('분류를 골라 주세요.'); end if;
  if private.c_contact(coalesce(d ->> 'title', '') || ' ' || coalesce(d ->> 'body', '') || ' ' || coalesce(d ->> 'tags', '')) then perform private.fail('연락처·계좌·메신저 아이디는 글에 적을 수 없어요.'); end if;
end $$;

create or replace function public.plt_c_create_post(p_d jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.cposts; imgs jsonb := private.c_images(p_d -> 'images');
begin
  perform private.c_limit_check(u);
  perform private.c_check_post(p_d);
  if jsonb_array_length(imgs) < 1 then perform private.fail('사진을 1장 이상 올려 주세요.'); end if;
  perform private.c_rate((select max(created_at) from private.cposts where member_id = u), 300, '새 글은');
  insert into private.cposts (member_id, cat, title, body, tags, source, station, images)
    values (u, p_d ->> 'cat', left(trim(p_d ->> 'title'), 50), left(trim(p_d ->> 'body'), 2000), private.c_clean_tags(p_d -> 'tags'),
      case when coalesce(p_d ->> 'source', '') in ('playtion', 'other') then p_d ->> 'source' else '' end,
      case when coalesce(p_d ->> 'source', '') = 'playtion' then left(coalesce(p_d ->> 'station', ''), 40) else '' end, imgs)
    returning * into p;
  return private.cpost_json(p);
end $$;

create or replace function public.plt_c_update_post(p_id uuid, p_d jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.cposts; keep jsonb; added jsonb := private.c_images(p_d -> 'newImages'); merged jsonb; removed text[];
begin
  select * into p from private.cposts where id = p_id and member_id = u;
  if p.id is null then perform private.fail('내가 쓴 글만 고칠 수 있어요.'); end if;
  perform private.c_check_post(p_d);
  if p_d ? 'keepImages' and jsonb_typeof(p_d -> 'keepImages') = 'array' then
    select coalesce(jsonb_agg(x), '[]') into keep from jsonb_array_elements(p.images) x where x ->> 'path' in (select jsonb_array_elements_text(p_d -> 'keepImages'));
  else keep := p.images; end if;
  merged := keep || added;
  if jsonb_array_length(merged) < 1 then perform private.fail('사진을 1장 이상 남겨 주세요.'); end if;
  if jsonb_array_length(merged) > 8 then perform private.fail('사진은 8장까지예요.'); end if;
  select coalesce(array_agg(x ->> 'path'), '{}') into removed from jsonb_array_elements(p.images) x where not (keep @> jsonb_build_array(x)) and not exists (select 1 from private.cmarket m where m.images @> jsonb_build_array(x));
  update private.cposts set cat = p_d ->> 'cat', title = left(trim(p_d ->> 'title'), 50), body = left(trim(p_d ->> 'body'), 2000), tags = private.c_clean_tags(p_d -> 'tags'),
    source = case when coalesce(p_d ->> 'source', '') in ('playtion', 'other') then p_d ->> 'source' else '' end,
    station = case when coalesce(p_d ->> 'source', '') = 'playtion' then left(coalesce(p_d ->> 'station', ''), 40) else '' end,
    images = merged, updated_at = now() where id = p_id returning * into p;
  return private.cpost_json(p) || jsonb_build_object('removedPaths', to_jsonb(removed));
end $$;

create or replace function public.plt_c_delete_post(p_id uuid) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.cposts; paths text[];
begin
  select * into p from private.cposts where id = p_id and member_id = u;
  if p.id is null then perform private.fail('내가 쓴 글만 지울 수 있어요.'); end if;
  select coalesce(array_agg(x ->> 'path'), '{}') into paths from jsonb_array_elements(p.images) x
    where not exists (select 1 from private.cmarket m where m.images @> jsonb_build_array(x));   -- 교환 판매 글이 같은 사진을 쓰면 파일은 남겨요
  delete from private.cposts where id = p_id;
  return jsonb_build_object('paths', to_jsonb(paths));
end $$;

create or replace function public.plt_c_heart(p_id uuid) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.cposts; on_ boolean;
begin
  select * into p from private.cposts where id = p_id and status = 'public';
  if p.id is null then perform private.fail('지금 볼 수 없는 글입니다. 다른 게시물을 둘러보세요'); end if;
  if p.member_id = u then perform private.fail('내 글에는 하트를 누를 수 없어요.'); end if;
  if exists (select 1 from private.chearts where post_id = p_id and member_id = u) then delete from private.chearts where post_id = p_id and member_id = u; on_ := false;
  else insert into private.chearts (post_id, member_id) values (p_id, u); on_ := true; end if;
  return jsonb_build_object('on', on_, 'count', (select count(*) from private.chearts where post_id = p_id));
end $$;

create or replace function public.plt_c_save(p_id uuid) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); on_ boolean;
begin
  if not exists (select 1 from private.cposts where id = p_id and status = 'public') then perform private.fail('지금 볼 수 없는 글입니다. 다른 게시물을 둘러보세요'); end if;
  if exists (select 1 from private.csaves where post_id = p_id and member_id = u) then delete from private.csaves where post_id = p_id and member_id = u; on_ := false;
  else insert into private.csaves (post_id, member_id) values (p_id, u); on_ := true; end if;
  return jsonb_build_object('on', on_);
end $$;

create or replace function public.plt_c_comments(p_post uuid) returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'postId', c.post_id, 'memberId', c.member_id, 'nick', case when c.deleted then '' else private.c_nick(c.member_id) end,
    'parentId', coalesce(c.parent_id::text, ''), 'text', case when c.deleted then '' else c.text end, 'at', private.ts(c.at), 'deleted', c.deleted, 'mine', coalesce(c.member_id = auth.uid(), false)) order by c.at), '[]')
  from private.ccomments c join private.cposts p on p.id = c.post_id where c.post_id = p_post and (p.status = 'public' or p.member_id = auth.uid() or private.is_staff())
$$;

create or replace function public.plt_c_comment(p_post uuid, p_text text, p_parent uuid default null) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.cposts; parent private.ccomments; c private.ccomments; t text := left(trim(coalesce(p_text, '')), 500);
begin
  perform private.c_limit_check(u);
  select * into p from private.cposts where id = p_post and status = 'public';
  if p.id is null then perform private.fail('지금 볼 수 없는 글입니다. 다른 게시물을 둘러보세요'); end if;
  if t = '' then perform private.fail('댓글을 적어 주세요.'); end if;
  if private.c_contact(t) then perform private.fail('연락처·계좌·메신저 아이디는 댓글에 적을 수 없어요.'); end if;
  if p_parent is not null then
    select * into parent from private.ccomments where id = p_parent and post_id = p_post;
    if parent.id is null then perform private.fail('답글을 달 댓글을 찾지 못했어요.'); end if;
    if parent.parent_id is not null then select * into parent from private.ccomments where id = parent.parent_id; end if;
  end if;
  perform private.c_rate((select max(at) from private.ccomments where member_id = u), 10, '댓글은');
  insert into private.ccomments (post_id, member_id, parent_id, text) values (p_post, u, parent.id, t) returning * into c;
  if p.member_id <> u then perform private.note(p.member_id, case when parent.id is null then '내 글에 댓글이 달렸어요' else '내 글에 답글이 달렸어요' end, private.c_nick(u) || ': ' || left(t, 60), 'community/post?id=' || p_post || '#comments'); end if;
  if parent.id is not null and parent.member_id <> u and parent.member_id <> p.member_id then perform private.note(parent.member_id, '내 댓글에 답글이 달렸어요', private.c_nick(u) || ': ' || left(t, 60), 'community/post?id=' || p_post || '#comments'); end if;
  return jsonb_build_object('id', c.id, 'postId', c.post_id, 'memberId', c.member_id, 'nick', private.c_nick(u), 'parentId', coalesce(c.parent_id::text, ''), 'text', c.text, 'at', private.ts(c.at), 'deleted', false, 'mine', true);
end $$;

create or replace function public.plt_c_delete_comment(p_id uuid) returns boolean language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); c private.ccomments; p private.cposts;
begin
  select * into c from private.ccomments where id = p_id; if c.id is null then perform private.fail('댓글을 찾지 못했어요.'); end if;
  select * into p from private.cposts where id = c.post_id;
  if c.member_id <> u and p.member_id <> u then perform private.fail('내 댓글이나 내 글의 댓글만 지울 수 있어요.'); end if;
  if exists (select 1 from private.ccomments where parent_id = p_id and not deleted) then update private.ccomments set deleted = true, hidden_text = text, text = '' where id = p_id;
  else delete from private.ccomments where id = p_id; end if;
  return true;
end $$;

create or replace function public.plt_c_tags() returns jsonb language sql security definer set search_path = private, public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('tag', t, 'count', n)), '[]') from (
    select t, count(*) n from private.cposts p, unnest(p.tags) t where p.status = 'public' group by t order by n desc, t limit 12) q
$$;

-- ---------------------------------------------------------------------
--  교환 판매
-- ---------------------------------------------------------------------
create or replace function private.c_market_rows(p_f jsonb, u uuid) returns setof private.cmarket language sql stable as $$
  select p.* from private.cmarket p
    where (case when coalesce((p_f ->> 'mine')::boolean, false) then p.member_id = u else not p.hidden end)
      and (coalesce(p_f ->> 'type', '') = '' or (p_f ->> 'type' = 'swap' and p.type in ('swap', 'both')) or (p_f ->> 'type' = 'sell' and p.type in ('sell', 'both')) or p.type = p_f ->> 'type')
      and (case when coalesce(p_f ->> 'status', '') <> '' then p.status = p_f ->> 'status' when coalesce((p_f ->> 'mine')::boolean, false) or coalesce((p_f ->> 'all')::boolean, false) then true else p.status in ('open', 'reserved') end)
      and (coalesce(p_f ->> 'condition', '') = '' or p.condition = p_f ->> 'condition')
      and (coalesce(p_f ->> 'method', '') = '' or p.method = p_f ->> 'method' or p.method = 'either')
      and (coalesce(p_f ->> 'region', '') = '' or p.region ilike '%' || (p_f ->> 'region') || '%')
      and (coalesce(p_f ->> 'q', '') = '' or (p.title || ' ' || p.item || ' ' || p.want || ' ' || p.body) ilike '%' || (p_f ->> 'q') || '%')
$$;
create or replace function public.plt_c_market(p_f jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare pg int := private.c_page(p_f); size int := 20; u uuid := auth.uid(); total int; items jsonb;
begin
  if coalesce((p_f ->> 'mine')::boolean, false) and u is null then return jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', 1, 'more', false); end if;
  select count(*) into total from private.c_market_rows(p_f, u);
  select coalesce(jsonb_agg(private.citem_json(p) order by p.created_at desc), '[]') into items from (select * from private.c_market_rows(p_f, u) r order by r.created_at desc limit size offset (pg - 1) * size) p;
  return jsonb_build_object('items', items, 'total', total, 'page', pg, 'more', pg * size < total);
end $$;

create or replace function public.plt_c_item(p_id uuid) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare p private.cmarket;
begin
  select * into p from private.cmarket where id = p_id;
  if p.id is null then perform private.fail('글을 찾지 못했어요.'); end if;
  if p.hidden and p.member_id is distinct from auth.uid() and not private.is_staff() then perform private.fail('지금 볼 수 없는 글입니다. 다른 게시물을 둘러보세요'); end if;
  return private.citem_json(p);
end $$;

create or replace function private.c_check_item(d jsonb) returns void language plpgsql as $$
declare ty text := coalesce(d ->> 'type', ''); me text := coalesce(d ->> 'method', '');
begin
  if ty not in ('swap', 'sell', 'both') then perform private.fail('글 종류를 골라 주세요.'); end if;
  if length(trim(coalesce(d ->> 'title', ''))) < 2 then perform private.fail('제목을 2자 이상 적어 주세요.'); end if;
  if length(trim(coalesce(d ->> 'item', ''))) = 0 then perform private.fail('품목 이름을 적어 주세요.'); end if;
  if coalesce(d ->> 'condition', '') not in ('sealed', 'opened', 'used') then perform private.fail('상태를 골라 주세요.'); end if;
  if coalesce((d ->> 'defect')::boolean, false) and length(trim(coalesce(d ->> 'defectNote', ''))) = 0 then perform private.fail('하자가 있다면 어떤 하자인지 적어 주세요.'); end if;
  if ty <> 'swap' and private.jint(d, 'price') <= 0 then perform private.fail('판매 희망가를 적어 주세요.'); end if;
  if ty <> 'sell' and length(trim(coalesce(d ->> 'want', ''))) = 0 then perform private.fail('교환을 원한다면 희망 교환품을 적어 주세요.'); end if;
  if me not in ('meet', 'parcel', 'either') then perform private.fail('거래 방식을 골라 주세요.'); end if;
  if length(trim(coalesce(d ->> 'body', ''))) < 10 then perform private.fail('본문을 10자 이상 적어 주세요.'); end if;
  if private.c_contact(concat_ws(' ', d ->> 'title', d ->> 'item', d ->> 'parts', d ->> 'defectNote', d ->> 'want', d ->> 'region', d ->> 'body')) then perform private.fail('연락처·계좌·메신저 아이디는 글에 적을 수 없어요. 문의함에서 주고받아 주세요.'); end if;
end $$;

create or replace function private.c_item_cols(d jsonb) returns private.cmarket language plpgsql immutable as $$
declare r private.cmarket; ty text := d ->> 'type'; me text := d ->> 'method';
begin
  r.type := ty; r.title := left(trim(d ->> 'title'), 60); r.item := left(trim(d ->> 'item'), 60); r.parts := left(coalesce(d ->> 'parts', ''), 120);
  r.qty := greatest(1, least(99, private.jint(d, 'qty', 1))); r.condition := d ->> 'condition'; r.defect := coalesce((d ->> 'defect')::boolean, false); r.defect_note := left(coalesce(d ->> 'defectNote', ''), 200);
  r.price := case when ty = 'swap' then 0 else greatest(0, private.jint(d, 'price')) end; r.basis := case when coalesce(d ->> 'basis', '') = 'bundle' then 'bundle' else 'each' end;
  r.want := left(coalesce(d ->> 'want', ''), 120); r.method := me; r.shipping := case when me in ('parcel', 'either') and coalesce(d ->> 'shipping', '') in ('included', 'extra', 'talk') then d ->> 'shipping' else 'talk' end;
  r.region := left(coalesce(d ->> 'region', ''), 40); r.body := left(trim(d ->> 'body'), 3000);
  return r;
end $$;

create or replace function public.plt_c_create_item(p_d jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); r private.cmarket; p private.cmarket; imgs jsonb := private.c_images(p_d -> 'images'); fp uuid;
begin
  perform private.c_limit_check(u);
  perform private.c_check_item(p_d);
  if jsonb_array_length(imgs) < 1 then perform private.fail('사진을 1장 이상 올려 주세요.'); end if;
  perform private.c_rate((select max(created_at) from private.cmarket where member_id = u), 300, '새 글은');
  r := private.c_item_cols(p_d);
  begin fp := nullif(p_d ->> 'fromPost', '')::uuid; exception when others then fp := null; end;
  insert into private.cmarket (member_id, type, title, item, parts, qty, condition, defect, defect_note, price, basis, want, method, shipping, region, body, images, from_post)
    values (u, r.type, r.title, r.item, r.parts, r.qty, r.condition, r.defect, r.defect_note, r.price, r.basis, r.want, r.method, r.shipping, r.region, r.body, imgs, fp)
    returning * into p;
  return private.citem_json(p);
end $$;

create or replace function public.plt_c_update_item(p_id uuid, p_d jsonb) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.cmarket; r private.cmarket; keep jsonb; added jsonb := private.c_images(p_d -> 'newImages'); merged jsonb; removed text[];
begin
  select * into p from private.cmarket where id = p_id and member_id = u;
  if p.id is null then perform private.fail('내가 쓴 글만 고칠 수 있어요.'); end if;
  perform private.c_check_item(p_d);
  if p_d ? 'keepImages' and jsonb_typeof(p_d -> 'keepImages') = 'array' then
    select coalesce(jsonb_agg(x), '[]') into keep from jsonb_array_elements(p.images) x where x ->> 'path' in (select jsonb_array_elements_text(p_d -> 'keepImages'));
  else keep := p.images; end if;
  merged := keep || added;
  if jsonb_array_length(merged) < 1 then perform private.fail('사진을 1장 이상 남겨 주세요.'); end if;
  if jsonb_array_length(merged) > 8 then perform private.fail('사진은 8장까지예요.'); end if;
  select coalesce(array_agg(x ->> 'path'), '{}') into removed from jsonb_array_elements(p.images) x where not (keep @> jsonb_build_array(x)) and not exists (select 1 from private.cposts c where c.images @> jsonb_build_array(x));
  r := private.c_item_cols(p_d);
  update private.cmarket set type = r.type, title = r.title, item = r.item, parts = r.parts, qty = r.qty, condition = r.condition, defect = r.defect, defect_note = r.defect_note, price = r.price, basis = r.basis,
    want = r.want, method = r.method, shipping = r.shipping, region = r.region, body = r.body, images = merged,
    status = case when coalesce(p_d ->> 'status', '') in ('open', 'reserved', 'done', 'closed') then p_d ->> 'status' else status end, updated_at = now()
    where id = p_id returning * into p;
  return private.citem_json(p) || jsonb_build_object('removedPaths', to_jsonb(removed));
end $$;

create or replace function public.plt_c_item_status(p_id uuid, p_status text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.cmarket;
begin
  if p_status not in ('open', 'reserved', 'done', 'closed') then perform private.fail('상태 값을 확인해 주세요.'); end if;
  update private.cmarket set status = p_status, updated_at = now() where id = p_id and member_id = u returning * into p;
  if p.id is null then perform private.fail('내가 쓴 글만 바꿀 수 있어요.'); end if;
  return private.citem_json(p);
end $$;

create or replace function public.plt_c_delete_item(p_id uuid) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); p private.cmarket; paths text[];
begin
  select * into p from private.cmarket where id = p_id and member_id = u;
  if p.id is null then perform private.fail('내가 쓴 글만 지울 수 있어요.'); end if;
  select coalesce(array_agg(x ->> 'path'), '{}') into paths from jsonb_array_elements(p.images) x where not exists (select 1 from private.cposts c where c.images @> jsonb_build_array(x));
  update private.cconvs set item_title = p.title where item_id = p_id;
  delete from private.cmarket where id = p_id;
  return jsonb_build_object('paths', to_jsonb(paths));
end $$;

-- ---------------------------------------------------------------------
--  비공개 문의함
-- ---------------------------------------------------------------------
create or replace function public.plt_c_inquire(p_item uuid, p_text text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); it private.cmarket; c private.cconvs; t text := left(trim(coalesce(p_text, '')), 1000);
begin
  perform private.c_limit_check(u);
  select * into it from private.cmarket where id = p_item and not hidden;
  if it.id is null then perform private.fail('지금 볼 수 없는 글입니다. 다른 게시물을 둘러보세요'); end if;
  if it.member_id = u then perform private.fail('내 글에는 문의를 보낼 수 없어요.'); end if;
  if it.status in ('done', 'closed') then perform private.fail('끝난 글이라 문의를 받지 않아요.'); end if;
  if t = '' then perform private.fail('문의 내용을 적어 주세요.'); end if;
  if private.c_blocked(it.member_id, u) then perform private.fail('이 작성자에게는 문의를 보낼 수 없어요.'); end if;
  perform private.c_rate((select max(at) from private.cmsgs where from_id = u), 10, '문의는');
  select * into c from private.cconvs where item_id = p_item and asker_id = u;
  if c.id is null then insert into private.cconvs (item_id, item_title, author_id, asker_id) values (p_item, it.title, it.member_id, u) returning * into c; end if;
  insert into private.cmsgs (conv_id, from_id, text) values (c.id, u, t);
  insert into private.creads (conv_id, member_id, read_at) values (c.id, u, now()) on conflict (conv_id, member_id) do update set read_at = now();
  perform private.note(it.member_id, '교환 판매 글에 문의가 왔어요', it.title || ' · ' || left(t, 50), 'community/inbox?id=' || c.id);
  return private.cconv_json(c, u);
end $$;

create or replace function public.plt_c_inbox() returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need();
begin
  return coalesce((select jsonb_agg(j order by j ->> 'lastAt' desc) from (select private.cconv_json(c, u) j from private.cconvs c where c.author_id = u or c.asker_id = u) q), '[]'::jsonb);
end $$;

create or replace function public.plt_c_thread(p_id uuid) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); c private.cconvs; v jsonb;
begin
  select * into c from private.cconvs where id = p_id and (author_id = u or asker_id = u);
  if c.id is null then perform private.fail('문의함을 찾지 못했어요.'); end if;
  v := private.cconv_json(c, u);
  insert into private.creads (conv_id, member_id, read_at) values (c.id, u, now()) on conflict (conv_id, member_id) do update set read_at = now();
  return v || jsonb_build_object('unread', 0, 'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'convId', m.conv_id, 'fromId', m.from_id, 'nick', private.c_nick(m.from_id), 'text', m.text, 'at', private.ts(m.at), 'mine', m.from_id = u) order by m.at) from private.cmsgs m where m.conv_id = c.id), '[]'::jsonb));
end $$;

create or replace function public.plt_c_send(p_id uuid, p_text text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); c private.cconvs; m private.cmsgs; t text := left(trim(coalesce(p_text, '')), 1000); to_ uuid;
begin
  perform private.c_limit_check(u);
  select * into c from private.cconvs where id = p_id and (author_id = u or asker_id = u);
  if c.id is null then perform private.fail('문의함을 찾지 못했어요.'); end if;
  if t = '' then perform private.fail('내용을 적어 주세요.'); end if;
  if private.c_blocked(c.author_id, c.asker_id) then perform private.fail(case when c.author_id = u then '차단을 풀어야 답할 수 있어요.' else '이 작성자에게는 메시지를 보낼 수 없어요.' end); end if;
  perform private.c_rate((select max(at) from private.cmsgs where from_id = u), 10, '메시지는');
  insert into private.cmsgs (conv_id, from_id, text) values (c.id, u, t) returning * into m;
  insert into private.creads (conv_id, member_id, read_at) values (c.id, u, now()) on conflict (conv_id, member_id) do update set read_at = now();
  to_ := case when c.author_id = u then c.asker_id else c.author_id end;
  perform private.note(to_, '문의함에 답이 왔어요', coalesce((select title from private.cmarket where id = c.item_id), c.item_title) || ' · ' || left(t, 50), 'community/inbox?id=' || c.id);
  return jsonb_build_object('id', m.id, 'convId', m.conv_id, 'fromId', m.from_id, 'nick', private.c_nick(u), 'text', m.text, 'at', private.ts(m.at), 'mine', true);
end $$;

create or replace function public.plt_c_block(p_id uuid, p_on boolean default true) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); c private.cconvs;
begin
  select * into c from private.cconvs where id = p_id and author_id = u;
  if c.id is null then perform private.fail('글 작성자만 차단할 수 있어요.'); end if;
  if p_on then insert into private.cblocks (member_id, blocked_id) values (u, c.asker_id) on conflict do nothing;
  else delete from private.cblocks where member_id = u and blocked_id = c.asker_id; end if;
  return jsonb_build_object('blocked', p_on);
end $$;

-- ---------------------------------------------------------------------
--  신고 · 내 활동
-- ---------------------------------------------------------------------
create or replace function public.plt_c_report(p_kind text, p_id text, p_reason text default 'other', p_text text default '') returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); r private.creports; ttl text := '';
begin
  if p_kind not in ('post', 'item', 'comment', 'member') or coalesce(p_id, '') = '' then perform private.fail('신고 대상을 확인해 주세요.'); end if;
  if exists (select 1 from private.creports where kind = p_kind and target_id = p_id and reporter_id = u and status <> 'closed') then perform private.fail('이미 신고한 글이에요. 운영팀이 확인하고 있어요.'); end if;
  begin
    ttl := case p_kind when 'post' then (select title from private.cposts where id = p_id::uuid) when 'item' then (select title from private.cmarket where id = p_id::uuid) when 'comment' then (select left(text, 40) from private.ccomments where id = p_id::uuid) else '' end;
  exception when others then ttl := ''; end;
  insert into private.creports (kind, target_id, title, reporter_id, reason, text) values (p_kind, p_id, coalesce(ttl, ''), u, coalesce(nullif(p_reason, ''), 'other'), left(coalesce(p_text, ''), 500)) returning * into r;
  return jsonb_build_object('id', r.id);
end $$;

create or replace function public.plt_c_mine() returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare u uuid := private.need(); l private.climits; convs jsonb;
begin
  select * into l from private.climits where member_id = u and until > now();
  convs := public.plt_c_inbox();
  return jsonb_build_object(
    'posts', coalesce((select jsonb_agg(private.cpost_json(p) order by p.created_at desc) from private.cposts p where p.member_id = u), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(private.citem_json(p) order by p.created_at desc) from private.cmarket p where p.member_id = u), '[]'::jsonb),
    'saved', coalesce((select jsonb_agg(private.cpost_json(p) order by s.at desc) from private.csaves s join private.cposts p on p.id = s.post_id where s.member_id = u and p.status = 'public'), '[]'::jsonb),
    'inquiries', jsonb_array_length(convs), 'unread', (select coalesce(sum((x ->> 'unread')::int), 0) from jsonb_array_elements(convs) x),
    'heartsGot', (select count(*) from private.chearts h join private.cposts p on p.id = h.post_id where p.member_id = u),
    'limit', case when l.member_id is null then null else jsonb_build_object('until', private.ts(l.until), 'reason', l.reason) end);
end $$;

-- ---------------------------------------------------------------------
--  운영 콘솔 (private.staff 에 등록된 계정만)
-- ---------------------------------------------------------------------
create or replace function public.plt_c_admin_list(p_kind text) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
begin
  perform private.need_staff();
  if p_kind = 'posts' then return coalesce((select jsonb_agg(private.cpost_json(p) order by p.created_at desc) from (select * from private.cposts order by created_at desc limit 300) p), '[]'::jsonb); end if;
  if p_kind = 'market' then return coalesce((select jsonb_agg(private.citem_json(p) order by p.created_at desc) from (select * from private.cmarket order by created_at desc limit 300) p), '[]'::jsonb); end if;
  if p_kind = 'comments' then return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'postId', c.post_id, 'postTitle', p.title, 'memberId', c.member_id, 'nick', private.c_nick(c.member_id), 'parentId', coalesce(c.parent_id::text, ''), 'text', c.text, 'hiddenText', c.hidden_text, 'deleted', c.deleted, 'at', private.ts(c.at)) order by c.at desc) from (select * from private.ccomments order by at desc limit 300) c join private.cposts p on p.id = c.post_id), '[]'::jsonb); end if;
  if p_kind = 'reports' then return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'targetId', r.target_id, 'title', r.title, 'reporterId', r.reporter_id, 'reporterNick', private.c_nick(r.reporter_id), 'reason', r.reason, 'text', r.text, 'status', r.status, 'note', r.note, 'at', private.ts(r.at), 'updatedAt', private.ts(r.updated_at)) order by r.at desc) from private.creports r), '[]'::jsonb); end if;
  if p_kind = 'audit' then return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'at', private.ts(a.at), 'action', a.action, 'kind', a.kind, 'targetId', a.target_id, 'reason', a.reason, 'by', a.by_user) order by a.at desc) from (select * from private.caudit order by at desc limit 500) a), '[]'::jsonb); end if;
  if p_kind = 'limits' then return coalesce((select jsonb_agg(jsonb_build_object('memberId', l.member_id, 'nick', private.c_nick(l.member_id), 'until', private.ts(l.until), 'reason', l.reason, 'at', private.ts(l.at))) from private.climits l where l.until > now()), '[]'::jsonb); end if;
  if p_kind = 'stats' then return jsonb_build_object('posts', (select count(*) from private.cposts), 'market', (select count(*) from private.cmarket), 'comments', (select count(*) from private.ccomments where not deleted), 'hearts', (select count(*) from private.chearts), 'convs', (select count(*) from private.cconvs),
    'reportsOpen', (select count(*) from private.creports where status in ('open', 'checking')), 'hiddenPosts', (select count(*) from private.cposts where status = 'hidden') + (select count(*) from private.cmarket where hidden)); end if;
  return '[]'::jsonb;
end $$;

create or replace function public.plt_c_admin_hide(p_kind text, p_id uuid, p_reason text default '', p_restore boolean default false) returns boolean language plpgsql security definer set search_path = private, public, pg_temp as $$
declare mid uuid; ttl text; reason text := left(coalesce(p_reason, ''), 200);
begin
  perform private.need_staff();
  if not p_restore and reason = '' then perform private.fail('숨김 사유를 적어 주세요.'); end if;
  if p_kind = 'post' then
    update private.cposts set status = case when p_restore then 'public' else 'hidden' end, hidden_reason = case when p_restore then '' else reason end, updated_at = now() where id = p_id returning member_id, title into mid, ttl;
  elsif p_kind = 'item' then
    update private.cmarket set hidden = not p_restore, hidden_reason = case when p_restore then '' else reason end, updated_at = now() where id = p_id returning member_id, title into mid, ttl;
  elsif p_kind = 'comment' then
    if p_restore then update private.ccomments set deleted = false, text = hidden_text where id = p_id returning member_id, text into mid, ttl;
    else update private.ccomments set deleted = true, hidden_text = text, text = '' where id = p_id returning member_id, left(hidden_text, 40) into mid, ttl; end if;
  else perform private.fail('알 수 없는 항목이에요.'); end if;
  if mid is null then perform private.fail('항목을 찾지 못했어요.'); end if;
  perform private.c_audit(case when p_restore then 'restore' else 'hide' end, p_kind, p_id::text, reason);
  perform private.note(mid, case when p_restore then '숨겼던 글을 다시 보이게 했어요' else '운영팀이 글을 숨겼어요' end, coalesce(ttl, '') || case when p_restore then '' else ' · 사유: ' || reason end,
    case p_kind when 'item' then 'community/item?id=' || p_id when 'post' then 'community/post?id=' || p_id else '' end);
  return true;
end $$;

create or replace function public.plt_c_admin_report(p_id uuid, p_status text default null, p_note text default null) returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare r private.creports;
begin
  perform private.need_staff();
  update private.creports set status = case when p_status in ('open', 'checking', 'actioned', 'held', 'closed') then p_status else status end, note = coalesce(left(p_note, 300), note), updated_at = now() where id = p_id returning * into r;
  if r.id is null then perform private.fail('신고를 찾지 못했어요.'); end if;
  perform private.c_audit('report:' || r.status, r.kind, r.target_id, r.note);
  return jsonb_build_object('id', r.id, 'status', r.status, 'note', r.note);
end $$;

create or replace function public.plt_c_admin_limit(p_member uuid, p_days int default 7, p_reason text default '') returns jsonb language plpgsql security definer set search_path = private, public, pg_temp as $$
declare reason text := left(coalesce(p_reason, ''), 120);
begin
  perform private.need_staff();
  if p_member is null then perform private.fail('회원을 골라 주세요.'); end if;
  if coalesce(p_days, 0) <= 0 then delete from private.climits where member_id = p_member; perform private.c_audit('limit:off', 'member', p_member::text, ''); return null; end if;
  insert into private.climits (member_id, until, reason) values (p_member, now() + make_interval(days => p_days), reason) on conflict (member_id) do update set until = excluded.until, reason = excluded.reason, at = now();
  perform private.c_audit('limit:' || p_days || 'd', 'member', p_member::text, reason);
  perform private.note(p_member, '글쓰기가 잠시 제한됐어요', p_days || '일 동안 · ' || reason, '');
  return jsonb_build_object('until', private.ts(now() + make_interval(days => p_days)), 'reason', reason);
end $$;

create or replace function public.plt_c_admin_feature(p_id uuid, p_on boolean default true) returns boolean language plpgsql security definer set search_path = private, public, pg_temp as $$
declare p private.cposts;
begin
  perform private.need_staff();
  update private.cposts set featured = p_on where id = p_id returning * into p;
  if p.id is null then perform private.fail('글을 찾지 못했어요.'); end if;
  perform private.c_audit(case when p_on then 'feature' else 'unfeature' end, 'post', p_id::text, '');
  if p_on then perform private.note(p.member_id, '이번 주 소개 글로 뽑혔어요', p.title, 'community/post?id=' || p_id); end if;
  return true;
end $$;

-- ---------------------------------------------------------------------
--  권한: plt_c_ 함수만 열어 둡니다 (운영 함수는 need_staff 가 막아요)
-- ---------------------------------------------------------------------
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'plt\_c\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname like 'c\_%' loop
    execute format('revoke all on function %s from public', f.sig);
  end loop;
end $$;
