-- =====================================================
-- 55_update_level_thresholds.sql
-- Lowers the lifetime_points threshold required to level up.
-- New gap is exactly 75 points per level.
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_user_level(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_lifetime integer;
    v_level integer;
BEGIN
    SELECT lifetime_points INTO v_lifetime FROM public.profiles WHERE id = p_user_id;
    
    v_level := CASE
        WHEN v_lifetime >= 300 THEN 5 -- Legend
        WHEN v_lifetime >= 225 THEN 4 -- Pro
        WHEN v_lifetime >= 150 THEN 3 -- Committed
        WHEN v_lifetime >= 75  THEN 2 -- Rising
        ELSE 1                        -- Newcomer
    END;
    
    UPDATE public.profiles SET level = v_level WHERE id = p_user_id;
    
    RETURN v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-calculate levels for all existing users immediately
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles LOOP
        PERFORM public.calculate_user_level(r.id);
    END LOOP;
END $$;
