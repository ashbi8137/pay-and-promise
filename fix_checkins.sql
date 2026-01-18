-- FIX FOR "ALREADY MARKED TODAY" ISSUE ACROSS USERS/PROMISES
-- The current constraint `unique(promise_id, date)` allows ONLY ONE PERSON to check in for a promise per day.
-- We need to change it to `unique(promise_id, user_id, date)` so EACH USER can check in.

-- 1. Drop the incorrect constraint
ALTER TABLE public.daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_promise_id_date_key;

-- 2. Add the correct constraint
ALTER TABLE public.daily_checkins 
ADD CONSTRAINT daily_checkins_promise_user_date_key UNIQUE (promise_id, user_id, date);

-- Run this script in Supabase SQL Editor to fix the proper check-in logic.
