-- =====================================================
-- 36_reset_all_data.sql
-- Clears ALL promise data and resets PP to fresh state
-- Run this in Supabase SQL Editor to start completely fresh
-- =====================================================

-- WARNING: This will DELETE all promise data permanently!

-- 1. Clear all verification/voting data
DELETE FROM public.submission_verifications;

-- 2. Clear all submissions
DELETE FROM public.promise_submissions;

-- 3. Clear all daily check-ins
DELETE FROM public.daily_checkins;

-- 4. Clear all PP ledger entries
DELETE FROM public.promise_point_ledger;

-- 5. Clear all participants
DELETE FROM public.promise_participants;

-- 6. Clear all promises
DELETE FROM public.promises;

-- 7. Reset all user profiles to fresh state (100 PP signup bonus)
UPDATE public.profiles
SET 
    promise_points = 100,
    lifetime_points = 100,
    current_streak = 0,
    level = 1;

-- 8. Re-insert signup bonus ledger entries for all existing users
INSERT INTO public.promise_point_ledger (user_id, points, reason, description)
SELECT id, 100, 'signup_bonus', 'Welcome bonus (data reset)'
FROM public.profiles;

-- Done! All data cleared. Each user starts with 100 PP.
