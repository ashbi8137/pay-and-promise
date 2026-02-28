-- =====================================================
-- FIX: Update Profile Trigger & Schema
-- =====================================================

-- 1. DROP unused 'upi_id' column if it exists
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS upi_id;

-- 2. UPDATE TRIGGER FUNCTION to capture avatar_url and handle existing profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert or Update profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url,
    promise_points, 
    lifetime_points, 
    level, 
    leaderboard_eligible
  )
  VALUES (
    new.id,
    new.email,
    -- Google metadata can have 'full_name' or 'name'
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    -- Google metadata uses 'avatar_url' or 'picture'
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    100, -- Default PP
    0,
    1,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  -- Grant signup bonus in ledger if not already given
  INSERT INTO public.promise_point_ledger (user_id, points, reason, description)
  SELECT new.id, 100, 'signup_bonus', 'Welcome bonus'
  WHERE NOT EXISTS (
      SELECT 1 FROM public.promise_point_ledger 
      WHERE user_id = new.id AND reason = 'signup_bonus'
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. APPLY FIX TO EXISTING "NULL" PROFILES
-- Update existing profiles that have NULL full_name or avatar_url using data from auth.users
UPDATE public.profiles p
SET 
  full_name = COALESCE(
    p.full_name, 
    u.raw_user_meta_data->>'full_name', 
    u.raw_user_meta_data->>'name'
  ),
  avatar_url = COALESCE(
    p.avatar_url, 
    u.raw_user_meta_data->>'avatar_url', 
    u.raw_user_meta_data->>'picture'
  )
FROM auth.users u
WHERE p.id = u.id
AND (p.full_name IS NULL OR p.avatar_url IS NULL);

-- Output success message
SELECT 'Fixed profile trigger, dropped upi_id, and backfilled missing data.' as status;
