-- 1. Schema Upgrades for Money & Settlement
-- Add stake_per_day to promises if it doesn't exist (calc logic needed on insert, but we add column here)
alter table public.promises add column if not exists stake_per_day numeric default 0;

-- Create table to track which days have been settled (money distributed)
create table if not exists public.daily_settlements (
    id uuid default gen_random_uuid() primary key,
    promise_id uuid references public.promises(id) on delete cascade not null,
    date date not null,
    settled_at timestamp with time zone default now(),
    total_pool numeric default 0,
    winners_count int default 0,
    amount_per_winner numeric default 0,
    unique(promise_id, date)
);

-- 2. Helper Function: Check and Settle the Day
-- This checks if everyone has submitted (verified or rejected).
-- If anyone is missing, it marks them rejected (Auto-Fail).
-- Then it distributes the pool.
create or replace function check_and_settle_day(p_promise_id uuid, p_date date)
returns void as $$
declare
    v_total_participants int;
    v_submitted_count int;
    v_missing_participants uuid[];
    v_missing_user uuid;
    
    v_total_pool numeric := 0;
    v_winners_count int := 0;
    v_stake numeric;
    v_share numeric;
    v_winner_id uuid;
begin
    -- A. Check if already settled
    if exists (select 1 from public.daily_settlements where promise_id = p_promise_id and date = p_date) then
        return;
    end if;

    -- B. Get Total Active Participants
    select count(*) into v_total_participants
    from public.promise_participants
    where promise_id = p_promise_id;

    -- C. AUTO-FAIL LOGIC: Identify missing submissions
    -- Find users in promise_participants who DO NOT have a submission for this date
    select array_agg(user_id) into v_missing_participants
    from public.promise_participants pp
    where pp.promise_id = p_promise_id
    and not exists (
        select 1 from public.promise_submissions ps
        where ps.promise_id = p_promise_id
        and ps.user_id = pp.user_id
        and ps.date = p_date
    );

    -- D. Check completeness
    -- We only proceed if (submitted_count + missing_count) == total. 
    -- Actually, we FORCE the missing ones to reject, so we become complete.
    
    if v_missing_participants is not null then
        foreach v_missing_user in array v_missing_participants loop
            -- Insert a REJECTED submission (Auto-Fail)
            -- This relies on the trigger to deduct the penalty? 
            -- No, the trigger handles VOTES. We need to handle submission status change or direct penalty here.
            
            insert into public.promise_submissions (promise_id, user_id, date, image_url, status)
            values (p_promise_id, v_missing_user, p_date, 'auto_fail_placeholder', 'rejected')
            on conflict (promise_id, user_id, date) do update set status = 'rejected';
            
            -- We need to Apply Penalty for these Auto-Fails here because they won't get votes
            select stake_per_day into v_stake from public.promises where id = p_promise_id;
            
            insert into public.ledger (promise_id, user_id, amount, type, description)
            values (p_promise_id, v_missing_user, -v_stake, 'penalty', 'Auto-failed: Missing submission');
        end loop;
    end if;

    -- E. Now Check if EVERYONE is accounted for (Verified or Rejected)
    select count(*) into v_submitted_count
    from public.promise_submissions
    where promise_id = p_promise_id
    and date = p_date
    and status in ('verified', 'rejected');

    if v_submitted_count < v_total_participants then
        -- Still waiting for some votes to finalize the status of pending submissions
        return; 
    end if;

    -- F. SETTLEMENT LOGIC (All accounted for)
    
    -- 1. Calculate the Pool (Sum of absolute penalties for this day)
    -- We look at ledger entries created TODAY (or for this task date? Ledger doesnt have date column for task, only created_at)
    -- Ideally ledger should link to the submission or date. For MVP, we trust the 'penalty' entries created recently or we calculate from Rejections.
    -- Safer: Count rejections and multiply by stake.
    
    select stake_per_day into v_stake from public.promises where id = p_promise_id;
    
    select count(*) into v_winners_count
    from public.promise_submissions
    where promise_id = p_promise_id and date = p_date and status = 'verified';
    
    -- Pool = (Total Participants - Winners) * Stake
    -- Alternatively: Total Rejections * Stake
    v_total_pool := (v_total_participants - v_winners_count) * v_stake;

    -- 2. Distribute to Winners
    if v_winners_count > 0 and v_total_pool > 0 then
        v_share := v_total_pool / v_winners_count;
        
        for v_winner_id in 
            select user_id from public.promise_submissions 
            where promise_id = p_promise_id and date = p_date and status = 'verified'
        loop
            insert into public.ledger (promise_id, user_id, amount, type, description)
            values (p_promise_id, v_winner_id, v_share, 'winnings', 'Daily distribution for ' || p_date);
        end loop;
    end if;

    -- 3. Mark Settled
    insert into public.daily_settlements (promise_id, date, total_pool, winners_count, amount_per_winner)
    values (p_promise_id, p_date, v_total_pool, v_winners_count, coalesce(v_share, 0));

end;
$$ language plpgsql security definer;


-- 3. Updated Trigger Function: Handle Votes
create or replace function handle_verification_vote()
returns trigger as $$
declare
  v_promise_id uuid;
  v_submitter_id uuid;
  v_submission_date date;
  v_total_participants int;
  v_confirm_count int;
  v_stake numeric;
begin
  -- Get context
  select promise_id, user_id, date into v_promise_id, v_submitter_id, v_submission_date
  from public.promise_submissions
  where id = new.submission_id;

  -- PREVENT SELF VOTING
  if new.verifier_user_id = v_submitter_id then
    raise exception 'Users cannot vote on their own submission';
  end if;

  -- 1. Immediate Rejection Rule
  if new.decision = 'reject' then
    update public.promise_submissions
    set status = 'rejected'
    where id = new.submission_id;
    
    -- Apply Penalty Immediately
    select stake_per_day into v_stake from public.promises where id = v_promise_id;
    
    insert into public.ledger (promise_id, user_id, amount, type, description)
    values (v_promise_id, v_submitter_id, -v_stake, 'penalty', 'Submission rejected by peer');

    -- Try to settle the day (in case this was the last person needed)
    perform check_and_settle_day(v_promise_id, v_submission_date);
    
    return new;
  end if;

  -- 2. Count Total Participants
  select count(*) into v_total_participants
  from public.promise_participants
  where promise_id = v_promise_id;

  -- 3. Count Confirms
  select count(*) into v_confirm_count
  from public.submission_verifications
  where submission_id = new.submission_id
  and decision = 'confirm';

  -- 4. Strict Threshold: Total - 1
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
    
    -- Try to settle the day
    perform check_and_settle_day(v_promise_id, v_submission_date);
    
  end if;

  return new;
end;
$$ language plpgsql security definer;
