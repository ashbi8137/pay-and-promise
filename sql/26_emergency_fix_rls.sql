-- 1. DROP Existing/Bad Policies to clear conflicts
drop policy if exists "Users can view participants of their promises" on public.promise_participants;
drop policy if exists "Users can view their own promises" on public.promises;
drop policy if exists "Users can insert their own promises" on public.promises;
drop policy if exists "Users can view their own ledger history" on public.ledger;

-- 2. FIX Promise Participants (Simple: You can see your own rows)
-- This fixes the "Blank Journey" screen because step 1 checks your own rows.
alter table public.promise_participants enable row level security;

create policy "view_own_participation"
on public.promise_participants for select
using (user_id = auth.uid());

create policy "insert_own_participation"
on public.promise_participants for insert
with check (user_id = auth.uid());

-- 3. FIX Promises (You see what you Created OR Joined)
alter table public.promises enable row level security;

create policy "view_promises_involved"
on public.promises for select
using (
    created_by = auth.uid() OR 
    id in (select promise_id from public.promise_participants where user_id = auth.uid())
);

create policy "insert_promises"
on public.promises for insert
with check (created_by = auth.uid());

-- 4. FIX Ledger (You see your own money)
alter table public.ledger enable row level security;

create policy "view_own_ledger"
on public.ledger for select
using (user_id = auth.uid());

-- 5. FIX Submissions (You see submissions for your promises)
alter table public.promise_submissions enable row level security;

drop policy if exists "Users can view submissions for their promises" on public.promise_submissions;

create policy "view_submissions_involved"
on public.promise_submissions for select
using (
    exists (select 1 from public.promise_participants where promise_id = promise_submissions.promise_id and user_id = auth.uid())
);
