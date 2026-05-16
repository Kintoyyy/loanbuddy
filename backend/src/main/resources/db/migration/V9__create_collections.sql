create table if not exists public.collections (
    collection_id uuid primary key default gen_random_uuid(),
    entry_id uuid not null references public.entries(entry_id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    amount_collected numeric(15, 2) not null,
    collection_date date not null,
    payment_method text not null default 'Cash',
    notes text,
    transaction_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint collections_amount_check check (amount_collected > 0),
    constraint collections_payment_method_check check (
        payment_method in ('Cash', 'Bank Transfer', 'GCash', 'PayMaya', 'Check', 'Online Transfer', 'Card', 'Other')
    )
);

create index if not exists collections_entry_date_idx
    on public.collections(entry_id, collection_date desc);

create index if not exists collections_user_id_idx
    on public.collections(user_id);

drop trigger if exists trg_collections_updated_at on public.collections;
create trigger trg_collections_updated_at
before update on public.collections
for each row
execute function public.set_updated_at();

alter table public.collections enable row level security;

drop policy if exists "Authenticated users can manage their own collections" on public.collections;
create policy "Authenticated users can manage their own collections"
    on public.collections
    for all
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "Anon users cannot access collections" on public.collections;
create policy "Anon users cannot access collections"
    on public.collections
    for all
    to anon
    using (false)
    with check (false);

notify pgrst, 'reload schema';
