-- FIX: Settlement Distribution Logic
-- Ensures "Winnings" are calculated dynamically (Amount / Duration) 
-- instead of relying on potentially empty 'stake_per_day' column.

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
    select array_agg(user_id) into v_missing_participants
    from public.promise_participants pp
    where pp.promise_id = p_promise_id
    and not exists (
        select 1 from public.promise_submissions ps
        where ps.promise_id = p_promise_id
        and ps.user_id = pp.user_id
        and ps.date = p_date
    );

    -- DYNAMIC STAKE CALCULATION (Crucial Fix)
    select (amount_per_person / nullif(duration_days, 0)) into v_stake 
    from public.promises where id = p_promise_id;
    v_stake := coalesce(v_stake, 0);

    -- Handle Auto-Fails
    if v_missing_participants is not null then
        foreach v_missing_user in array v_missing_participants loop
            insert into public.promise_submissions (promise_id, user_id, date, image_url, status)
            values (p_promise_id, v_missing_user, p_date, 'auto_fail_placeholder', 'rejected')
            on conflict (promise_id, user_id, date) do update set status = 'rejected';
            
            insert into public.ledger (promise_id, user_id, amount, type, description)
            values (p_promise_id, v_missing_user, -v_stake, 'penalty', 'Auto-failed: Missing submission');
        end loop;
    end if;

    -- E. Check Completeness (Everyone must be verified or rejected)
    select count(*) into v_submitted_count
    from public.promise_submissions
    where promise_id = p_promise_id
    and date = p_date
    and status in ('verified', 'rejected');

    if v_submitted_count < v_total_participants then
        return; -- Still waiting for votes
    end if;

    -- F. SETTLEMENT LOGIC
    
    select count(*) into v_winners_count
    from public.promise_submissions
    where promise_id = p_promise_id and date = p_date and status = 'verified';
    
    -- Pool = (Total - Winners) * Stake
    v_total_pool := (v_total_participants - v_winners_count) * v_stake;

    -- Distribute to Winners
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

    -- Mark Settled
    insert into public.daily_settlements (promise_id, date, total_pool, winners_count, amount_per_winner)
    values (p_promise_id, p_date, v_total_pool, v_winners_count, coalesce(v_share, 0));

end;
$$ language plpgsql security definer;
