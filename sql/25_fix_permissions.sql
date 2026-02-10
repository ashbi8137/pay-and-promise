-- FIX FOR "NO PROMISE FOUND" ERROR
-- The current RLS policy prevents users from seeing a promise until they have ALREADY joined it.
-- This creates a deadlock where new users cannot query the promise by invite code to join it.

-- 1. Drop the restrictive policy
DROP POLICY IF EXISTS "Enable select for participants" ON public.promises;
DROP POLICY IF EXISTS "Enable select for users based on created_by" ON public.promises;

-- 2. Enable Read Access for all authenticated users
-- This allows anyone to query a promise if they have the ID or Invite Code.
CREATE POLICY "Enable read for authenticated users" ON public.promises
    FOR SELECT
    TO authenticated
    USING (true);

-- Run this script in your Supabase SQL Editor to fix the issue.
