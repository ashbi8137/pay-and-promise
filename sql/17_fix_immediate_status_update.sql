-- =================================================================
-- FIX: Update submission status IMMEDIATELY upon receiving required confirmations
-- This allows the "pending" badge to change to "verified" right away
-- =================================================================

-- Drop and recreate the trigger function to update status immediately
create or replace function handle_verification_trigger()
returns trigger as $$
declare
    v_promise_id uuid;
    v_date date;
    v_submission_id uuid;
    v_submitter_id uuid;
    v_total_participants int;
    v_confirm_count int;
    v_reject_count int;
    v_required_votes int;
begin
    if TG_TABLE_NAME = 'submission_verifications' then
        v_submission_id := new.submission_id;
        
        select promise_id, date, user_id into v_promise_id, v_date, v_submitter_id
        from public.promise_submissions
        where id = new.submission_id;
        
        -- Prevent self-voting
        if new.verifier_user_id = v_submitter_id then
            raise exception 'Users cannot vote on their own submission';
        end if;
        
        -- Get participant count
        select count(*) into v_total_participants
        from public.promise_participants
        where promise_id = v_promise_id;
        
        v_required_votes := v_total_participants - 1;
        
        -- Count votes for this specific submission
        select 
            count(*) filter (where decision = 'confirm'),
            count(*) filter (where decision = 'reject')
        into v_confirm_count, v_reject_count
        from public.submission_verifications
        where submission_id = v_submission_id;
        
        -- IMMEDIATE STATUS UPDATE LOGIC
        if v_reject_count > 0 then
            -- Any reject = immediate rejection
            update public.promise_submissions
            set status = 'rejected'
            where id = v_submission_id and status = 'pending';
            
        elsif v_confirm_count >= v_required_votes then
            -- All required confirmations received = verified
            update public.promise_submissions
            set status = 'verified'
            where id = v_submission_id and status = 'pending';
            
            -- Also sync to daily_checkins
            insert into public.daily_checkins (promise_id, user_id, date, status, proof_url)
            select promise_id, user_id, date, 'done', image_url
            from public.promise_submissions
            where id = v_submission_id
            on conflict (promise_id, user_id, date) do update set status = 'done';
        end if;
        
    elsif TG_TABLE_NAME = 'promise_submissions' then
        v_promise_id := new.promise_id;
        v_date := new.date;
    end if;

    -- Optional: Call full day settlement check (this can run async or later)
    perform check_and_finalize_verification(v_promise_id, v_date);

    return new;
end;
$$ language plpgsql security definer;

-- Ensure trigger is active
drop trigger if exists on_vote_added on public.submission_verifications;
create trigger on_vote_added
after insert on public.submission_verifications
for each row execute function handle_verification_trigger();
