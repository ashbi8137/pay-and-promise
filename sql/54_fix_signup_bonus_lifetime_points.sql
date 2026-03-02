-- =====================================================
-- 54_fix_signup_bonus_lifetime_points.sql
-- Fixes the new user trigger which was silently granting a 100pt signup bonus
-- and blocking the Welcome Modal from properly giving the 25pt bonus and updating lifetime points.
-- =====================================================

-- 1. Redefine trigger to ONLY create the profile, and let the frontend Welcome Modal handle the bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile with 0 initial PP
  INSERT INTO public.profiles (id, email, full_name, promise_points, lifetime_points, level, leaderboard_eligible)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    0, 
    0, 
    1,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- removed: INSERT INTO public.promise_point_ledger ... 'signup_bonus'
  -- We want the user to earn this via the Welcome Modal UI!
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix existing users who got the broken trigger (100 points, no lifetime points)
-- Set their ledger entry to 25 to match the Welcome Modal logic
UPDATE public.promise_point_ledger
SET points = 25
WHERE reason = 'signup_bonus' AND points = 100;

-- 3. Update profiles for those users (and any others missing lifetime points from signup)
UPDATE public.profiles p
SET lifetime_points = 25,
    promise_points = CASE WHEN promise_points = 100 THEN 25 ELSE promise_points END
WHERE p.lifetime_points = 0 AND EXISTS (
   SELECT 1 FROM public.promise_point_ledger l 
   WHERE l.user_id = p.id AND l.reason = 'signup_bonus'
);
