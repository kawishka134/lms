-- Fix RLS error for re-submitting payments after rejection or for updating existing enrollments
-- Error: "new row violates row-level security policy (USING expression) for table enrollments"

-- 1. Fix standard Enrollments
DROP POLICY IF EXISTS "Students can update their own enrollments" ON public.enrollments;
CREATE POLICY "Students can update their own enrollments" 
ON public.enrollments 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- 2. Fix Tute Enrollments 
DROP POLICY IF EXISTS "Students can update their own tute enrollments" ON public.tute_enrollments;
CREATE POLICY "Students can update their own tute enrollments" 
ON public.tute_enrollments 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- 3. Ensure SELECT is also open for students to see their own status
DROP POLICY IF EXISTS "Students can select their own enrollments" ON public.enrollments;
CREATE POLICY "Students can select their own enrollments" 
ON public.enrollments 
FOR SELECT 
TO authenticated 
USING (auth.uid() = student_id);

-- 4. Ensure INSERT is also open if it wasn't already
DROP POLICY IF EXISTS "Students can insert their own enrollments" ON public.enrollments;
CREATE POLICY "Students can insert their own enrollments" 
ON public.enrollments 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = student_id);
