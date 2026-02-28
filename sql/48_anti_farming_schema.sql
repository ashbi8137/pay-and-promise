-- =====================================================
-- 48_anti_farming_schema.sql
-- Anti-farming columns, daily limit tracking, and
-- integrity score calculation
-- =====================================================

-- 1. Add new tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_self_completed integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_group_completed integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_promise_create_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_self_creates integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_group_creates integer NOT NULL DEFAULT 0;

-- 2. RPC: Check if user can create a promise today (returns remaining count or 0)
CREATE OR REPLACE FUNCTION public.check_daily_create_limit(
    p_user_id uuid,
    p_mode text  -- 'self' or 'group'
)
RETURNS integer AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_last_date date;
    v_daily_self integer;
    v_daily_group integer;
    v_max_self integer := 2;
    v_max_group integer := 1;
BEGIN
    SELECT last_promise_create_date, daily_self_creates, daily_group_creates
    INTO v_last_date, v_daily_self, v_daily_group
    FROM public.profiles WHERE id = p_user_id;

    -- If the stored date is not today, the counts have reset
    IF v_last_date IS NULL OR v_last_date < v_today THEN
        v_daily_self := 0;
        v_daily_group := 0;
    END IF;

    IF p_mode = 'self' THEN
        RETURN v_max_self - v_daily_self;  -- remaining creates
    ELSE
        RETURN v_max_group - v_daily_group;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Increment daily create counter (call AFTER successful promise creation)
CREATE OR REPLACE FUNCTION public.increment_daily_create(
    p_user_id uuid,
    p_mode text  -- 'self' or 'group'
)
RETURNS void AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_last_date date;
BEGIN
    SELECT last_promise_create_date INTO v_last_date
    FROM public.profiles WHERE id = p_user_id;

    -- Reset counters if it's a new day
    IF v_last_date IS NULL OR v_last_date < v_today THEN
        UPDATE public.profiles
        SET daily_self_creates = 0,
            daily_group_creates = 0,
            last_promise_create_date = v_today
        WHERE id = p_user_id;
    END IF;

    IF p_mode = 'self' THEN
        UPDATE public.profiles
        SET daily_self_creates = daily_self_creates + 1,
            last_promise_create_date = v_today
        WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles
        SET daily_group_creates = daily_group_creates + 1,
            last_promise_create_date = v_today
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Calculate Integrity Score and update leaderboard eligibility
-- Formula: (Completion Rate × 40) + (Current Streak × 2) + (Weighted Promise Value × 3)
-- Weighted Promise Value = (total_group_completed × 3) + (total_self_completed × 1)
-- Eligibility: ≥5 completed, ≥60% rate, ≥1 group promise, account ≥7 days old
CREATE OR REPLACE FUNCTION public.recalculate_integrity_score(p_user_id uuid)
RETURNS numeric AS $$
DECLARE
    v_completed integer;
    v_failed integer;
    v_total integer;
    v_completion_rate numeric;
    v_streak integer;
    v_group_completed integer;
    v_self_completed integer;
    v_weighted_value numeric;
    v_score numeric;
    v_account_age interval;
    v_eligible boolean;
BEGIN
    SELECT completed_promises_count, failed_promises_count,
           current_streak, total_group_completed, total_self_completed,
           (now() - updated_at)
    INTO v_completed, v_failed, v_streak, v_group_completed, v_self_completed, v_account_age
    FROM public.profiles WHERE id = p_user_id;

    v_total := COALESCE(v_completed, 0) + COALESCE(v_failed, 0);

    IF v_total = 0 THEN
        v_completion_rate := 0;
    ELSE
        v_completion_rate := (v_completed::numeric / v_total) * 100;
    END IF;

    v_weighted_value := (COALESCE(v_group_completed, 0) * 3) + (COALESCE(v_self_completed, 0) * 1);

    v_score := (v_completion_rate * 0.4) + (COALESCE(v_streak, 0) * 2) + (v_weighted_value * 3);

    -- Eligibility checks
    v_eligible := (
        COALESCE(v_completed, 0) >= 5
        AND v_completion_rate >= 60
        AND COALESCE(v_group_completed, 0) >= 1
        AND v_account_age >= interval '7 days'
    );

    UPDATE public.profiles
    SET integrity_score = v_score,
        leaderboard_eligible = v_eligible
    WHERE id = p_user_id;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the leaderboard RPC to sort by integrity_score instead of lifetime_points
DROP FUNCTION IF EXISTS public.get_leaderboard(integer);
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 20)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    lifetime_points integer,
    integrity_score numeric,
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
        p.integrity_score,
        p.level,
        p.current_streak,
        p.completed_promises_count
    FROM public.profiles p
    WHERE p.leaderboard_eligible = true
      AND p.integrity_score > 0
    ORDER BY p.integrity_score DESC, p.current_streak DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Get user's completed group promise count (for tier unlock check)
CREATE OR REPLACE FUNCTION public.get_user_group_completions(p_user_id uuid)
RETURNS integer AS $$
DECLARE
    v_count integer;
BEGIN
    SELECT total_group_completed INTO v_count
    FROM public.profiles WHERE id = p_user_id;
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
