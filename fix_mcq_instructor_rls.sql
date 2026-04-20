-- Fix RLS for MCQ System to allow Instructors without a 'profiles' entry to see data
-- This happens because some instructors are only in the 'instructors' table

-- 1. mcq_exams
DROP POLICY IF EXISTS "Admin full access exams" ON mcq_exams;
CREATE POLICY "Admin and Instructor access exams" ON mcq_exams
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin'))
    OR EXISTS (SELECT 1 FROM instructors WHERE id = auth.uid())
);

-- 2. mcq_answers
DROP POLICY IF EXISTS "Admin full access answers" ON mcq_answers;
CREATE POLICY "Admin and Instructor access answers" ON mcq_answers
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin'))
    OR EXISTS (SELECT 1 FROM instructors WHERE id = auth.uid())
);

-- 3. mcq_attempts
DROP POLICY IF EXISTS "Admins can view all attempts" ON mcq_attempts;
CREATE POLICY "Admins and Instructors view attempts" ON mcq_attempts
FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin' OR role = 'instructor'))
    OR EXISTS (SELECT 1 FROM instructors WHERE id = auth.uid())
);

-- 4. mcq_retake_requests (Just in case)
DROP POLICY IF EXISTS "Admins manage retakes" ON mcq_retake_requests;
CREATE POLICY "Admins and Instructors manage retakes" ON mcq_retake_requests
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin' OR role = 'instructor'))
    OR EXISTS (SELECT 1 FROM instructors WHERE id = auth.uid())
);

GRANT SELECT ON mcq_attempts TO authenticated;
GRANT SELECT ON mcq_exams TO authenticated;
GRANT SELECT ON mcq_answers TO authenticated;
