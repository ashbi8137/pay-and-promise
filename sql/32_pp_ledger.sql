-- =====================================================
-- 32_pp_ledger.sql
-- Create promise_point_ledger table for tracking all PP changes
-- =====================================================

-- 1. Create the PP ledger table
CREATE TABLE IF NOT EXISTS public.promise_point_ledger (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    promise_id uuid REFERENCES public.promises(id) ON DELETE SET NULL,
    points integer NOT NULL,  -- positive = earned, negative = lost
    reason text NOT NULL CHECK (reason IN (
        'daily_success',
        'daily_failure', 
        'promise_completed',
        'promise_failed',
        'streak_bonus',
        'signup_bonus',
        'level_up_bonus',
        'commitment_lock',
        'commitment_unlock'
    )),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.promise_point_ledger ENABLE ROW LEVEL SECURITY;

-- 3. Users can read their own ledger entries
DROP POLICY IF EXISTS "Users can read own pp_ledger" ON public.promise_point_ledger;
CREATE POLICY "Users can read own pp_ledger"
  ON public.promise_point_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Authenticated users can insert ledger entries
DROP POLICY IF EXISTS "Authenticated can insert pp_ledger" ON public.promise_point_ledger;
CREATE POLICY "Authenticated can insert pp_ledger"
  ON public.promise_point_ledger
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_pp_ledger_user_id ON public.promise_point_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_ledger_created_at ON public.promise_point_ledger(created_at DESC);
