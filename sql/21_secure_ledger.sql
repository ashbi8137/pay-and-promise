-- SECURE LEDGER: Revoke direct client access
-- We want to prevent ANY frontend device (old or new) from inserting into ledger directly.
-- Only the "check_and_finalize_verification" function (Security Definer) should do this.

-- 1. Revoke INSERT permission for authenticated users
REVOKE INSERT ON public.ledger FROM authenticated;
REVOKE INSERT ON public.ledger FROM anon;

-- 2. Verify/Ensure RLS is enabled
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy to only allow SELECT (Read your own history)
DROP POLICY IF EXISTS "Users can insert their own ledger entries" ON public.ledger;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.ledger;

-- Re-create Read policy just in case (optional, but good for safety)
DROP POLICY IF EXISTS "Users can view their own ledger" ON public.ledger;
CREATE POLICY "Users can view their own ledger"
ON public.ledger
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Clean up the duplicate entries (Cleanup for double deduction reported)
-- Detect duplicates based on promise_id, user_id, type='penalty', and same day.
-- Keep the one with the earlier ID (or just remove one).

DELETE FROM public.ledger a
USING public.ledger b
WHERE a.id > b.id
AND a.promise_id = b.promise_id
AND a.user_id = b.user_id
AND a.type = 'penalty'
AND a.created_at::date = b.created_at::date;
