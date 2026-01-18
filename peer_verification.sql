-- 1. Table: promise_submissions (Holds the daily photo proofs)
create table if not exists public.promise_submissions (
  id uuid default gen_random_uuid() primary key,
  promise_id uuid references public.promises(id) not null,
  user_id uuid references auth.users(id) not null,
  date date default current_date not null,
  image_url text not null,
  status text check (status in ('pending', 'verified', 'rejected')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(promise_id, user_id, date)
);

-- RLS for Submissions
alter table public.promise_submissions enable row level security;

drop policy if exists "Submissions visible to promise participants" on public.promise_submissions;
create policy "Submissions visible to promise participants"
  on public.promise_submissions for select
  using (
    exists (
      select 1 from public.promise_participants
      where promise_id = promise_submissions.promise_id
      and user_id = auth.uid()
    )
    or user_id = auth.uid()
  );

drop policy if exists "Users can upload their own submissions" on public.promise_submissions;
create policy "Users can upload their own submissions"
  on public.promise_submissions for insert
  with check (auth.uid() = user_id);

-- 2. Table: v (Holds the votes)
create table if not exists public.submission_verifications (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references public.promise_submissions(id) on delete cascade not null,
  verifier_user_id uuid references auth.users(id) not null,
  decision text check (decision in ('confirm', 'reject')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(submission_id, verifier_user_id)
);

-- RLS for Verifications
alter table public.submission_verifications enable row level security;

drop policy if exists "Verifications visible to participants" on public.submission_verifications;
create policy "Verifications visible to participants"
  on public.submission_verifications for select
  using (true);

drop policy if exists "Peers can vote" on public.submission_verifications;
create policy "Peers can vote"
  on public.submission_verifications for insert
  with check (auth.uid() = verifier_user_id);


-- ==========================================
-- STRICT VERIFICATION & MONEY LOGIC
-- ==========================================

-- A. Schema Upgrades
alter table public.promises add column if not exists stake_per_day numeric default 0;

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
alter table public.daily_settlements enable row level security;


drop policy if exists "Read settlements" on public.daily_settlements;
create policy "Read settlements" on public.daily_settlements for select using(true);


-- B. Helper: Check and Settle Day
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
    -- 1. Check if already settled
    if exists (select 1 from public.daily_settlements where promise_id = p_promise_id and date = p_date) then
        return;
    end if;

    -- 2. Get Total Active Participants
    select count(*) into v_total_participants
    from public.promise_participants
    where promise_id = p_promise_id;

    -- 3. AUTO-FAIL LOGIC: Identify missing submissions
    -- CRITICAL FIX: Only run auto-fail if the target date is in the PAST ( < current_date )
    -- If p_date == current_date, we should NOT auto-fail missing people yet, as they might submit later today.
    
    if p_date < current_date then
        select array_agg(user_id) into v_missing_participants
        from public.promise_participants pp
        where pp.promise_id = p_promise_id
        and not exists (
            select 1 from public.promise_submissions ps
            where ps.promise_id = p_promise_id
            and ps.user_id = pp.user_id
            and ps.date = p_date
        );
        
        if v_missing_participants is not null then
            foreach v_missing_user in array v_missing_participants loop
                insert into public.promise_submissions (promise_id, user_id, date, image_url, status)
                values (p_promise_id, v_missing_user, p_date, 'auto_fail_placeholder', 'rejected')
                on conflict (promise_id, user_id, date) do update set status = 'rejected';
                
                -- Calculate stake dynamically
            select (amount_per_person / nullif(duration_days, 0)) into v_stake 
            from public.promises where id = p_promise_id;
            v_stake := coalesce(v_stake, 0);
                
                insert into public.ledger (promise_id, user_id, amount, type, description)
                values (p_promise_id, v_missing_user, -v_stake, 'penalty', 'Auto_failed: Missing submission');
            end loop;
        end if;
    end if;

    -- 4. Check Completeness
    select count(*) into v_submitted_count
    from public.promise_submissions
    where promise_id = p_promise_id
    and date = p_date
    and status in ('verified', 'rejected');

    if v_submitted_count < v_total_participants then
        return; -- Still waiting for pending votes
    end if;

    -- 5. SETTLEMENT
    -- 5. SETTLEMENT
    -- FIX: Calculate stake dynamically to ensure it's not 0 (if column wasn't populated)
    select (amount_per_person / nullif(duration_days, 0)) into v_stake 
    from public.promises where id = p_promise_id;
    
    v_stake := coalesce(v_stake, 0); -- Safety
    
    select count(*) into v_winners_count
    from public.promise_submissions
    where promise_id = p_promise_id and date = p_date and status = 'verified';
    
    v_total_pool := (v_total_participants - v_winners_count) * v_stake;

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

    insert into public.daily_settlements (promise_id, date, total_pool, winners_count, amount_per_winner)
    values (p_promise_id, p_date, v_total_pool, v_winners_count, coalesce(v_share, 0));

end;
$$ language plpgsql security definer;


-- C. Trigger Function: Handle Votes
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
  select promise_id, user_id, date into v_promise_id, v_submitter_id, v_submission_date
  from public.promise_submissions
  where id = new.submission_id;

  if new.verifier_user_id = v_submitter_id then
    raise exception 'Users cannot vote on their own submission';
  end if;

  -- 1. REJECT LOGIC
  if new.decision = 'reject' then
    update public.promise_submissions
    set status = 'rejected'
    where id = new.submission_id;
    
    -- Calculate stake dynamically
    select (amount_per_person / nullif(duration_days, 0)) into v_stake 
    from public.promises where id = v_promise_id;
    v_stake := coalesce(v_stake, 0);
    
    insert into public.ledger (promise_id, user_id, amount, type, description)
    values (v_promise_id, v_submitter_id, -v_stake, 'penalty', 'Submission rejected by peer');

    perform check_and_settle_day(v_promise_id, v_submission_date);
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

    insert into public.daily_checkins (promise_id, user_id, date, status, proof_url)
    select promise_id, user_id, date, 'done', image_url
    from public.promise_submissions
    where id = new.submission_id
    on conflict (promise_id, user_id, date) do nothing;
    
    perform check_and_settle_day(v_promise_id, v_submission_date);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_vote_added on public.submission_verifications;
create trigger on_vote_added
after insert on public.submission_verifications
for each row execute procedure handle_verification_vote();
