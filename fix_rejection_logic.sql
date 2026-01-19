-- FIX: Handle Verification Vote with Consensus for Rejection
-- Prevents double penalties and ensures "Both others must reject" logic.

create or replace function handle_verification_vote()
returns trigger as $$
declare
  v_promise_id uuid;
  v_submitter_id uuid;
  v_submission_date date;
  v_total_participants int;
  v_confirm_count int;
  v_reject_count int;
  v_stake numeric;
  v_current_status text;
begin
  -- Get context
  select promise_id, user_id, date, status into v_promise_id, v_submitter_id, v_submission_date, v_current_status
  from public.promise_submissions
  where id = new.submission_id;

  -- PREVENT SELF VOTING
  if new.verifier_user_id = v_submitter_id then
    raise exception 'Users cannot vote on their own submission';
  end if;
  
  -- CRITICAL FIX 1: Prevent double-processing if already finalized
  if v_current_status <> 'pending' then
      return new;
  end if;

  -- Count Total Participants
  select count(*) into v_total_participants
  from public.promise_participants
  where promise_id = v_promise_id;

  -- 1. REJECT LOGIC (CONSENSUS REQUIRED)
  -- User Requirement: "Deduction ... only happen if both others are marked as rejected"
  if new.decision = 'reject' then
    select count(*) into v_reject_count
    from public.submission_verifications
    where submission_id = new.submission_id
    and decision = 'reject';
    
    -- Require Peers (Total - 1) to Reject
    if v_reject_count >= (v_total_participants - 1) then
        update public.promise_submissions
        set status = 'rejected'
        where id = new.submission_id;
        
        -- Apply Penalty (Only once, now that status changes to rejected)
        select (amount_per_person / nullif(duration_days, 0)) into v_stake 
        from public.promises where id = v_promise_id;
        
        v_stake := coalesce(v_stake, 0);
        
        insert into public.ledger (promise_id, user_id, amount, type, description)
        values (v_promise_id, v_submitter_id, -v_stake, 'penalty', 'Submission rejected by consensus');

        -- Try to settle
        perform check_and_settle_day(v_promise_id, v_submission_date);
    end if;
    return new;
  end if;

  -- 2. CONFIRM LOGIC (CONSENSUS ALREADY EXISTED)
  if new.decision = 'confirm' then
      select count(*) into v_confirm_count
      from public.submission_verifications
      where submission_id = new.submission_id
      and decision = 'confirm';

      if v_confirm_count >= (v_total_participants - 1) then
        update public.promise_submissions
        set status = 'verified'
        where id = new.submission_id;

        -- Legacy support: push to daily_checkins
        insert into public.daily_checkins (promise_id, user_id, date, status, proof_url)
        select promise_id, user_id, date, 'done', image_url
        from public.promise_submissions
        where id = new.submission_id
        on conflict (promise_id, user_id, date) do nothing;
        
        -- Try to settle
        perform check_and_settle_day(v_promise_id, v_submission_date);
      end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;
