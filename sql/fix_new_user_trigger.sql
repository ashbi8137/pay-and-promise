-- =====================================================
-- FIX: Repair New User Trigger & Recover Missing Profiles
-- =====================================================

-- 1. Redefine the function with CORRECT column names (points, not amount)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with starting PP
  INSERT INTO public.profiles (id, email, full_name, promise_points, lifetime_points, level, leaderboard_eligible)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    100, -- Starting PP
    0,
    1,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Grant signup bonus in ledger (using correct 'points' column)
  INSERT INTO public.promise_point_ledger (user_id, points, reason, description)
  VALUES (new.id, 100, 'signup_bonus', 'Welcome bonus');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recover any users who signed up but have NO profile due to the bug
INSERT INTO public.profiles (id, email, full_name, promise_points, lifetime_points, level, leaderboard_eligible)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name',
    100, 
    0, 
    1, 
    true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 3. Ensure they have the ledger entry too
INSERT INTO public.promise_point_ledger (user_id, points, reason, description)
SELECT id, 100, 'signup_bonus', 'Welcome bonus (recovery)'
FROM public.profiles
WHERE id NOT IN (
    SELECT user_id FROM public.promise_point_ledger WHERE reason = 'signup_bonus'
);

-- Output success message
SELECT 'Fixed trigger and recovered missing profiles.' as status;
