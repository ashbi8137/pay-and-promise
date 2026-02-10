-- =================================================================
-- AUTO-FAIL CRON: Settle days for users who missed the deadline
-- Run this daily via Supabase pg_cron or Edge Function
-- Schedule: Every day at midnight (or early morning)
-- =================================================================

-- This function finds all active promises where yesterday's date
-- has not been settled, auto-fails missing users, and triggers settlement.

create or replace function auto_fail_missing_submissions()
returns void as $$
declare
    v_promise record;
    v_yesterday date := current_date - interval '1 day';
    v_missing_user uuid;
    v_missing_users uuid[];
    v_stake numeric;
begin
    -- Find all active promises that should have been settled yesterday
    for v_promise in
        select p.id, p.stake_per_day, p.created_at, p.duration_days
        from public.promises p
        where p.status = 'active'
        -- Only process if yesterday falls within the promise's active window
        and v_yesterday >= (p.created_at::date)
        and v_yesterday < (p.created_at::date + p.duration_days)
        -- Skip if already settled for yesterday
        and not exists (
            select 1 from public.daily_settlements ds
            where ds.promise_id = p.id and ds.date = v_yesterday
        )
    loop
        v_stake := v_promise.stake_per_day;

        -- Find participants who did NOT submit for yesterday
        select array_agg(pp.user_id) into v_missing_users
        from public.promise_participants pp
        where pp.promise_id = v_promise.id
        and not exists (
            select 1 from public.promise_submissions ps
            where ps.promise_id = v_promise.id
            and ps.user_id = pp.user_id
            and ps.date = v_yesterday
        );

        -- Auto-fail missing users
        if v_missing_users is not null then
            foreach v_missing_user in array v_missing_users loop
                -- Insert auto-fail submission
                insert into public.promise_submissions (promise_id, user_id, date, image_url, status)
                values (v_promise.id, v_missing_user, v_yesterday, 'auto_fail_placeholder', 'rejected')
                on conflict (promise_id, user_id, date) do update set status = 'rejected';

                -- Apply penalty
                if not exists (
                    select 1 from public.ledger
                    where promise_id = v_promise.id
                    and user_id = v_missing_user
                    and type = 'penalty'
                    and created_at::date = v_yesterday
                ) then
                    insert into public.ledger (promise_id, user_id, amount, type, description)
                    values (v_promise.id, v_missing_user, -v_stake, 'penalty', 'Auto-failed: Missing submission');
                end if;

                -- Sync daily_checkins
                insert into public.daily_checkins (promise_id, user_id, date, status)
                values (v_promise.id, v_missing_user, v_yesterday, 'failed')
                on conflict (promise_id, user_id, date) do update set status = 'failed';
            end loop;
        end if;

        -- Now try to finalize the day (triggers full settlement logic)
        perform check_and_finalize_verification(v_promise.id, v_yesterday);
    end loop;
end;
$$ language plpgsql security definer;

-- =================================================================
-- SCHEDULE WITH pg_cron (Run in Supabase SQL Editor)
-- Runs every day at 00:30 UTC (6:00 AM IST)
-- =================================================================
-- Uncomment the line below after running the function creation above:
--
-- select cron.schedule(
--     'auto-fail-missing-submissions',
--     '30 0 * * *',
--     'select auto_fail_missing_submissions()'
-- );
--
-- To verify the cron job is scheduled:
-- select * from cron.job;
--
-- To manually test (run once for yesterday):
-- select auto_fail_missing_submissions();
