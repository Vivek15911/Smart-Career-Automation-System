-- 1. Create the 'resumes' bucket
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true);

-- 2. Enable policy to allow authenticated uploads to 'resumes' bucket
create policy "Authenticated users can upload resumes"
on storage.objects for insert
with check (
  bucket_id = 'resumes' AND
  auth.role() = 'authenticated'
);

-- 3. Enable policy to allow users to view their own resumes or public access
create policy "Anyone can view resumes"
on storage.objects for select
using ( bucket_id = 'resumes' );

-- 4. Enable policy to allow users to update their own resumes
create policy "Users can update own resumes"
on storage.objects for update
using ( bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1] );

-- 5. Enable policy to allow users to delete their own resumes
create policy "Users can delete own resumes"
on storage.objects for delete
using ( bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1] );
