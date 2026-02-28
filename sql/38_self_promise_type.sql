-- Add promise_type column to promises table for Self Promise feature
-- Values: 'self' or 'group' (default: 'group' for backward compatibility)

ALTER TABLE public.promises 
ADD COLUMN IF NOT EXISTS promise_type TEXT DEFAULT 'group' 
CHECK (promise_type IN ('self', 'group'));

-- Backfill: All existing promises are group promises
UPDATE public.promises SET promise_type = 'group' WHERE promise_type IS NULL;
