-- ==========================================
-- ENABLE REALTIME FOR ALL TABLES
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create the publication if not exists (usually exists by default)
-- CREATE PUBLICATION supabase_realtime; -- Only run if publication doesnt exist

-- 2. Add all relevant tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE free_classes;
ALTER PUBLICATION supabase_realtime ADD TABLE recordings;
ALTER PUBLICATION supabase_realtime ADD TABLE recording_access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE tute_enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE instructor_payments;

-- If you get an error that table already exists in publication, you can ignore it or use:
-- ALTER PUBLICATION supabase_realtime DROP TABLE ...;
-- followed by ADD TABLE.
