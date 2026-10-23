-- Jaimalwala Govt Jobs: public visit counter + private admin analytics
-- Run once in Supabase SQL Editor as the project owner.
begin;

create table if not exists public.site_analytics (
  id bigint generated always as identity primary key,
  visitor_key text not null,
  visit_date date not null,
  page_path text not null,
  created_at timestamptz not null default now(),
  constraint site_analytics_visitor_date_path_unique unique (visitor_key, visit_date, page_path),
  constraint site_analytics_visitor_key_length check (length(visitor_key) between 20 and 80),
  constraint site_analytics_page_path_length check (length(page_path) between 1 and 250)
);

create table if not exists public.site_visit_counter (
  id integer primary key check (id = 1),
  total_visits bigint not null default 0 check (total_visits >= 0)
);
insert into public.site_visit_counter (id, total_visits)
values (1, 0)
on conflict (id) do nothing;

alter table public.site_analytics enable row level security;
alter table public.site_visit_counter enable row level security;
revoke all on table public.site_analytics from anon, authenticated;
revoke all on table public.site_visit_counter from anon, authenticated;
grant select on table public.site_analytics to authenticated;

drop policy if exists site_analytics_admin_read on public.site_analytics;
create policy site_analytics_admin_read
on public.site_analytics for select to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'jaimalwalajobpoint@gmail.com');

create or replace function public.record_site_visit(p_visitor_key text, p_visit_date date, p_page_path text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_visit boolean;
  v_total bigint;
begin
  if p_visitor_key is null or length(p_visitor_key) < 20 or length(p_visitor_key) > 80 then
    raise exception 'Invalid visitor key';
  end if;
  if p_page_path is null or length(p_page_path) < 1 or length(p_page_path) > 250 then
    raise exception 'Invalid page path';
  end if;
  if p_visit_date is null or p_visit_date < current_date - 1 or p_visit_date > current_date + 1 then
    raise exception 'Invalid visit date';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_visitor_key), hashtext(p_visit_date::text));

  select not exists (
    select 1 from public.site_analytics
    where visitor_key = p_visitor_key and visit_date = p_visit_date
  ) into v_new_visit;

  insert into public.site_analytics (visitor_key, visit_date, page_path)
  values (p_visitor_key, p_visit_date, left(p_page_path, 250))
  on conflict (visitor_key, visit_date, page_path) do nothing;

  if v_new_visit then
    update public.site_visit_counter
    set total_visits = total_visits + 1
    where id = 1;
  end if;

  select total_visits into v_total
  from public.site_visit_counter where id = 1;
  return coalesce(v_total, 0);
end;
$$;

revoke all on function public.record_site_visit(text, date, text) from public;
grant execute on function public.record_site_visit(text, date, text) to anon, authenticated;

commit;
