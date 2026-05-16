create table if not exists public.entries (
    entry_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    debtor_id uuid not null references public.debtors(debtor_id) on delete cascade,
    original_amount numeric(15, 2) not null,
    currency text not null default 'PHP',
    lending_date date not null,
    expected_payback_date date,
    actual_closed_date date,
    entry_status text not null default 'Open',
    is_archived boolean not null default false,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint entries_status_check check (entry_status in ('Open', 'Partially Collected', 'Closed')),
    constraint entries_amount_check check (original_amount > 0),
    constraint entries_expected_date_check check (
        expected_payback_date is null or expected_payback_date >= lending_date
    )
);

create index if not exists entries_user_status_archived_idx
    on public.entries(user_id, entry_status, is_archived);

create index if not exists entries_debtor_id_idx
    on public.entries(debtor_id);

create index if not exists entries_lending_date_idx
    on public.entries(lending_date desc);

drop trigger if exists trg_entries_updated_at on public.entries;
create trigger trg_entries_updated_at
before update on public.entries
for each row
execute function public.set_updated_at();

alter table public.entries enable row level security;

drop policy if exists "Authenticated users can manage their own entries" on public.entries;
create policy "Authenticated users can manage their own entries"
    on public.entries
    for all
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Anon users cannot access entries" on public.entries;
create policy "Anon users cannot access entries"
    on public.entries
    for all
    to anon
    using (false)
    with check (false);

notify pgrst, 'reload schema';
