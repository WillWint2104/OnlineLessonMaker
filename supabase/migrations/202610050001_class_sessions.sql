-- Optional deployment: nothing here is executed by the static application.
create table public.olm_teachers (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.olm_class_sessions (
 id uuid primary key default gen_random_uuid(),
 code text unique not null check (code ~ '^[0-9]{6}$'),
 reader_token text not null check (reader_token ~ '^[0-9a-f]{32}$'),
 teacher_id uuid not null references public.olm_teachers(user_id),
 lesson_id text not null check (length(lesson_id) between 1 and 200),
 answer_state text not null default 'locked' check (answer_state in ('locked','finals','worked')),
 answer_bundle jsonb not null,
 expires_at timestamptz not null default (now() + interval '4 hours'),
 created_at timestamptz not null default now()
);
create table public.olm_class_limits (bucket text primary key, hits integer not null, expires_at timestamptz not null);
alter table public.olm_teachers enable row level security;
alter table public.olm_class_sessions enable row level security;
alter table public.olm_class_limits enable row level security;
-- No browser roles can read the bundle or write a session, even with an Auth JWT.
revoke all on public.olm_teachers, public.olm_class_sessions, public.olm_class_limits from anon, authenticated;
grant all on public.olm_teachers, public.olm_class_sessions, public.olm_class_limits to service_role;
create or replace function public.olm_class_rate_limit(bucket_key text, max_hits integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
 insert into public.olm_class_limits(bucket,hits,expires_at) values(bucket_key,1,now()+interval '2 minutes')
 on conflict(bucket) do update set hits=olm_class_limits.hits+1 returning hits into n;
 return n<=max_hits;
end $$;
revoke all on function public.olm_class_rate_limit(text,integer) from public, anon, authenticated;
grant execute on function public.olm_class_rate_limit(text,integer) to service_role;
-- Access expires immediately by server clock; this scheduled cleanup removes old data.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('olm-class-cleanup','*/15 * * * *',
 $$delete from public.olm_class_sessions where expires_at < now(); delete from public.olm_class_limits where expires_at < now();$$);
