
-- Instructor payments වලත් රිසිට්පත් මකන්න පුළුවන් වෙන්න column එක එකතු කිරීම
ALTER TABLE public.instructor_payments 
ADD COLUMN IF NOT EXISTS slip_purged_at TIMESTAMPTZ;
