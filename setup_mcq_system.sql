-- ==========================================
-- MCQ EXAM SYSTEM TABLES
-- ==========================================

-- 1. Table for MCQ Exam Metadata
CREATE TABLE IF NOT EXISTS mcq_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    pdf_url TEXT NOT NULL,
    time_limit_minutes INTEGER DEFAULT 60,
    num_questions INTEGER NOT NULL DEFAULT 40,
    options_per_question INTEGER NOT NULL DEFAULT 5, -- 4 or 5 options
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table for Correct Answers (The Answer Key)
CREATE TABLE IF NOT EXISTS mcq_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES mcq_exams(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    correct_option INTEGER NOT NULL, -- 1, 2, 3, 4, or 5
    unique(exam_id, question_number)
);

-- 3. Table for Student Attempts & Scores
CREATE TABLE IF NOT EXISTS mcq_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES mcq_exams(id) ON DELETE CASCADE,
    student_answers JSONB NOT NULL, -- e.g. {"1": 2, "2": 4...}
    score INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    is_submitted BOOLEAN DEFAULT FALSE,
    unique(student_id, exam_id)
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mcq_exams;
ALTER PUBLICATION supabase_realtime ADD TABLE mcq_attempts;

-- RLS Policies (Basic)
ALTER TABLE mcq_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_attempts ENABLE ROW LEVEL SECURITY;

-- Everyone can view published exams if enrolled (simplified for now)
CREATE POLICY "View published exams" ON mcq_exams FOR SELECT USING (is_published = true);
CREATE POLICY "Admin full access exams" ON mcq_exams FOR ALL USING (true);
CREATE POLICY "Admin full access answers" ON mcq_answers FOR ALL USING (true);
CREATE POLICY "Student view attempts" ON mcq_attempts FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Student create attempts" ON mcq_attempts FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Student update attempts" ON mcq_attempts FOR UPDATE USING (auth.uid() = student_id);
