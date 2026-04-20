-- ==========================================
-- ADD INSTRUCTOR_ID TO MISSING TABLES
-- ==========================================

-- 1. Add instructor_id to live_sessions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_sessions' AND column_name='instructor_id') THEN
        ALTER TABLE live_sessions ADD COLUMN instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add instructor_id to free_classes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='free_classes' AND column_name='instructor_id') THEN
        ALTER TABLE free_classes ADD COLUMN instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add instructor_id to schedules
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='instructor_id') THEN
        ALTER TABLE schedules ADD COLUMN instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL;
    END IF;
END $$;
