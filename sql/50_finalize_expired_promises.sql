-- =====================================================
-- 50_finalize_expired_promises.sql
-- RPC that finds all expired-but-still-active promises
-- and runs the end-of-promise redistribution for each.
-- Called from the frontend on every app load.
-- =====================================================

CREATE OR REPLACE FUNCTION public.finalize_expired_promises()
RETURNS integer AS $$
DECLARE
    v_expired RECORD;
    v_count integer := 0;
    v_total_participants int;
    v_participant uuid;
    v_participant_success_days int;
    v_total_success_days int;
    v_total_pool int;
    v_share_per_success numeric;
    v_participant_reward int;
    v_base_refund int;
    v_bonus_share int;
    v_promise_type text;
    v_duration int;
    v_locked_points int;
    v_promise_title text;
BEGIN
    -- Find all promises that are still 'active' but past their end date
    FOR v_expired IN
        SELECT id, title, duration_days, locked_points, created_at, promise_type
        FROM public.promises
        WHERE status = 'active'
          AND (created_at::date + duration_days) < CURRENT_DATE
        FOR UPDATE SKIP LOCKED  -- Prevent concurrent runs from clashing
    LOOP
        v_count := v_count + 1;
        v_duration := COALESCE(v_expired.duration_days, 7);
        v_locked_points := COALESCE(v_expired.locked_points, 10);
        v_promise_title := v_expired.title;
        v_promise_type := COALESCE(v_expired.promise_type, 'group');

        -- Get participant count
        SELECT count(*) INTO v_total_participants
        FROM public.promise_participants
        WHERE promise_id = v_expired.id;

        IF v_total_participants = 0 THEN
            -- No participants, just mark as completed
            UPDATE public.promises SET status = 'completed', ended_at = now() WHERE id = v_expired.id;
            CONTINUE;
        END IF;

        -- Mark promise as completed
        UPDATE public.promises SET status = 'completed', ended_at = now() WHERE id = v_expired.id;

        -- Calculate total pool
        v_total_pool := v_locked_points * v_total_participants;

        -- Count total success days across all participants
        SELECT count(*) INTO v_total_success_days
        FROM public.daily_checkins
        WHERE promise_id = v_expired.id AND status = 'done';

        IF v_total_success_days > 0 THEN
            v_share_per_success := v_total_pool::numeric / v_total_success_days::numeric;

            FOR v_participant IN SELECT DISTINCT user_id FROM public.promise_participants WHERE promise_id = v_expired.id LOOP
                SELECT count(*) INTO v_participant_success_days
                FROM public.daily_checkins
                WHERE promise_id = v_expired.id AND user_id = v_participant AND status = 'done';

                IF v_participant_success_days > 0 THEN
                    v_participant_reward := round(v_participant_success_days * v_share_per_success);

                    IF v_participant_reward > 0 THEN
                        IF v_participant_reward <= v_locked_points THEN
                            PERFORM award_promise_points(v_participant, v_expired.id, v_participant_reward, 'promise_completed',
                                'Promise End Refund: ' || COALESCE(v_promise_title, 'Promise') || ' (' || v_participant_success_days || '/' || v_duration || ' days)');
                        ELSE
                            v_base_refund := v_locked_points;
                            v_bonus_share := v_participant_reward - v_locked_points;

                            PERFORM award_promise_points(v_participant, v_expired.id, v_base_refund, 'promise_completed',
                                'Promise End Refund: ' || COALESCE(v_promise_title, 'Promise') || ' (' || v_participant_success_days || '/' || v_duration || ' days)');

                            PERFORM award_promise_points(v_participant, v_expired.id, v_bonus_share, 'daily_redistribution',
                                'Promise End Bonus Profit: ' || COALESCE(v_promise_title, 'Promise') || ' (from redistributions)');
                        END IF;
                    END IF;
                END IF;

                -- Update completion counters
                IF v_participant_success_days > 0 THEN
                    IF v_promise_type = 'self' THEN
                        UPDATE public.profiles
                        SET completed_promises_count = completed_promises_count + 1,
                            total_self_completed = total_self_completed + 1
                        WHERE id = v_participant;
                    ELSE
                        UPDATE public.profiles
                        SET completed_promises_count = completed_promises_count + 1,
                            total_group_completed = total_group_completed + 1
                        WHERE id = v_participant;
                    END IF;
                ELSE
                    UPDATE public.profiles
                    SET failed_promises_count = failed_promises_count + 1
                    WHERE id = v_participant;
                END IF;

                -- Recalculate integrity score
                PERFORM recalculate_integrity_score(v_participant);
            END LOOP;
        ELSE
            -- Nobody succeeded at all
            FOR v_participant IN SELECT DISTINCT user_id FROM public.promise_participants WHERE promise_id = v_expired.id LOOP
                UPDATE public.profiles
                SET failed_promises_count = failed_promises_count + 1
                WHERE id = v_participant;
                PERFORM recalculate_integrity_score(v_participant);
            END LOOP;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
