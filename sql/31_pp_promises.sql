-- =====================================================
-- 31_pp_promises.sql
-- Add PP fields to promises table, drop old money columns
-- =====================================================

-- 1. Add new PP columns
ALTER TABLE public.promises ADD COLUMN IF NOT EXISTS commitment_level text NOT NULL DEFAULT 'medium';
ALTER TABLE public.promises ADD COLUMN IF NOT EXISTS locked_points integer NOT NULL DEFAULT 10;

-- 2. Drop old money columns entirely
ALTER TABLE public.promises DROP COLUMN IF EXISTS amount_per_person;
ALTER TABLE public.promises DROP COLUMN IF EXISTS total_amount;

-- 3. Allow update on promises for status changes (if not exists)
DROP POLICY IF EXISTS "Enable update for promise creator" ON public.promises;
CREATE POLICY "Enable update for promise creator"
  ON public.promises
  FOR UPDATE
  USING (auth.uid() = created_by);

-- 4. Allow all authenticated users to see active promises (for join flow)
DROP POLICY IF EXISTS "Enable select for active promises" ON public.promises;
CREATE POLICY "Enable select for active promises"
  ON public.promises
  FOR SELECT
  USING (
    auth.uid() = created_by
    OR status = 'active'
    OR EXISTS (
      SELECT 1 FROM public.promise_participants
      WHERE promise_id = id AND user_id = auth.uid()
    )
  );
