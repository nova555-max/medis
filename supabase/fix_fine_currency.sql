-- Run on project ccpsitgvclhchkjsyvlo if not applied yet
-- Per-setting currency for company fines / overtime

alter table public.companies
  add column if not exists late_fine_currency text not null default 'IQD',
  add column if not exists absence_fine_currency text not null default 'IQD',
  add column if not exists overtime_currency text not null default 'IQD';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_late_fine_currency_check'
  ) then
    alter table public.companies
      add constraint companies_late_fine_currency_check
      check (late_fine_currency in ('IQD', 'USD'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'companies_absence_fine_currency_check'
  ) then
    alter table public.companies
      add constraint companies_absence_fine_currency_check
      check (absence_fine_currency in ('IQD', 'USD'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'companies_overtime_currency_check'
  ) then
    alter table public.companies
      add constraint companies_overtime_currency_check
      check (overtime_currency in ('IQD', 'USD'));
  end if;
end $$;

create or replace function public.rewards_apply_company_fine_currency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur text;
begin
  if new.kind = 'fine' and new.note = 'auto_late_fine' then
    select coalesce(nullif(late_fine_currency, ''), 'IQD')
      into v_cur
    from public.companies
    where id = new.company_id;
    if v_cur is not null then
      new.currency := v_cur;
    end if;
  elsif new.kind = 'fine' and new.note = 'auto_absence_fine' then
    select coalesce(nullif(absence_fine_currency, ''), 'IQD')
      into v_cur
    from public.companies
    where id = new.company_id;
    if v_cur is not null then
      new.currency := v_cur;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists rewards_apply_company_fine_currency_trg on public.rewards;
create trigger rewards_apply_company_fine_currency_trg
before insert on public.rewards
for each row
execute function public.rewards_apply_company_fine_currency();
