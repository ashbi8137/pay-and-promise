-- 1. Add proof_url to daily_checkins
ALTER TABLE public.daily_checkins ADD COLUMN IF NOT EXISTS proof_url text;

-- 2. Create Storage Bucket 'proofs'
-- Note: Buckets are usually created via API/Dashboard, but we can try inserting if storage schema is available.
-- Safest to ask user to create bucket in dashboard, but we can set up Policies.

-- ASSUMPTION: Bucket 'proofs' exists (User must create it or we try insert).
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

-- 3. Storage Policies
-- Allow Authenticated uploads
create policy "Authenticated can upload proofs"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'proofs' );

-- Allow Public read (so everyone can see proofs)
create policy "Public can view proofs"
on storage.objects for select
to public
using ( bucket_id = 'proofs' );
