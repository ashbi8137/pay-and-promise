-- =====================================================
-- 47_add_ended_at_column.sql
-- Add missing ended_at column to promises table
-- =====================================================

ALTER TABLE public.promises ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone;
