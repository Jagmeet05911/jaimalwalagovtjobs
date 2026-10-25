-- Visitor Job Alerts: email subscribers + safe subscribe/unsubscribe RPCs.
-- Run once in Supabase Dashboard > SQL Editor as the project owner.
begin;

create table if not exists public.job_alert_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_alert_deliveries (
  id bigint generated always as identity primary key,
  subscriber_email text not null,
  job_key text not null,
  sent_at timestamptz not null default now(),
  unique (subscriber_email, job_key)
);

alter table public.job_alert_subscribers enable row level security;
alter table public.job_alert_deliveries enable row level security;
revoke all on table public.job_alert_subscribers from anon, authenticated;
revoke all on table public.job_alert_deliveries from anon, authenticated;

drop function if exists public.subscribe_job_alert(text);
drop function if exists public.unsubscribe_job_alert(uuid);

create or replace function public.subscribe_job_alert(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(coalesce(p_email, '')));
  token uuid;
begin
  if normalized !~ '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Please enter a valid email address.';
  end if;

  insert into public.job_alert_subscribers(email, active, updated_at)
  values (normalized, true, now())
  on conflict (email) do update
    set active = true, updated_at = now()
  returning unsubscribe_token into token;

  return jsonb_build_object('ok', true, 'unsubscribe_token', token);
end;
$$;

create or replace function public.unsubscribe_job_alert(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.job_alert_subscribers
     set active = false, updated_at = now()
   where unsubscribe_token = p_token;
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;

grant execute on function public.subscribe_job_alert(text) to anon, authenticated;
grant execute on function public.unsubscribe_job_alert(uuid) to anon, authenticated;

commit;
