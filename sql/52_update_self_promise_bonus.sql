-- =====================================================
-- 52_update_self_promise_bonus.sql
-- Modify check_and_finalize_verification to include
-- 100% Bonus mechanic for Self Promises that reach 
-- full 100% successful check-in rate.
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
    SELECT count(*) INTO v_active_voters
    FROM public.promise_submissions
    WHERE promise_id = p_promise_id AND date = p_date
    AND image_url NOT IN ('auto_fail_placeholder');

    FOR v_submissions IN 
        SELECT id, user_id, status, image_url FROM public.promise_submissions 
        WHERE promise_id = p_promise_id AND date = p_date
    LOOP
        IF v_submissions.image_url IN ('manual_fail', 'auto_fail_placeholder', 'self_completed', 'self_completed_great', 'self_completed_normal', 'self_completed_struggled') THEN
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
    
    IF EXISTS (
        SELECT 1 FROM public.promise_point_ledger 
        WHERE promise_id = p_promise_id 
        AND reason = 'daily_success' 
    ) THEN
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
            
            -- Log daily failure
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
            
            -- Log daily success
            PERFORM award_promise_points(v_submissions.user_id, p_promise_id, 0, 'daily_success',
                'Day ' || v_days_elapsed || ' Completed: ' || COALESCE(v_promise_title, 'Promise'));
        END IF;
    END LOOP;

    -- =======================================================
    -- E. END OF PROMISE REDISTRIBUTION
    -- =======================================================
    
    IF v_is_final_day THEN
        UPDATE public.promises SET status = 'completed', ended_at = now() WHERE id = p_promise_id;
        
        -- === SELF PROMISE LOGIC ===
        IF v_promise_type = 'self' THEN
            -- Calculate success for the single participant
            SELECT user_id INTO v_participant FROM public.promise_participants WHERE promise_id = p_promise_id LIMIT 1;
            
            SELECT count(*) INTO v_participant_success_days
            FROM public.daily_checkins
            WHERE promise_id = p_promise_id AND user_id = v_participant AND status = 'done';
            
            -- If successfully completed ALL days, 100% refund + flat 25 PP bonus
            IF v_participant_success_days = v_duration THEN
                -- Refund
                PERFORM award_promise_points(v_participant, p_promise_id, v_locked_points, 'promise_completed',
                    'Self Promise Success Refund: ' || COALESCE(v_promise_title, 'Promise') || ' (' || v_participant_success_days || '/' || v_duration || ' days)');
                -- Bonus (100% match of staked points)
                PERFORM award_promise_points(v_participant, p_promise_id, v_locked_points, 'daily_redistribution',
                    'Self Promise Bonus: ' || COALESCE(v_promise_title, 'Promise'));
            
            -- Else, partial refund proportionally with NO bonus
            ELSIF v_participant_success_days > 0 THEN
                v_participant_reward := round((v_participant_success_days::numeric / v_duration::numeric) * v_locked_points);
                IF v_participant_reward > 0 THEN
                    PERFORM award_promise_points(v_participant, p_promise_id, v_participant_reward, 'promise_completed',
                        'Self Promise Partial Refund: ' || COALESCE(v_promise_title, 'Promise') || ' (' || v_participant_success_days || '/' || v_duration || ' days)');
                END IF;
            END IF;

        -- === GROUP PROMISE LOGIC ===
        ELSE
            v_total_pool := v_locked_points * v_total_participants;
            
            SELECT count(*) INTO v_total_success_days
            FROM public.daily_checkins
            WHERE promise_id = p_promise_id AND status = 'done';
            
            IF v_total_success_days > 0 THEN
                v_share_per_success := v_total_pool::numeric / v_total_success_days::numeric;
                
                FOR v_participant IN SELECT DISTINCT user_id FROM public.promise_participants WHERE promise_id = p_promise_id LOOP
                    
                    SELECT count(*) INTO v_participant_success_days
                    FROM public.daily_checkins
                    WHERE promise_id = p_promise_id AND user_id = v_participant AND status = 'done';
                    
                    IF v_participant_success_days > 0 THEN
                        v_participant_reward := round(v_participant_success_days * v_share_per_success);
                        
                        IF v_participant_reward > 0 THEN
                            IF v_participant_reward <= v_locked_points THEN
                                PERFORM award_promise_points(v_participant, p_promise_id, v_participant_reward, 'promise_completed',
                                'Promise End Refund: ' || COALESCE(v_promise_title, 'Promise') || ' (' || v_participant_success_days || '/' || v_duration || ' days)');
                            ELSE
                                v_base_refund := v_locked_points;
                                v_bonus_share := v_participant_reward - v_locked_points;
                                
                                PERFORM award_promise_points(v_participant, p_promise_id, v_base_refund, 'promise_completed',
                                'Promise End Refund: ' || COALESCE(v_promise_title, 'Promise') || ' (' || v_participant_success_days || '/' || v_duration || ' days)');
                                
                                PERFORM award_promise_points(v_participant, p_promise_id, v_bonus_share, 'daily_redistribution',
                                'Promise End Bonus Profit: ' || COALESCE(v_promise_title, 'Promise') || ' (from redistributions)');
                            END IF;
                        END IF;
                    END IF;
                END LOOP;
            END IF;
        END IF;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
