-- =====================================================
-- 56_add_deadline_time.sql
-- Adds an optional daily deadline time for promises, allowing users
-- to enforce time-of-day cutoffs (e.g. Wake Up by 7:00 AM)
-- =====================================================

-- 1. Add the column to promises table
ALTER TABLE public.promises ADD COLUMN IF NOT EXISTS deadline_time text;

-- 2. Update the create_promise_atomic RPC to accept the new param
DROP FUNCTION IF EXISTS public.create_promise_atomic(text, text, integer, integer, text, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.create_promise_atomic(
    p_title text,
    p_description text,
    p_duration_days integer,
    p_number_of_people integer,
    p_commitment_level text,
    p_locked_points integer,
    p_promise_type text,  -- 'self' or 'group'
    p_creator_name text,
    p_creator_avatar text DEFAULT NULL,
    p_deadline_time text DEFAULT NULL  -- New parameter, e.g. '07:00'
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_user_pp integer;
    v_daily_remaining integer;
    v_invite_code text;
    v_promise_id uuid;
    v_result jsonb;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Check daily creation limit
    v_daily_remaining := check_daily_create_limit(v_user_id, p_promise_type);
    IF v_daily_remaining <= 0 THEN
        RAISE EXCEPTION 'Daily creation limit reached';
    END IF;

    -- 2. Check user has enough PP
    SELECT promise_points INTO v_user_pp FROM public.profiles WHERE id = v_user_id;
    IF COALESCE(v_user_pp, 0) < p_locked_points THEN
        RAISE EXCEPTION 'Insufficient Promise Points. Need % but have %', p_locked_points, COALESCE(v_user_pp, 0);
    END IF;

    -- 3. Generate invite code for group promises
    IF p_promise_type = 'group' THEN
        v_invite_code := upper(substr(md5(random()::text), 1, 6));
    END IF;

    -- 4. Insert the promise
    INSERT INTO public.promises (
        title, description, duration_days, number_of_people,
        commitment_level, locked_points, promise_type,
        invite_code, created_by, status,
        participants, deadline_time
    ) VALUES (
        p_title, p_description, p_duration_days, p_number_of_people,
        p_commitment_level, p_locked_points, p_promise_type,
        v_invite_code, v_user_id, 'active',
        jsonb_build_array(jsonb_build_object(
            'name', p_creator_name,
            'id', v_user_id::text,
            'avatar_url', p_creator_avatar
        )),
        p_deadline_time
    )
    RETURNING id INTO v_promise_id;

    -- 5. Insert into participants table
    INSERT INTO public.promise_participants (promise_id, user_id)
    VALUES (v_promise_id, v_user_id);

    -- 6. Deduct PP (commitment lock)
    PERFORM award_promise_points(
        v_user_id, v_promise_id, -p_locked_points, 'commitment_lock',
        'PP locked for: ' || p_title
    );

    -- 7. Increment daily creation counter
    PERFORM increment_daily_create(v_user_id, p_promise_type);

    -- 8. Return result
    v_result := jsonb_build_object(
        'id', v_promise_id,
        'invite_code', v_invite_code,
        'success', true
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
