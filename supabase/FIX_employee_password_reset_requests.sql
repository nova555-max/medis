-- Apply in Supabase SQL Editor if password-reset requests fail (table missing).

create table if not exists public.employee_password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  admin_note text
);

create unique index if not exists employee_pwd_reset_pending_uidx
  on public.employee_password_reset_requests (employee_id)
  where status = 'pending';

create index if not exists employee_pwd_reset_company_status_idx
  on public.employee_password_reset_requests (company_id, status, requested_at desc);

alter table public.employee_password_reset_requests enable row level security;

drop policy if exists employee_pwd_reset_admin on public.employee_password_reset_requests;
create policy employee_pwd_reset_admin on public.employee_password_reset_requests
  for all
  using (
    company_id = public.current_profile_company_id()
    and public.is_company_admin()
  )
  with check (
    company_id = public.current_profile_company_id()
    and public.is_company_admin()
  );

grant select, insert, update, delete on public.employee_password_reset_requests to authenticated;
grant all on public.employee_password_reset_requests to service_role;

-- Reliable request path (works from server with service role)
create or replace function public.admin_list_pending_password_resets()
returns table (
  id uuid,
  employee_id uuid,
  requested_at timestamptz,
  full_name text,
  employee_code text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    r.id,
    r.employee_id,
    r.requested_at,
    e.full_name,
    e.employee_code
  from public.employee_password_reset_requests r
  join public.employees e on e.id = r.employee_id
  where r.company_id = public.current_profile_company_id()
    and r.status = 'pending'
  order by r.requested_at desc;
end;
$$;

grant execute on function public.admin_list_pending_password_resets() to authenticated;
