-- =====================================================
-- 35_fix_verification_for_pp.sql
-- Rewrite check_and_finalize_verification for PP system
-- WITH full PP redistribution logic
-- =====================================================

-- 1. Add description column to promise_point_ledger (for Activity Log display)
ALTER TABLE public.promise_point_ledger ADD COLUMN IF NOT EXISTS description text;

-- 2. Update the CHECK constraint to allow new reason types
-- (Drop and recreate since ALTER CHECK is not straightforward)
ALTER TABLE public.promise_point_ledger DROP CONSTRAINT IF EXISTS promise_point_ledger_reason_check;
ALTER TABLE public.promise_point_ledger ADD CONSTRAINT promise_point_ledger_reason_check
  CHECK (reason IN (
    'daily_success',
    'daily_failure',
    'daily_redistribution',
    'daily_bonus',
    'promise_completed',
    'promise_failed',
    'streak_bonus',
    'signup_bonus',
    'level_up_bonus',
    'commitment_lock',
    'commitment_unlock'
  ));

-- 3. Drop old triggers before replacing functions
DROP TRIGGER IF EXISTS on_vote_added ON public.submission_verifications;
DROP TRIGGER IF EXISTS on_submission_added ON public.promise_submissions;

-- 4. Rewrite the core verification + PP redistribution function
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
    
    -- PP Redistribution vars
    v_locked_points int;
    v_duration int;
    v_daily_stake int;
    v_winners uuid[];
    v_losers uuid[];
    v_losers_pool int;
    v_winner_share int;
    v_winner_uuid uuid;
    v_loser_uuid uuid;
    v_promise_title text;
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
        IF v_submissions.image_url IN ('manual_fail', 'auto_fail_placeholder') THEN
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
    -- D. ALL COMPLETE -> FINALIZE EVERYTHING
    -- =======================================================
    
    -- Prevent double finalization: only use the PP ledger as the idempotency guard
    -- (submission status can be pre-set by the frontend, so we can't use it)
    IF EXISTS (
        SELECT 1 FROM public.promise_point_ledger 
        WHERE promise_id = p_promise_id 
        AND reason IN ('daily_success', 'daily_failure', 'daily_redistribution', 'daily_bonus')
        AND created_at::date = p_date
    ) THEN
        RETURN; -- Already distributed PP for this day
    END IF;

    -- Get promise details for PP calculation
    SELECT locked_points, duration_days, title 
    INTO v_locked_points, v_duration, v_promise_title
    FROM public.promises WHERE id = p_promise_id;
    
    v_locked_points := COALESCE(v_locked_points, 10);
    v_duration := COALESCE(v_duration, 7);
    v_daily_stake := greatest(v_locked_points / v_duration, 1);
    
    v_winners := ARRAY[]::uuid[];
    v_losers := ARRAY[]::uuid[];

    -- Loop through all submissions to determine outcome
    FOR v_submissions IN 
        SELECT id, user_id, image_url FROM public.promise_submissions 
        WHERE promise_id = p_promise_id AND date = p_date
    LOOP
        SELECT 
            count(*) FILTER (WHERE decision = 'confirm'),
            count(*) FILTER (WHERE decision = 'reject')
        INTO v_confirms, v_rejects
        FROM public.submission_verifications
        WHERE submission_id = v_submissions.id;

        IF v_submissions.image_url IN ('manual_fail', 'auto_fail_placeholder') THEN
            UPDATE public.promise_submissions SET status = 'rejected' WHERE id = v_submissions.id;
            INSERT INTO public.daily_checkins (promise_id, user_id, date, status)
            VALUES (p_promise_id, v_submissions.user_id, p_date, 'failed')
            ON CONFLICT (promise_id, user_id, date) DO UPDATE SET status = 'failed';
            v_losers := array_append(v_losers, v_submissions.user_id);

        ELSIF v_rejects > v_confirms THEN
            UPDATE public.promise_submissions SET status = 'rejected' WHERE id = v_submissions.id;
            INSERT INTO public.daily_checkins (promise_id, user_id, date, status)
            VALUES (p_promise_id, v_submissions.user_id, p_date, 'failed')
            ON CONFLICT (promise_id, user_id, date) DO UPDATE SET status = 'failed';
            v_losers := array_append(v_losers, v_submissions.user_id);

        ELSE
            UPDATE public.promise_submissions SET status = 'verified' WHERE id = v_submissions.id;
            INSERT INTO public.daily_checkins (promise_id, user_id, date, status, proof_url)
            VALUES (p_promise_id, v_submissions.user_id, p_date, 'done', v_submissions.image_url)
            ON CONFLICT (promise_id, user_id, date) DO UPDATE SET status = 'done';
            v_winners := array_append(v_winners, v_submissions.user_id);
        END IF;
    END LOOP;

    -- =======================================================
    -- E. PP REDISTRIBUTION
    -- =======================================================
    
    -- CASE 1: ALL SUCCEED → Everyone gets their daily portion refunded + 1 PP bonus
    IF array_length(v_losers, 1) IS NULL OR array_length(v_losers, 1) = 0 THEN
        FOREACH v_winner_uuid IN ARRAY v_winners LOOP
            -- Refund their daily portion (since EVERYONE succeeded, return their share)
            PERFORM award_promise_points(v_winner_uuid, p_promise_id, v_daily_stake, 'daily_success',
                'Daily success: ' || COALESCE(v_promise_title, 'Promise'));
            -- Small team bonus for everyone completing together
            PERFORM award_promise_points(v_winner_uuid, p_promise_id, 1, 'daily_bonus',
                'Team bonus: Everyone completed!');
            PERFORM update_streak(v_winner_uuid, true);
            PERFORM calculate_user_level(v_winner_uuid);
        END LOOP;
        
    -- CASE 2: ALL FAIL → No extra deduction needed (PP was already locked/deducted)
    -- Their daily portion simply stays lost. Just update streaks.
    ELSIF array_length(v_winners, 1) IS NULL OR array_length(v_winners, 1) = 0 THEN
        FOREACH v_loser_uuid IN ARRAY v_losers LOOP
            -- Log the failure (0 points — no extra deduction, just a record)
            PERFORM award_promise_points(v_loser_uuid, p_promise_id, 0, 'daily_failure',
                'Missed: ' || COALESCE(v_promise_title, 'Promise'));
            PERFORM update_streak(v_loser_uuid, false);
        END LOOP;
        
    -- CASE 3: MIXED → Winners get their refund + losers' unclaimed portions
    -- Losers don't lose extra (PP already locked). Winners claim the unclaimed pool.
    ELSE
        -- Losers' UNCLAIMED daily portions become the redistribution pool
        -- Fix: Handle remainder distribution so points aren't lost
        v_losers_pool := v_daily_stake * array_length(v_losers, 1);
        
        -- Losers: no extra deduction, just record the miss
        FOREACH v_loser_uuid IN ARRAY v_losers LOOP
            PERFORM award_promise_points(v_loser_uuid, p_promise_id, 0, 'daily_failure',
                'Missed: ' || COALESCE(v_promise_title, 'Promise'));
            PERFORM update_streak(v_loser_uuid, false);
        END LOOP;
        
        -- Winners: get their own daily_stake refunded + split of losers' unclaimed pool
        DECLARE
            v_winner_count int;
            v_base_share int;
            v_remainder int;
            v_idx int;
            v_bonus int;
        BEGIN
            v_winner_count := array_length(v_winners, 1);
            v_base_share := v_losers_pool / v_winner_count;
            v_remainder := v_losers_pool % v_winner_count;
            
            -- We can't easily iterate array with index using FOREACH, so we use a loop 1..N
            FOR v_idx IN 1..v_winner_count LOOP
                v_winner_uuid := v_winners[v_idx];
                
                -- Refund Daily Stake
                PERFORM award_promise_points(v_winner_uuid, p_promise_id, v_daily_stake, 'daily_success',
                    'Daily success: ' || COALESCE(v_promise_title, 'Promise'));
                
                -- Calculate Bonus (Base + 1 if lucky to get remainder)
                v_bonus := v_base_share;
                IF v_idx <= v_remainder THEN
                    v_bonus := v_bonus + 1;
                END IF;
                
                IF v_bonus > 0 THEN
                    PERFORM award_promise_points(v_winner_uuid, p_promise_id, v_bonus, 'daily_redistribution',
                        'Bonus from ' || COALESCE(v_promise_title, 'Promise') || ' (from missed members)');
                END IF;
                
                PERFORM update_streak(v_winner_uuid, true);
                PERFORM calculate_user_level(v_winner_uuid);
            END LOOP;
        END;
    END IF;

    -- F. Check for Promise Completion
    DECLARE
        v_start_date date;
        v_days_elapsed int;
    BEGIN
        SELECT created_at::date INTO v_start_date
        FROM public.promises WHERE id = p_promise_id;
        
        v_days_elapsed := p_date - v_start_date + 1;
        
        IF v_days_elapsed >= v_duration THEN
            UPDATE public.promises SET status = 'completed' WHERE id = p_promise_id;
        END IF;
    END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate triggers
CREATE TRIGGER on_vote_added
AFTER INSERT ON public.submission_verifications
FOR EACH ROW EXECUTE FUNCTION handle_verification_trigger();

CREATE TRIGGER on_submission_added
AFTER INSERT ON public.promise_submissions
FOR EACH ROW EXECUTE FUNCTION handle_verification_trigger();
