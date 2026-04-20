-- Fix RLS for MCQ Attempts to allow admins/instructors to view results
DROP POLICY IF EXISTS "Admins can view all attempts" ON mcq_attempts;

CREATE POLICY "Admins can view all attempts" ON mcq_attempts 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'super_admin' OR role = 'instructor')
    )
);

-- Ensure authenticated users have general access (RLS will still filter)
GRANT SELECT ON TABLE mcq_attempts TO authenticated;
