-- Add new fields to instructors
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS class_type TEXT;

-- Create instructor_payments table for commission slips
CREATE TABLE IF NOT EXISTS instructor_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
    slip_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic RLS for instructor_payments
ALTER TABLE instructor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated to read instructor payments"
ON instructor_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated to insert instructor payments"
ON instructor_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated to update instructor payments"
ON instructor_payments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated to delete instructor payments"
ON instructor_payments FOR DELETE TO authenticated USING (true);
