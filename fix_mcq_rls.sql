-- Improved RLS for MCQ Retake Requests
-- Drop old ones first to be clean
DROP POLICY IF EXISTS "Students can create retake requests" ON mcq_retake_requests;
DROP POLICY IF EXISTS "Students can view their own retake requests" ON mcq_retake_requests;
DROP POLICY IF EXISTS "Admins can view and update all retake requests" ON mcq_retake_requests;

-- Standard policies
CREATE POLICY "Allow student insert" ON mcq_retake_requests FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Allow student select" ON mcq_retake_requests FOR SELECT USING (auth.uid() = student_id);
-- Simpler Admin policy (If user has any admin-like role in profiles)
CREATE POLICY "Allow admin all" ON mcq_retake_requests FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'super_admin' OR role = 'instructor')
    )
);

-- Ensure public access to necessary columns if needed, but RLS should handle it.
GRANT ALL ON TABLE mcq_retake_requests TO authenticated;
GRANT ALL ON TABLE mcq_retake_requests TO service_role;
