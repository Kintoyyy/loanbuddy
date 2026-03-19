alter table if exists public.user_profiles
    add column if not exists first_name text,
    add column if not exists last_name text,
    add column if not exists username text,
    add column if not exists birthday date;

update public.user_profiles
set
    first_name = coalesce(nullif(first_name, ''), split_part(coalesce(full_name, ''), ' ', 1)),
    last_name = coalesce(
        nullif(last_name, ''),
        nullif(trim(regexp_replace(coalesce(full_name, ''), '^\S+\s*', '')), '')
    ),
    username = coalesce(nullif(username, ''), split_part(email, '@', 1))
where true;

create unique index if not exists idx_user_profiles_username_unique
    on public.user_profiles (username)
    where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_profiles (user_id, email, first_name, last_name, username, birthday, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'first_name', ''),
        coalesce(new.raw_user_meta_data ->> 'last_name', ''),
        coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
        nullif(new.raw_user_meta_data ->> 'birthday', '')::date,
        trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name'))
    )
    on conflict (user_id) do nothing;

    return new;
end;
$$;