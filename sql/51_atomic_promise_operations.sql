-- =====================================================
-- 51_atomic_promise_operations.sql
-- Atomic RPCs for promise creation and joining.
-- Ensures PP lock, participant insert, and daily limit
-- are all handled in a single transaction.
-- =====================================================

-- ============================================
-- 1. CREATE PROMISE ATOMIC
-- ============================================
CREATE OR REPLACE FUNCTION public.create_promise_atomic(
    p_title text,
    p_description text,
    p_duration_days integer,
    p_number_of_people integer,
    p_commitment_level text,
    p_locked_points integer,
    p_promise_type text,  -- 'self' or 'group'
    p_creator_name text,
    p_creator_avatar text DEFAULT NULL
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
        participants
    ) VALUES (
        p_title, p_description, p_duration_days, p_number_of_people,
        p_commitment_level, p_locked_points, p_promise_type,
        v_invite_code, v_user_id, 'active',
        jsonb_build_array(jsonb_build_object(
            'name', p_creator_name,
            'id', v_user_id::text,
            'avatar_url', p_creator_avatar
        ))
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


-- ============================================
-- 2. JOIN PROMISE ATOMIC
-- ============================================
CREATE OR REPLACE FUNCTION public.join_promise_atomic(
    p_invite_code text,
    p_joiner_name text,
    p_joiner_avatar text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_user_pp integer;
    v_promise RECORD;
    v_current_count integer;
    v_result jsonb;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Find the promise by invite code
    SELECT id, title, number_of_people, locked_points, status
    INTO v_promise
    FROM public.promises
    WHERE invite_code = upper(p_invite_code) AND status = 'active'
    FOR UPDATE;  -- Lock the row to prevent race conditions

    IF v_promise IS NULL THEN
        RAISE EXCEPTION 'Promise not found or expired';
    END IF;

    -- 2. Check if already a participant
    IF EXISTS (
        SELECT 1 FROM public.promise_participants
        WHERE promise_id = v_promise.id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Already joined this promise';
    END IF;

    -- 3. Check if promise is full
    SELECT count(*) INTO v_current_count
    FROM public.promise_participants
    WHERE promise_id = v_promise.id;

    IF v_current_count >= v_promise.number_of_people THEN
        RAISE EXCEPTION 'Promise is full (% of % slots taken)', v_current_count, v_promise.number_of_people;
    END IF;

    -- 4. Check user has enough PP
    SELECT promise_points INTO v_user_pp FROM public.profiles WHERE id = v_user_id;
    IF COALESCE(v_user_pp, 0) < COALESCE(v_promise.locked_points, 10) THEN
        RAISE EXCEPTION 'Insufficient Promise Points. Need % but have %', COALESCE(v_promise.locked_points, 10), COALESCE(v_user_pp, 0);
    END IF;

    -- 5. Insert into participants table
    INSERT INTO public.promise_participants (promise_id, user_id)
    VALUES (v_promise.id, v_user_id);

    -- 6. Atomically append to the participants JSON array (no overwrite race condition)
    UPDATE public.promises
    SET participants = COALESCE(participants, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'name', p_joiner_name,
        'id', v_user_id::text,
        'avatar_url', p_joiner_avatar
    ))
    WHERE id = v_promise.id;

    -- 7. Deduct PP (commitment lock)
    PERFORM award_promise_points(
        v_user_id, v_promise.id, -COALESCE(v_promise.locked_points, 10), 'commitment_lock',
        'PP locked for: ' || COALESCE(v_promise.title, 'Promise')
    );

    -- 8. Return result
    v_result := jsonb_build_object(
        'promise_id', v_promise.id,
        'title', v_promise.title,
        'success', true
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
