-- =====================================================
-- FIX: Claim Bonus Function
-- =====================================================

-- RPC Function to be called from the App
CREATE OR REPLACE FUNCTION public.claim_signup_bonus()
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid;
  bonus_amount integer := 100;
  already_claimed boolean;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if bonus already claimed in Ledger
  SELECT EXISTS (
    SELECT 1 FROM public.promise_point_ledger 
    WHERE user_id = current_user_id AND reason = 'signup_bonus'
  ) INTO already_claimed;

  IF already_claimed THEN
    RETURN json_build_object('success', false, 'message', 'Bonus already claimed');
  END IF;

  -- 1. Update Profile Points
  UPDATE public.profiles
  SET promise_points = COALESCE(promise_points, 0) + bonus_amount,
      updated_at = now()
  WHERE id = current_user_id;

  -- 2. Insert Ledger Entry
  INSERT INTO public.promise_point_ledger (user_id, points, reason, description)
  VALUES (current_user_id, bonus_amount, 'signup_bonus', 'Welcome bonus');

  RETURN json_build_object('success', true, 'points', bonus_amount);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
