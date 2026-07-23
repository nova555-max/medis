-- Company branding for professional reports & receipts

alter table public.companies
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists report_watermark text,
  add column if not exists stamp_text text default 'مۆری کۆمپانیا';

alter table public.salaries
  add column if not exists payment_method text default 'cash',
  add column if not exists overtime_amount numeric not null default 0,
  add column if not exists bonus_amount numeric not null default 0,
  add column if not exists receipt_number text;

create unique index if not exists salaries_receipt_number_idx
  on public.salaries (company_id, receipt_number)
  where receipt_number is not null;
