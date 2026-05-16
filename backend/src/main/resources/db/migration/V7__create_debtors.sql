create table if not exists public.debtors (
    debtor_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    debtor_name text not null,
    debtor_type text not null default 'Person',
    phone_number text,
    email text,
    is_archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint debtors_debtor_type_check check (debtor_type in ('Person', 'Entity', 'Organization')),
    constraint debtors_email_format_check check (
        email is null or email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
    )
);

create unique index if not exists debtors_user_name_type_uidx
    on public.debtors(user_id, debtor_name, debtor_type)
    where is_archived = false;

create index if not exists debtors_user_archived_idx
    on public.debtors(user_id, is_archived);

create index if not exists debtors_created_at_idx
    on public.debtors(created_at desc);

drop trigger if exists trg_debtors_updated_at on public.debtors;
create trigger trg_debtors_updated_at
before update on public.debtors
for each row
execute function public.set_updated_at();

alter table public.debtors enable row level security;

drop policy if exists "Authenticated users can manage their own debtors" on public.debtors;
create policy "Authenticated users can manage their own debtors"
    on public.debtors
    for all
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Anon users cannot access debtors" on public.debtors;
create policy "Anon users cannot access debtors"
    on public.debtors
    for all
    to anon
    using (false)
    with check (false);

notify pgrst, 'reload schema';
