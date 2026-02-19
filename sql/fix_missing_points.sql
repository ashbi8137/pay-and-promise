-- =====================================================
-- FIX: Repair Schema & Backfill Points
-- =====================================================

-- 0. Ensure updated_at column exists (Required by trigger)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 1. Give 100 PP to anyone with 0 or NULL points
UPDATE public.profiles 
SET promise_points = 100, updated_at = now()
WHERE promise_points = 0 OR promise_points IS NULL;

-- 2. Create missing Ledger Entries for these users
INSERT INTO public.promise_point_ledger (user_id, points, reason, description)
SELECT id, 100, 'signup_bonus', 'Welcome bonus'
FROM public.profiles
WHERE promise_points >= 100
AND NOT EXISTS (
    SELECT 1 FROM public.promise_point_ledger 
    WHERE user_id = public.profiles.id AND reason = 'signup_bonus'
);

SELECT 'Fixed Schema & Backfilled points.' as status;
