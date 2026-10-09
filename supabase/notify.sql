-- =====================================================================
-- 플레이션 알림 연결 (실서비스 전환 때 한 번 실행)
-- ---------------------------------------------------------------------
-- 회원에게 알림(예약 확정, 입고, 쿠폰 등)이 생기면 홈페이지의 /api/notify 로
-- 알려 주고, 그 주소가 문자나 알림톡을 보냅니다.
--
-- 순서: schema.sql → seed.sql → 이 파일
-- 실행 전에 아래 '바꿀 값' 두 줄만 고치세요.
--   notify_url    : 실제 사이트 주소 + /api/notify
--   notify_secret : Cloudflare 환경 변수 NOTIFY_SECRET 에 넣은 값과 똑같이
-- 값을 바꾸고 싶을 때는 이 파일을 고쳐서 다시 실행하면 됩니다.
-- =====================================================================

create extension if not exists pg_net;

insert into private.secrets (key, value) values
  ('notify_url', 'https://playtion.kr/api/notify'),             -- 바꿀 값 ①
  ('notify_secret', '여기에-NOTIFY_SECRET-값을-넣으세요')       -- 바꿀 값 ②
on conflict (key) do update set value = excluded.value;

create or replace function private.notify_note() returns trigger
language plpgsql security definer set search_path = private, public, pg_temp as $$
declare
  u text := (select value from private.secrets where key = 'notify_url');
  s text := (select value from private.secrets where key = 'notify_secret');
begin
  if u is null or s is null or s like '여기에%' then return new; end if;
  perform net.http_post(
    url := u,
    body := jsonb_build_object('type', 'INSERT', 'table', 'notes', 'schema', 'private', 'record', to_jsonb(new), 'old_record', null),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', s),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  return new;   -- 알림을 못 보내도 예약·결제는 그대로 진행되게
end $$;

drop trigger if exists notes_notify on private.notes;
create trigger notes_notify after insert on private.notes
  for each row execute function private.notify_note();
