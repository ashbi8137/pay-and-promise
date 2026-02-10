-- =================================================================
-- FIX VERIFICATION LOGIC: Deterministic State Machine (Wait for Everyone)
-- =================================================================

-- 1. Helper: Get Promise Participant Count
create or replace function get_promise_participant_count(p_promise_id uuid)
returns int as $$
declare
    v_count int;
begin
    select count(*) into v_count
    from public.promise_participants
    where promise_id = p_promise_id;
    return v_count;
end;
$$ language plpgsql security definer;

-- 2. Core State Machine: Check if Day is Complete and Finalize
create or replace function check_and_finalize_verification(p_promise_id uuid, p_date date)
returns void as $$
declare
    v_total_participants int;
    v_submissions record;
    v_missing_count int;
    v_vote_count int;
    v_required_votes int;
    v_confirms int;
    v_rejects int;
    v_stake numeric;
    v_is_day_complete boolean := true;
    
    -- Settlement Vars
    v_winners_id uuid[];
    v_winner_uuid uuid;
    v_total_pool numeric := 0;
    v_share numeric := 0;
begin
    -- A. Get Participant Count
    v_total_participants := get_promise_participant_count(p_promise_id);
    v_required_votes := v_total_participants - 1;

    -- LOCKING to prevent race conditions (double deduction)
    -- We lock the promise row for update to serialize access to this promise's settlement logic
    perform 1 from public.promises where id = p_promise_id for update;

    -- B. Check 1: Have ALL participants submitted?
    select count(*) into v_missing_count
    from public.promise_participants pp
    where pp.promise_id = p_promise_id
    and not exists (
        select 1 from public.promise_submissions ps
        where ps.promise_id = p_promise_id
        and ps.user_id = pp.user_id
        and ps.date = p_date
    );

    -- If anyone is missing, we CANNOT finalize.
    -- (Unless deadline passed? For now, we wait. Frontend handles "I failed" manual submission)
    if v_missing_count > 0 then
        -- Optional: Logic to auto-fail people if current_date > p_date can go here.
        -- For now, we follow strict "Wait for Everyone" rule.
        return; 
    end if;

    -- C. Check 2: Has EVERY submission received required votes?
    -- IMPORTANT: Required votes must account for auto-failed/rejected users who CAN'T vote.
    -- We count how many participants have NOT been rejected for this day.
    declare
        v_active_voters int;
        v_effective_required int;
    begin
        select count(*) into v_active_voters
        from public.promise_submissions
        where promise_id = p_promise_id and date = p_date
        and status != 'rejected';
        
        for v_submissions in 
            select id, user_id, status, image_url from public.promise_submissions 
            where promise_id = p_promise_id and date = p_date
        loop
            -- Skip check if already decided (manual fail or pre-rejected)
            if v_submissions.status = 'rejected' or v_submissions.image_url in ('manual_fail', 'auto_fail_placeholder') then
                continue;
            end if;

            -- Dynamic required votes: other non-rejected participants (excluding self)
            v_effective_required := greatest(v_active_voters - 1, 0);
            
            -- If no voters remain (everyone else failed), auto-verify this submission
            if v_effective_required = 0 then
                continue; -- Will be verified during finalization
            end if;

            select count(*) into v_vote_count
            from public.submission_verifications
            where submission_id = v_submissions.id;

            if v_vote_count < v_effective_required then
                v_is_day_complete := false;
                exit; -- Exit loop, not done yet
            end if;
        end loop;
    end;

    if not v_is_day_complete then
        return; -- Still waiting for votes
    end if;

    -- =======================================================
    -- D. ALL COMPLETE -> FINALIZE EVERYTHING
    -- =======================================================
    
    -- Prevent double settlement (idempotency)
    if exists (select 1 from public.daily_settlements where promise_id = p_promise_id and date = p_date) then
        return;
    end if;

    select stake_per_day into v_stake from public.promises where id = p_promise_id;

    -- Loop through all submissions again to determine outcome
    for v_submissions in 
        select id, user_id, image_url from public.promise_submissions 
        where promise_id = p_promise_id and date = p_date
    loop
        -- 1. Count Decisions
        select 
            count(*) filter (where decision = 'confirm'),
            count(*) filter (where decision = 'reject')
        into v_confirms, v_rejects
        from public.submission_verifications
        where submission_id = v_submissions.id;

        -- 2. Determine Status
        -- Manual Fail (image_url checks) are already marked as rejected/failed usually, but let's enforce logic
        if v_submissions.image_url in ('manual_fail', 'auto_fail_placeholder') then
            -- Already failed
            update public.promise_submissions set status = 'rejected' where id = v_submissions.id;
            
            -- Apply Penalty (Idempotent Check)
            if not exists (
                select 1 from public.ledger 
                where promise_id = p_promise_id 
                and user_id = v_submissions.user_id 
                and type = 'penalty' 
                and created_at::date = p_date -- simplistic check for same-day
            ) then
                insert into public.ledger (promise_id, user_id, amount, type, description)
                values (p_promise_id, v_submissions.user_id, -v_stake, 'penalty', 'Failed submission');
            end if;
            
            -- Sync Checkin
            insert into public.daily_checkins (promise_id, user_id, date, status)
            values (p_promise_id, v_submissions.user_id, p_date, 'failed')
            on conflict (promise_id, user_id, date) do update set status = 'failed';

        elsif v_rejects > v_confirms then
             -- Majority REJECT
            update public.promise_submissions set status = 'rejected' where id = v_submissions.id;

            -- Apply Penalty (Idempotent Check)
            if not exists (
                select 1 from public.ledger 
                where promise_id = p_promise_id 
                and user_id = v_submissions.user_id 
                and type = 'penalty' 
                and created_at::date = p_date
            ) then
                insert into public.ledger (promise_id, user_id, amount, type, description)
                values (p_promise_id, v_submissions.user_id, -v_stake, 'penalty', 'Rejected by peers');
            end if;

            -- Sync Checkin
            insert into public.daily_checkins (promise_id, user_id, date, status)
            values (p_promise_id, v_submissions.user_id, p_date, 'failed')
            on conflict (promise_id, user_id, date) do update set status = 'failed';

        else
            -- Majority CONFIRM (or Tie -> Benefit of doubt? Let's say Verification)
            update public.promise_submissions set status = 'verified' where id = v_submissions.id;
            
            -- Add to winners list
            v_winners_id := array_append(v_winners_id, v_submissions.user_id);

            -- Sync Checkin
            insert into public.daily_checkins (promise_id, user_id, date, status, proof_url)
            values (p_promise_id, v_submissions.user_id, p_date, 'done', v_submissions.image_url)
            on conflict (promise_id, user_id, date) do update set status = 'done';
        end if;

    end loop;

    -- E. Distribute Pool (with Day-by-Day Forgiveness)
    if v_winners_id is null or array_length(v_winners_id, 1) is null then
        -- ALL FAILED → Day-by-Day Forgiveness: Refund everyone's penalties
        -- This ensures no money vanishes when everyone equally fails
        for v_submissions in
            select user_id from public.promise_submissions
            where promise_id = p_promise_id and date = p_date
        loop
            insert into public.ledger (promise_id, user_id, amount, type, description)
            values (p_promise_id, v_submissions.user_id, v_stake, 'refund', 'Day cancelled: Everyone failed');
        end loop;
        v_total_pool := 0;
        v_share := 0;
    else
        -- Standard Distribution: Pool = (Total - Winners) * Stake
        v_total_pool := (v_total_participants - array_length(v_winners_id, 1)) * v_stake;
        
        if v_total_pool > 0 and array_length(v_winners_id, 1) > 0 then
            v_share := v_total_pool / array_length(v_winners_id, 1);
            
            foreach v_winner_uuid in array v_winners_id loop
                 insert into public.ledger (promise_id, user_id, amount, type, description)
                 values (p_promise_id, v_winner_uuid, v_share, 'winnings', 'Daily distribution');
            end loop;
        end if;
    end if;

    -- F. Mark Settled
    insert into public.daily_settlements (promise_id, date, total_pool, winners_count, amount_per_winner)
    values (p_promise_id, p_date, v_total_pool, coalesce(array_length(v_winners_id, 1), 0), v_share);

    -- G. Check for Promise Completion
    declare
        v_duration int;
        v_settled_days int;
    begin
        select duration_days into v_duration from public.promises where id = p_promise_id;
        select count(*) into v_settled_days from public.daily_settlements where promise_id = p_promise_id;
        
        if v_settled_days >= v_duration then
            update public.promises set status = 'completed' where id = p_promise_id;
        end if;
    end;

end;
$$ language plpgsql security definer;

-- 3. Trigger Function: Watch Votes and Submissions
create or replace function handle_verification_trigger()
returns trigger as $$
declare
    v_promise_id uuid;
    v_date date;
begin
    if TG_TABLE_NAME = 'submission_verifications' then
        select promise_id, date into v_promise_id, v_date
        from public.promise_submissions
        where id = new.submission_id;
    elsif TG_TABLE_NAME = 'promise_submissions' then
        v_promise_id := new.promise_id;
        v_date := new.date;
    end if;

    -- Perform Check
    perform check_and_finalize_verification(v_promise_id, v_date);

    return new;
end;
$$ language plpgsql security definer;

-- 4. Apply Triggers
drop trigger if exists on_vote_added on public.submission_verifications;
create trigger on_vote_added
after insert on public.submission_verifications
for each row execute function handle_verification_trigger();

drop trigger if exists on_submission_added on public.promise_submissions;
create trigger on_submission_added
after insert on public.promise_submissions
for each row execute function handle_verification_trigger();
