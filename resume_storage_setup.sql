-- 1. Add resume_url column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 2. Create Storage Bucket for Resumes
-- Note: You might need to create the bucket 'resumes' manually in the Supabase Dashboard if this SQL fails,
-- as SQL support for creating buckets can vary by Supabase version/setup.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

-- 3. Set Storage Policies (Allow users to upload/read their own files)

-- Allow public access to read files (so they can be downloaded)
create policy "Public Access to Resumes"
  on storage.objects for select
  using ( bucket_id = 'resumes' );

-- Allow authenticated users to upload files
create policy "Authenticated Users can upload resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes' AND
    auth.role() = 'authenticated'
  );

-- Allow users to update their own files
create policy "Users can update own resumes"
  on storage.objects for update
  using ( bucket_id = 'resumes' AND auth.uid() = owner );

-- Allow users to delete their own files
create policy "Users can delete own resumes"
  on storage.objects for delete
  using ( bucket_id = 'resumes' AND auth.uid() = owner );
