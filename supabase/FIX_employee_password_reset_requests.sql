-- Employee password reset requests (admin must set new password)

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

-- Allow only one pending per employee
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
