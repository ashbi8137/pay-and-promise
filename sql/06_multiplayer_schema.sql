-- 1. Add invite_code to promises
ALTER TABLE public.promises ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- 2. Create promise_participants table
CREATE TABLE IF NOT EXISTS public.promise_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    promise_id uuid REFERENCES public.promises(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    joined_at timestamp with time zone DEFAULT now(),
    UNIQUE(promise_id, user_id)
);

ALTER TABLE public.promise_participants ENABLE ROW LEVEL SECURITY;

-- Allow users to join (insert themselves)
CREATE POLICY "Enable insert for users" ON public.promise_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view check-ins/participants for promises they are part of
CREATE POLICY "Enable read for participants" ON public.promise_participants
    FOR SELECT USING (
        -- Can read if I am the user row
        auth.uid() = user_id
        OR
        -- OR if I am a participant in the associated promise (commented out for simplicity in MVP/recursion risk, simpler: allow public read or just own)
        -- For MVP: Allow authenticated users to read participants (simpler for Leaderboard)
        auth.role() = 'authenticated'
    );


-- 3. Create Ledger table (Survivor Logic)
CREATE TABLE IF NOT EXISTS public.ledger (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    promise_id uuid REFERENCES public.promises(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    amount numeric NOT NULL,
    type text NOT NULL CHECK (type IN ('penalty', 'winnings')), 
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for own ledger" ON public.ledger
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for ledger" ON public.ledger
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 4. UPDATE Promises Policy to allow Participants to view, not just Creators
-- Drop old simple policy if it exists (or just add new one)
-- Assuming "Enable select for users based on created_by" exists.
-- New Policy:
CREATE POLICY "Enable select for participants" ON public.promises
    FOR SELECT USING (
        auth.uid() = created_by 
        OR 
        EXISTS (
            SELECT 1 FROM public.promise_participants 
            WHERE promise_id = id AND user_id = auth.uid()
        )
    );
