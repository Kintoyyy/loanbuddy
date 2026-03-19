-- Enable RLS on storage.objects if not already enabled
alter table if exists storage.objects enable row level security;

-- Create RLS policies for the profile-photos bucket
-- Policy 1: Allow authenticated users to upload to their own directory (user_id prefix)
create policy "Authenticated users can upload profile photos to their own directory"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: Allow authenticated users to update their own profile photos  
create policy "Authenticated users can update their own profile photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos' 
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: Allow authenticated users to delete their own profile photos
create policy "Authenticated users can delete their own profile photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-photos' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: Allow anonymous users to download profile photos (public read)
create policy "Anyone can download profile photos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile-photos');
