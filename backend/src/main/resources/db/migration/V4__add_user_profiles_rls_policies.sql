-- Enable RLS on user_profiles table
alter table if exists public.user_profiles enable row level security;

-- Drop existing policies to ensure clean state
drop policy if exists "Users can read their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;
drop policy if exists "Allow insertion of new profiles" on public.user_profiles;
drop policy if exists "Anon users cannot directly modify profiles" on public.user_profiles;
drop policy if exists "Authenticated users can read their own profile" on public.user_profiles;
drop policy if exists "Authenticated users can update their own profile" on public.user_profiles;

-- Policy 1: Authenticated users can read their own profile
create policy "Authenticated users can read their own profile"
  on public.user_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Policy 2: Authenticated users can insert and update their own profile
-- Using permissive policies to allow the backend to manage profile data for authenticated users
create policy "Authenticated users can insert their own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Authenticated users can update their own profile"
  on public.user_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policy 3: Prevent anonymous access to profiles
create policy "Anon users cannot access profiles"
  on public.user_profiles
  for all
  to anon
  using (false)
  with check (false);
