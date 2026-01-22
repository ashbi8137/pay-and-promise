-- Enable RLS on Ledger
alter table public.ledger enable row level security;

-- Allow users to view their OWN ledger entries
create policy "Users can view their own ledger history"
on public.ledger for select
using (auth.uid() = user_id);

-- Grants for other tables just in case
alter table public.promise_submissions enable row level security;

create policy "Users can view submissions for their promises"
on public.promise_submissions for select
using (
  exists (
    select 1 from public.promise_participants pp
    where pp.promise_id = promise_submissions.promise_id
    and pp.user_id = auth.uid()
  )
);

-- Ensure Promise Participants are visible
alter table public.promise_participants enable row level security;

create policy "Users can view participants of their promises"
on public.promise_participants for select
using (
    exists (
        select 1 from public.promises p
        where p.id = promise_participants.promise_id
        and (p.created_by = auth.uid() or exists (
            select 1 from public.promise_participants pp2 
            where pp2.promise_id = p.id and pp2.user_id = auth.uid()
        ))
    )
);
