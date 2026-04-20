
-- Tables වලට Admin ලට Update කරන්න අවසර දීම (RLS Policies)
-- මේවායින් cleanup එක අසාර්ථක කරන ආරක්ෂක සීමාවන් ලිහිල් වේ.

-- 1. enrollments
DROP POLICY IF EXISTS "Admins can update enrollments" ON public.enrollments;
CREATE POLICY "Admins can update enrollments" ON public.enrollments 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. tute_enrollments
DROP POLICY IF EXISTS "Admins can update tute_enrollments" ON public.tute_enrollments;
CREATE POLICY "Admins can update tute_enrollments" ON public.tute_enrollments 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. instructor_payments
DROP POLICY IF EXISTS "Admins can update instructor_payments" ON public.instructor_payments;
CREATE POLICY "Admins can update instructor_payments" ON public.instructor_payments 
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
