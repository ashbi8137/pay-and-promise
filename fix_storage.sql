-- FIX: Storage Bucket and Policies
-- Ensure the 'proofs' bucket exists and is public.

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do update set public = true;

-- Drop existing policies to avoid conflicts
drop policy if exists "Authenticated can upload proofs" on storage.objects;
drop policy if exists "Public can view proofs" on storage.objects;
drop policy if exists "Users can upload their own proofs" on storage.objects;

-- Allow Authenticated uploads (Any authenticated user can upload their proof)
create policy "Authenticated can upload proofs"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'proofs' );

-- Allow Public read (so everyone can see proofs)
create policy "Public can view proofs"
on storage.objects for select
to public
using ( bucket_id = 'proofs' );
