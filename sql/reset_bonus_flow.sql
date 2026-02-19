-- =====================================================
-- RESET: Prepare for Bonus Flow Testing
-- =====================================================

-- 1. Reset Tutorial Flag for ALL users (so you see the walkthrough)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'has_seen_tutorial';

-- 2. Reset Promise Points to 0 for ALL users
UPDATE public.profiles
SET promise_points = 0, updated_at = now();

-- 3. Clear Ledger (Remove previous claims)
DELETE FROM public.promise_point_ledger WHERE reason = 'signup_bonus';

SELECT 'Ready to test! Points reset to 0, Tutorial reset.' as status;
