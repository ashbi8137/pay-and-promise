-- Enable RLS for daily_checkins
alter table public.daily_checkins enable row level security;

-- Policy to view OWN checkins (and potentially peers if needed for progress bars, but mainly own for this issue)
-- For now, let's allow viewing checkins for promises you are part of (Collaborative view)
create policy "checkins_visibility"
on public.daily_checkins for select
using (
    exists (
        select 1 from public.promise_participants pp
        where pp.promise_id = daily_checkins.promise_id
        and pp.user_id = auth.uid()
    )
);

-- Allow inserting own checkins
create policy "insert_own_checkins"
on public.daily_checkins for insert
with check (user_id = auth.uid());
