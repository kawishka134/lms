-- Run this in your Supabase SQL Editor to add the missing columns
-- These changes are REQUIRED for the new features to work!

-- For Student Profile Location
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS province TEXT;

-- For Free Trial & Catalog Management
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_free_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS trial_duration INTEGER;

-- For Enrollment Tracking (Important for distinction between Paid vs Trial)
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer';

