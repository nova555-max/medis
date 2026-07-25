-- Allow blacklisted employees (cannot login; kept for records)
alter table public.employees
  drop constraint if exists employees_status_check;

alter table public.employees
  add constraint employees_status_check
  check (status in ('active', 'archived', 'blacklisted'));
