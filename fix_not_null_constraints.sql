
-- slip_url column එකට null අගයන් ලබාදිය හැකි පරිදි වෙනස් කිරීම
-- (නැතිනම් පරණ රිසිට්පත් මැකීමට ඉඩ ලබා නොදේ)

-- 1. enrollments table
ALTER TABLE public.enrollments 
ALTER COLUMN slip_url DROP NOT NULL;

-- 2. tute_enrollments table
ALTER TABLE public.tute_enrollments 
ALTER COLUMN slip_url DROP NOT NULL;

-- 3. instructor_payments table
ALTER TABLE public.instructor_payments 
ALTER COLUMN slip_url DROP NOT NULL;
