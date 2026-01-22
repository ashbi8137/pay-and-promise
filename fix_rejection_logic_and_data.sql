-- 1. DATA CLEANUP: Fix "Done" ticks that should be "Failed"
update public.daily_checkins dc
set status = 'failed'
from public.promise_submissions ps
where dc.promise_id = ps.promise_id
and dc.user_id = ps.user_id
and dc.date = ps.date
and ps.status = 'rejected'
and dc.status = 'done';

-- 2. ENSURE LOGIC: Update the Trigger to handle Rejections correctly
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
begin
  select promise_id, user_id, date into v_promise_id, v_submitter_id, v_submission_date
  from public.promise_submissions
  where id = new.submission_id;

  if new.verifier_user_id = v_submitter_id then
    raise exception 'Users cannot vote on their own submission';
  end if;

  -- 1. REJECT LOGIC (Immediate if any reject? OR Majority? Stick to Immediate/Strict for safety or check Majority)
  -- Let's stick to the previous logic: If rejection happens, mark rejected.
  if new.decision = 'reject' then
    update public.promise_submissions
    set status = 'rejected'
    where id = new.submission_id;
    
    -- Sync Checkin to FAILED (This was missing/broken before)
    insert into public.daily_checkins (promise_id, user_id, date, status)
    values (v_promise_id, v_submitter_id, v_submission_date, 'failed')
    on conflict (promise_id, user_id, date) do update set status = 'failed';

    return new;
  end if;

  -- 2. CONFIRM LOGIC
  select count(*) into v_total_participants
  from public.promise_participants
  where promise_id = v_promise_id;

  select count(*) into v_confirm_count
  from public.submission_verifications
  where submission_id = new.submission_id
  and decision = 'confirm';

  -- Rule: Total Stats - 1 (Submitter)
  if v_confirm_count >= (v_total_participants - 1) then
    update public.promise_submissions
    set status = 'verified'
    where id = new.submission_id;

    -- Sync Checkin to DONE
    insert into public.daily_checkins (promise_id, user_id, date, status, proof_url)
    select promise_id, user_id, date, 'done', image_url
    from public.promise_submissions
    where id = new.submission_id
    on conflict (promise_id, user_id, date) do update set status = 'done';
  end if;

  return new;
end;
$$ language plpgsql security definer;
