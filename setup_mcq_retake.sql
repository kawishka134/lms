-- Table for Retake Requests
CREATE TABLE IF NOT EXISTS mcq_retake_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES mcq_exams(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, exam_id)
);

-- Policy to allow students to insert their own requests
ALTER TABLE mcq_retake_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can create retake requests" 
ON mcq_retake_requests FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own retake requests" 
ON mcq_retake_requests FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Admins can view and update all retake requests" 
ON mcq_retake_requests FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'instructor')));
