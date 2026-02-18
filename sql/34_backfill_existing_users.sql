-- =====================================================
-- 34_backfill_existing_users.sql
-- One-time script to grant existing users 100 PP
-- =====================================================

-- 1. Set PP defaults for all existing profiles
UPDATE public.profiles
SET 
    promise_points = 100,
    lifetime_points = 0,
    integrity_score = 100.0,
    current_streak = 0,
    longest_streak = 0,
    level = 1,
    completed_promises_count = 0,
    failed_promises_count = 0,
    leaderboard_eligible = true
WHERE promise_points = 100  -- Only update if still at default (idempotent)
   OR promise_points IS NULL;

-- 2. Insert signup_bonus ledger entry for each existing user (if not already present)
INSERT INTO public.promise_point_ledger (user_id, points, reason)
SELECT id, 100, 'signup_bonus'
FROM public.profiles
WHERE id NOT IN (
    SELECT user_id FROM public.promise_point_ledger WHERE reason = 'signup_bonus'
);

-- 3. Update handle_new_user() to also insert ledger entry for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with starting PP
  INSERT INTO public.profiles (id, email, full_name, promise_points, lifetime_points, level, leaderboard_eligible)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    100,
    0,
    1,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Grant signup bonus in ledger
  INSERT INTO public.promise_point_ledger (user_id, points, reason)
  VALUES (new.id, 100, 'signup_bonus');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
