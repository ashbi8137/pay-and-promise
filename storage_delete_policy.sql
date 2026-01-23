-- Add DELETE policy to proofs storage bucket
-- This allows authenticated users to delete files from the proofs bucket

-- Allow authenticated users to delete their own files
create policy "Authenticated can delete proofs"
on storage.objects for delete
to authenticated
using ( bucket_id = 'proofs' );

-- Note: If you want to restrict deletion to only the file owner, use:
-- using ( bucket_id = 'proofs' AND auth.uid()::text = (storage.foldername(name))[1] );
-- This assumes files are stored as: {user_id}/filename.ext
