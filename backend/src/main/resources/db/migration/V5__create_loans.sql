create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.loans (
    loan_id       uuid primary key default gen_random_uuid(),
    lender_id     uuid not null references auth.users(id) on delete cascade,
    borrower_name text not null,
    amount        numeric(15, 2) not null,
    description   text,
    date_lent     date not null,
    due_date      date,
    status        text not null default 'active',
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists loans_lender_id_idx on public.loans(lender_id);

drop trigger if exists trg_loans_updated_at on public.loans;
create trigger trg_loans_updated_at
before update on public.loans
for each row
execute function public.set_updated_at();

alter table public.loans enable row level security;

drop policy if exists "Authenticated users can manage their own loans" on public.loans;
create policy "Authenticated users can manage their own loans"
    on public.loans
    for all
    to authenticated
    using (lender_id = auth.uid())
    with check (lender_id = auth.uid());

drop policy if exists "Anon users cannot access loans" on public.loans;
create policy "Anon users cannot access loans"
    on public.loans
    for all
    to anon
    using (false)
    with check (false);

notify pgrst, 'reload schema';
