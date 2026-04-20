-- Run this query in your Supabase SQL Editor
-- This adds the 'last_read_notices_time' column across devices tracking 

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_read_notices_time BIGINT DEFAULT 0;
