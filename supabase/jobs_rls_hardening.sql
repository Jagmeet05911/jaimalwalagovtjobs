-- Jaimalwala Govt Jobs: database-side access control for public.jobs
-- Run once in Supabase Dashboard > SQL Editor as the project owner.
-- This replaces existing policies on public.jobs with a least-privilege set.
begin;

alter table public.jobs enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policy.polname
    from pg_policy policy
    join pg_class tbl on tbl.oid = policy.polrelid
    join pg_namespace ns on ns.oid = tbl.relnamespace
    where ns.nspname = 'public' and tbl.relname = 'jobs'
  loop
    execute format('drop policy if exists %I on public.jobs', p.polname);
  end loop;
end
$$;

revoke all on table public.jobs from anon, authenticated;
grant select on table public.jobs to anon;
grant select, insert, update, delete on table public.jobs to authenticated;

-- Public visitors can read published jobs only.
create policy jobs_public_read_published
on public.jobs for select to anon
using (status = 'published');

-- Only the named admin account can read/manage the review queue and published records.
create policy jobs_admin_read_all
on public.jobs for select to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'jaimalwalajobpoint@gmail.com');

create policy jobs_admin_insert
on public.jobs for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'jaimalwalajobpoint@gmail.com');

create policy jobs_admin_update
on public.jobs for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'jaimalwalajobpoint@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'jaimalwalajobpoint@gmail.com');

create policy jobs_admin_delete
on public.jobs for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'jaimalwalajobpoint@gmail.com');

commit;
