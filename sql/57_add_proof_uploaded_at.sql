-- =====================================================
-- 57_add_proof_uploaded_at.sql
-- Adds timestamp column to track exactly when a proof was uploaded
-- =====================================================

ALTER TABLE public.promise_submissions 
ADD COLUMN IF NOT EXISTS proof_uploaded_at timestamptz DEFAULT now();

-- Update existing records to use their created_at as a fallback
UPDATE public.promise_submissions
SET proof_uploaded_at = created_at
WHERE proof_uploaded_at IS NULL;
