-- =====================================================
-- 33_pp_rpcs.sql
-- RPC functions for Promise Point system
-- =====================================================

-- 1. Award Promise Points (used by frontend and backend for all PP changes)
CREATE OR REPLACE FUNCTION public.award_promise_points(
    p_user_id uuid,
    p_promise_id uuid,
    p_points integer,
    p_reason text,
    p_description text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Insert ledger entry with optional description
    INSERT INTO public.promise_point_ledger (user_id, promise_id, points, reason, description)
    VALUES (p_user_id, p_promise_id, p_points, p_reason, p_description);
    
    -- Update user's promise_points balance
    -- Lifetime Points: Only increase on TRUE PROFIT (bonuses, redistribution). Not refunds.
    UPDATE public.profiles
    SET promise_points = promise_points + p_points,
        lifetime_points = CASE 
            WHEN p_points > 0 AND p_reason NOT IN ('daily_success', 'commitment_unlock') THEN lifetime_points + p_points 
            ELSE lifetime_points 
        END
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Calculate and update user level based on lifetime_points
CREATE OR REPLACE FUNCTION public.calculate_user_level(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_lifetime integer;
    v_level integer;
BEGIN
    SELECT lifetime_points INTO v_lifetime FROM public.profiles WHERE id = p_user_id;
    
    v_level := CASE
        WHEN v_lifetime >= 1000 THEN 5
        WHEN v_lifetime >= 600 THEN 4
        WHEN v_lifetime >= 300 THEN 3
        WHEN v_lifetime >= 100 THEN 2
        ELSE 1
    END;
    
    UPDATE public.profiles SET level = v_level WHERE id = p_user_id;
    
    RETURN v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get leaderboard (top users by lifetime points)
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 20)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    lifetime_points integer,
    level integer,
    current_streak integer,
    completed_promises_count integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.avatar_url,
        p.lifetime_points,
        p.level,
        p.current_streak,
        p.completed_promises_count
    FROM public.profiles p
    WHERE p.leaderboard_eligible = true
      AND p.lifetime_points > 0
    ORDER BY p.lifetime_points DESC, p.current_streak DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update streak (call after each day's verification)
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id uuid, p_success boolean)
RETURNS void AS $$
DECLARE
    v_current integer;
    v_longest integer;
BEGIN
    SELECT current_streak, longest_streak 
    INTO v_current, v_longest 
    FROM public.profiles WHERE id = p_user_id;
    
    IF p_success THEN
        v_current := v_current + 1;
        IF v_current > v_longest THEN
            v_longest := v_current;
        END IF;
        
        -- Streak bonus at milestones (every 7 days)
        IF v_current % 7 = 0 THEN
            INSERT INTO public.promise_point_ledger (user_id, points, reason)
            VALUES (p_user_id, 5, 'streak_bonus');
            
            UPDATE public.profiles 
            SET promise_points = promise_points + 5,
                lifetime_points = lifetime_points + 5
            WHERE id = p_user_id;
        END IF;
    ELSE
        v_current := 0;  -- Reset streak on failure
    END IF;
    
    UPDATE public.profiles 
    SET current_streak = v_current,
        longest_streak = v_longest
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Get user PP stats (for dashboard)
CREATE OR REPLACE FUNCTION public.get_user_pp_stats(p_user_id uuid)
RETURNS TABLE (
    promise_points integer,
    lifetime_points integer,
    integrity_score numeric,
    current_streak integer,
    longest_streak integer,
    level integer,
    completed_promises_count integer,
    failed_promises_count integer,
    total_earned bigint,
    total_lost bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.promise_points,
        p.lifetime_points,
        p.integrity_score,
        p.current_streak,
        p.longest_streak,
        p.level,
        p.completed_promises_count,
        p.failed_promises_count,
        COALESCE((SELECT SUM(l.points) FROM public.promise_point_ledger l WHERE l.user_id = p_user_id AND l.points > 0), 0) AS total_earned,
        COALESCE((SELECT ABS(SUM(l.points)) FROM public.promise_point_ledger l WHERE l.user_id = p_user_id AND l.points < 0), 0) AS total_lost
    FROM public.profiles p
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
