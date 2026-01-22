-- Function to fetch aggregated stats for a user's journey
-- Bypasses complex RLS by running as SECURITY DEFINER (Admin privileges)
create or replace function get_journey_stats(p_user_id uuid)
returns table (
    promise_id uuid,
    winnings numeric,
    penalties numeric,
    net numeric,
    days_done bigint,
    days_failed bigint,
    total_days bigint
)
language plpgsql
security definer
as $$
begin
    return query
    select 
        p.id as promise_id,
        
        -- Calculate Winnings
        coalesce((
            select sum(amount) 
            from public.ledger l 
            where l.promise_id = p.id 
            and l.user_id = p_user_id 
            and l.type = 'winnings'
        ), 0) as winnings,
        
        -- Calculate Penalties
        coalesce((
            select sum(abs(amount)) 
            from public.ledger l 
            where l.promise_id = p.id 
            and l.user_id = p_user_id 
            and l.type = 'penalty'
        ), 0) as penalties,
        
        -- Net
        coalesce((
            select sum(amount) 
            from public.ledger l 
            where l.promise_id = p.id 
            and l.user_id = p_user_id
        ), 0) as net,

        -- Checkins Done
        (
            select count(*) 
            from public.daily_checkins dc 
            where dc.promise_id = p.id 
            and dc.user_id = p_user_id 
            and dc.status = 'done'
        ) as days_done,

        -- Checkins Failed
        (
            select count(*) 
            from public.daily_checkins dc 
            where dc.promise_id = p.id 
            and dc.user_id = p_user_id 
            and dc.status = 'failed'
        ) as days_failed,
        
        -- Total checkins (recorded)
        (
            select count(*) 
            from public.daily_checkins dc 
            where dc.promise_id = p.id 
            and dc.user_id = p_user_id 
        ) as total_days

    from public.promises p
    where p.id in (
        select pp.promise_id 
        from public.promise_participants pp 
        where pp.user_id = p_user_id
    );
end;
$$;
