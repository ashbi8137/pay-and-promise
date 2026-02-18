-- =====================================================
-- 30_pp_profiles.sql
-- Add Promise Point (PP) fields to profiles table
-- =====================================================

-- 1. Add PP columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS promise_points integer NOT NULL DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifetime_points integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS integrity_score numeric NOT NULL DEFAULT 100.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_promises_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_promises_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leaderboard_eligible boolean NOT NULL DEFAULT false;

-- 2. Update handle_new_user() trigger to grant 100 PP on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, promise_points, lifetime_points, level)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    100,  -- Starting PP
    0,
    1     -- Starting level
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert signup bonus ledger entry (table created in 32_pp_ledger.sql)
  -- This will be handled after the ledger table exists
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Allow users to read other profiles for leaderboard
DROP POLICY IF EXISTS "Users can read all profiles for leaderboard" ON public.profiles;
CREATE POLICY "Users can read all profiles for leaderboard"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Allow upsert for own profile
DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;
CREATE POLICY "Users can upsert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
