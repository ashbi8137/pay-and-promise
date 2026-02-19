-- =====================================================
-- FIX: Robust Profile Trigger (Does NOT block Auth)
-- =====================================================

-- 1. DROP unused 'upi_id' column if it exists
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS upi_id;

-- 2. UPDATE TRIGGER FUNCTION to be fault-tolerant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Block 1: Create/Update Profile with Error Handling
  BEGIN
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
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
      0, -- start with 0 PP
      0,
      1,
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue
    RAISE WARNING 'Profile creation failed for user %: %', new.id, SQLERRM;
  END;
  
  -- Note: Ledger signup bonus is now handled via explicit 'claim_signup_bonus' function
  
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Output status
SELECT 'Fixed trigger with robust error handling.' as status;
