
-- RUN THIS IN SUPABASE SQL EDITOR
-- Add separate columns to tutes table for better organization and student matching

ALTER TABLE public.tutes ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE public.tutes ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.tutes ADD COLUMN IF NOT EXISTS batch TEXT;
