-- Migration 37: Delete Promise Logic
-- Handles promise deletion with refund (if solo/pending) or penalty (if active)

CREATE OR REPLACE FUNCTION delete_promise_logic(
    p_promise_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_promise RECORD;
    v_participant_count INT;
    v_points INT;
BEGIN
    -- Fetch promise details
    SELECT * INTO v_promise FROM promises WHERE id = p_promise_id;

    IF v_promise IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Promise not found');
    END IF;

    -- Verify Creator
    IF v_promise.created_by != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the creator can delete this promise');
    END IF;

    -- Count participants
    SELECT COUNT(*) INTO v_participant_count 
    FROM promise_participants 
    WHERE promise_id = p_promise_id;

    -- CASE 1: Before any teammate joins (Solo) AND (Pending OR Active but solo?)
    -- User said "If delete clicked before any teammate joins... Promise is removed normally... Points returned."
    -- We assume this applies even if it technically "started" but no one is there to verify.
    -- OR strictly: If (participants = 1).
    
    IF v_participant_count = 1 THEN
        -- Refund the Creator
        -- We need to know how much was locked. 'locked_points' column.
        v_points := v_promise.locked_points;

        -- Credit back to profile
        UPDATE profiles 
        SET promise_points = promise_points + v_points 
        WHERE id = p_user_id;

        -- Log refund in ledger
        INSERT INTO promise_point_ledger (user_id, points, reason, description, promise_id)
        VALUES (p_user_id, v_points, 'daily_redistribution', 'Promise deleted (Solo)', p_promise_id);

        -- Delete the promise (Hard delete or soft delete?)
        -- User said "Promise is removed normally". "Mark promise as 'Deleted – Treated as Failed' (Case 2)".
        -- For Case 1, we can soft delete or hard delete. Soft delete is safer.
        UPDATE promises SET status = 'deleted' WHERE id = p_promise_id;

        RETURN jsonb_build_object('success', true, 'message', 'Promise deleted and points refunded.');
    END IF;


    -- CASE 2: During Active Period (With others?)
    -- User said "If delete clicked after promise has started... Treat as failure... Deduct remaining points."
    -- If (participants > 1) AND (status = 'active').

    IF v_promise.status = 'active' THEN
        -- Mark as Failed
        -- We can update the status to 'failed' or a special 'deleted_failed'.
        -- User said "Mark promise as Deleted – Treated as Failed".
        -- We'll use 'failed' for simplicity in stats, or maybe a custom reason.
        -- We won't strictly delete the row, but mark it ended.
        
        UPDATE promises 
        SET status = 'failed',
            ended_at = NOW()
        WHERE id = p_promise_id;

        -- We do NOT refund points. The locked points are gone.
        -- We might want to notify others? (Not implemented here).
        
        -- We should probably create a ledger entry "Penalty" of 0 just to record the event? 
        -- Or just leave the original lock.
        -- But we need to close the loop so it doesn't look like "pending".

        -- Also, if there are other participants, what happens to them?
        -- User didn't specify. Assuming only creator is penalized? 
        -- Or does the whole promise fail for everyone?
        -- "Treat as failure for remaining days".
        -- Usually in this app, if a promise is cancelled, everyone is released?
        -- But "Penalty" implies the creator suffers.
        -- For now, we just mark promise failed. 
        -- If we mark promise failed, do other users get their points back?
        -- The "Wash Rule" (from previous docs) might apply if everyone fails.
        -- But this is a forced delete.
        -- I'll implement: Creator fails. Others get refunded?
        -- User said "Deduct remaining locked Promise Points".
        
        -- For simplicity and complying with "No loopholes", I will just mark the promise as failed.
        -- The points remain locked (lost).
        -- I will NOT refund anyone in this "Case 2".

        RETURN jsonb_build_object('success', true, 'message', 'Promise deleted. Points forfeited as penalty.');
    END IF;

    -- Default fallback (e.g. Pending with others?)
    -- If pending but others joined, we probably should refund everyone and delete.
    IF v_promise.status = 'pending' THEN
         -- Refund everyone
         FOR v_promise IN SELECT user_id FROM promise_participants WHERE promise_id = p_promise_id LOOP
             UPDATE profiles SET promise_points = promise_points + v_points WHERE id = v_promise.user_id;
             INSERT INTO promise_point_ledger (user_id, points, reason, description, promise_id)
             VALUES (v_promise.user_id, v_points, 'daily_redistribution', 'Promise cancelled by creator', p_promise_id);
         END LOOP;
         
         UPDATE promises SET status = 'deleted' WHERE id = p_promise_id;
         RETURN jsonb_build_object('success', true, 'message', 'Promise cancelled. All participants refunded.');
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'Could not delete promise (Unknown state)');
END;
$$;
