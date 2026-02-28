-- =====================================================
-- 46_end_of_promise_redistribution.sql
-- Modify check_and_finalize_verification to ONLY award
-- points at the END of the promise, avoiding daily bonuses.
-- Daily checks still happen (streaks update, status updates).
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_finalize_verification(p_promise_id uuid, p_date date)
RETURNS void AS $$
DECLARE
    v_total_participants int;
    v_submissions record;
    v_missing_count int;
    v_vote_count int;
    v_is_day_complete boolean := true;
    v_active_voters int;
    v_effective_required int;
    v_confirms int;
    v_rejects int;
    
    -- Promise details
    v_locked_points int;
    v_duration int;
    v_promise_title text;
    v_start_date date;
    v_days_elapsed int;
    v_is_final_day boolean := false;
    v_promise_type text;
    
    -- Daily outcome vars
    v_winners uuid[];
    v_losers uuid[];
    
    -- Final calculation vars
    v_participant uuid;
    v_participant_success_days int;
    v_total_success_days int := 0;
    v_total_pool int;
    v_share_per_success numeric;
    v_participant_reward int;
    v_base_refund int;
    v_bonus_share int;
BEGIN
    -- A. Get Participant Count
    v_total_participants := get_promise_participant_count(p_promise_id);

    -- LOCKING to prevent race conditions
    PERFORM 1 FROM public.promises WHERE id = p_promise_id FOR UPDATE;

    -- B. Check 1: Have ALL participants submitted?
    SELECT count(*) INTO v_missing_count
    FROM public.promise_participants pp
    WHERE pp.promise_id = p_promise_id
    AND NOT EXISTS (
        SELECT 1 FROM public.promise_submissions ps
        WHERE ps.promise_id = p_promise_id
        AND ps.user_id = pp.user_id
        AND ps.date = p_date
    );

    IF v_missing_count > 0 THEN
        RETURN; -- Still waiting for submissions
    END IF;

    -- C. Check 2: Has EVERY submission received required votes?
    -- (For self promises, active voters is just 1 (themselves), who bypasses voting)
    SELECT count(*) INTO v_active_voters
    FROM public.promise_submissions
    WHERE promise_id = p_promise_id AND date = p_date
    AND image_url NOT IN ('auto_fail_placeholder');

    FOR v_submissions IN 
        SELECT id, user_id, status, image_url FROM public.promise_submissions 
        WHERE promise_id = p_promise_id AND date = p_date
    LOOP
        IF v_submissions.image_url IN ('manual_fail', 'auto_fail_placeholder', 'self_completed') THEN
            CONTINUE;
        END IF;

        v_effective_required := greatest(v_active_voters - 1, 0);
        
        IF v_effective_required = 0 THEN
            CONTINUE;
        END IF;

        SELECT count(*) INTO v_vote_count
        FROM public.submission_verifications
        WHERE submission_id = v_submissions.id;

        IF v_vote_count < v_effective_required THEN
            v_is_day_complete := false;
            EXIT;
        END IF;
    END LOOP;

    IF NOT v_is_day_complete THEN
        RETURN; -- Still waiting for votes
    END IF;

    -- =======================================================
    -- D. ALL COMPLETE -> FINALIZE THE DAY
    -- =======================================================
    
    -- Prevent double finalization for this day: we use a specific ledger entry 'daily_finalized'
    -- Since we no longer distribute daily points, we need a zero-point record to mark the day done.
    IF EXISTS (
        SELECT 1 FROM public.promise_point_ledger 
        WHERE promise_id = p_promise_id 
        AND reason = 'daily_success' -- We will use this to just log completion without points if needed, but let's just rely on submission status.
        -- Actually, wait: We'll just check if ALL submissions are already finalized (status != pending).
    ) THEN
        -- We can just check if any are still pending
        IF NOT EXISTS (
            SELECT 1 FROM public.promise_submissions 
            WHERE promise_id = p_promise_id AND date = p_date AND status = 'pending'
        ) THEN
            RETURN; -- Day already finalized
        END IF;
    END IF;

    -- Get promise details
    SELECT locked_points, duration_days, title, created_at::date, promise_type
    INTO v_locked_points, v_duration, v_promise_title, v_start_date, v_promise_type
    FROM public.promises WHERE id = p_promise_id;
    
    v_locked_points := COALESCE(v_locked_points, 10);
    v_duration := COALESCE(v_duration, 7);
    v_days_elapsed := p_date - v_start_date + 1;
    
    IF v_days_elapsed >= v_duration THEN
        v_is_final_day := true;
    END IF;
    
    v_winners := ARRAY[]::uuid[];
    v_losers := ARRAY[]::uuid[];

    -- Loop through all submissions to determine outcome and update status
    FOR v_submissions IN 
        SELECT id, user_id, image_url FROM public.promise_submissions 
        WHERE promise_id = p_promise_id AND date = p_date AND status = 'pending'
    LOOP
        SELECT 
            count(*) FILTER (WHERE decision = 'confirm'),
            count(*) FILTER (WHERE decision = 'reject')
        INTO v_confirms, v_rejects
        FROM public.submission_verifications
        WHERE submission_id = v_submissions.id;

        IF v_submissions.image_url IN ('manual_fail', 'auto_fail_placeholder') OR v_rejects > v_confirms THEN
            UPDATE public.promise_submissions SET status = 'rejected' WHERE id = v_submissions.id;
            INSERT INTO public.daily_checkins (promise_id, user_id, date, status)
            VALUES (p_promise_id, v_submissions.user_id, p_date, 'failed')
            ON CONFLICT (promise_id, user_id, date) DO UPDATE SET status = 'failed';
            
            v_losers := array_append(v_losers, v_submissions.user_id);
            PERFORM update_streak(v_submissions.user_id, false);
            
            -- Log daily failure globally (0 points, just tracking)
            PERFORM award_promise_points(v_submissions.user_id, p_promise_id, 0, 'daily_failure',
                'Day ' || v_days_elapsed || ' Missed: ' || COALESCE(v_promise_title, 'Promise'));

        ELSE
            UPDATE public.promise_submissions SET status = 'verified' WHERE id = v_submissions.id;
            INSERT INTO public.daily_checkins (promise_id, user_id, date, status, proof_url)
            VALUES (p_promise_id, v_submissions.user_id, p_date, 'done', v_submissions.image_url)
            ON CONFLICT (promise_id, user_id, date) DO UPDATE SET status = 'done';
            
            v_winners := array_append(v_winners, v_submissions.user_id);
            PERFORM update_streak(v_submissions.user_id, true);
            PERFORM calculate_user_level(v_submissions.user_id);
            
            -- Log daily success globally (0 points, just tracking)
            PERFORM award_promise_points(v_submissions.user_id, p_promise_id, 0, 'daily_success',
                'Day ' || v_days_elapsed || ' Completed: ' || COALESCE(v_promise_title, 'Promise'));
        END IF;
    END LOOP;

    -- =======================================================
    -- E. END OF PROMISE REDISTRIBUTION
    -- =======================================================
    -- Points are ONLY distributed on the final day.
    
    IF v_is_final_day THEN
        -- Mark promise as completed
        UPDATE public.promises SET status = 'completed', ended_at = now() WHERE id = p_promise_id;
        
        -- Total PP pool available for redistribution (Total locked across all participants)
        -- Formula: participants * v_locked_points
        v_total_pool := v_locked_points * v_total_participants;
        
        -- Step 1: Calculate total number of successful days across ALL participants combined
        SELECT count(*)
        INTO v_total_success_days
        FROM public.daily_checkins
        WHERE promise_id = p_promise_id AND status = 'done';
        
        -- Edge Case: If NO ONE succeeded any day, points are lost entirely. No distribution.
        IF v_total_success_days > 0 THEN
            
            -- Step 2: Calculate the value of a single successful day
            -- This perfectly redistributes the full pool based on effort.
            v_share_per_success := v_total_pool::numeric / v_total_success_days::numeric;
            
            -- Step 3: Distribute to each participant based on their successful days
            FOR v_participant IN SELECT DISTINCT user_id FROM public.promise_participants WHERE promise_id = p_promise_id LOOP
                
                -- Count how many days THIS participant succeeded
                SELECT count(*) INTO v_participant_success_days
                FROM public.daily_checkins
                WHERE promise_id = p_promise_id AND user_id = v_participant AND status = 'done';
                
                IF v_participant_success_days > 0 THEN
                    -- Calculate their final reward and round to nearest integer
                    v_participant_reward := round(v_participant_success_days * v_share_per_success);
                    
                    -- Only award points if greater than 0
                    IF v_participant_reward > 0 THEN
                        -- If participant got exactly what they put in or less (just refunding what they locked based on success rate)
                        IF v_participant_reward <= v_locked_points THEN
                            PERFORM award_promise_points(v_participant, p_promise_id, v_participant_reward, 'promise_completed',
                            'Promise End Refund: ' || COALESCE(v_promise_title, 'Promise') || ' (' || v_participant_success_days || '/' || v_duration || ' days)');
                        ELSE
                            -- If they made a profit (bonus from others failing)
                            v_base_refund := v_locked_points;
                            v_bonus_share := v_participant_reward - v_locked_points;
                            
                            -- Award base refund
                            PERFORM award_promise_points(v_participant, p_promise_id, v_base_refund, 'promise_completed',
                            'Promise End Refund: ' || COALESCE(v_promise_title, 'Promise') || ' (' || v_participant_success_days || '/' || v_duration || ' days)');
                            
                            -- Award bonus profit
                            PERFORM award_promise_points(v_participant, p_promise_id, v_bonus_share, 'daily_redistribution',
                            'Promise End Bonus Profit: ' || COALESCE(v_promise_title, 'Promise') || ' (from redistributions)');
                        END IF;
                    END IF;
                END IF;
            END LOOP;
        END IF;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
