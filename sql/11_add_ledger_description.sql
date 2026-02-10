-- Add description column to ledger for context
ALTER TABLE public.ledger ADD COLUMN IF NOT EXISTS description text;

-- Run this to update the schema.
