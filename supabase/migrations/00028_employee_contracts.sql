-- Employee contracts + persistent score criteria (survive app redeploys)

create table if not exists public.contract_score_criteria (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  label text not null,
  max_points numeric not null default 10 check (max_points > 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_score_criteria_company_idx
  on public.contract_score_criteria (company_id, is_active, sort_order);

create table if not exists public.employee_contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  design_id text not null default 'classic_legal',
  contract_number text,
  holder_name text not null default '',
  profession text not null default '',
  phone text,
  age int,
  address text,
  start_date date,
  end_date date,
  salary_note text,
  body_ckb text,
  scores jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'ended', 'cancelled')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_contracts_company_idx
  on public.employee_contracts (company_id, created_at desc);

alter table public.contract_score_criteria enable row level security;
alter table public.employee_contracts enable row level security;

drop policy if exists contract_score_criteria_admin on public.contract_score_criteria;
create policy contract_score_criteria_admin on public.contract_score_criteria
  for all to authenticated
  using (
    company_id = public.current_profile_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'manager')
    )
  )
  with check (
    company_id = public.current_profile_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'manager')
    )
  );

drop policy if exists employee_contracts_admin on public.employee_contracts;
create policy employee_contracts_admin on public.employee_contracts
  for all to authenticated
  using (
    company_id = public.current_profile_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'manager')
    )
  )
  with check (
    company_id = public.current_profile_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('admin', 'manager')
    )
  );

grant select, insert, update, delete on public.contract_score_criteria to authenticated;
grant select, insert, update, delete on public.employee_contracts to authenticated;
grant all on public.contract_score_criteria to service_role;
grant all on public.employee_contracts to service_role;
