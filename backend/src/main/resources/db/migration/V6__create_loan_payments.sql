create table if not exists public.loan_payments (
    payment_id   uuid primary key default gen_random_uuid(),
    loan_id      uuid not null references public.loans(loan_id) on delete cascade,
    amount       numeric(15, 2) not null,
    note         text,
    payment_date date not null,
    created_at   timestamptz not null default now()
);

create index if not exists loan_payments_loan_id_idx on public.loan_payments(loan_id);

alter table public.loan_payments enable row level security;

drop policy if exists "Users can manage payments for their own loans" on public.loan_payments;
create policy "Users can manage payments for their own loans"
    on public.loan_payments
    for all
    to authenticated
    using (exists (
        select 1 from public.loans
        where loans.loan_id = loan_payments.loan_id
          and loans.lender_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.loans
        where loans.loan_id = loan_payments.loan_id
          and loans.lender_id = auth.uid()
    ));

drop policy if exists "Anon users cannot access loan payments" on public.loan_payments;
create policy "Anon users cannot access loan payments"
    on public.loan_payments
    for all
    to anon
    using (false)
    with check (false);

-- Reload PostgREST schema cache so both loans and loan_payments are visible
notify pgrst, 'reload schema';
