-- Add bank payment details to courses table
-- Run this in Supabase SQL Editor

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_branch TEXT DEFAULT '';

-- Add bank payment details to instructors table
ALTER TABLE instructors
  ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_no TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_branch TEXT DEFAULT '';
