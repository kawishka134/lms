-- This will allow Super Admins and Admins to delete courses
CREATE POLICY "Admin full delete for courses" ON public.courses FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Additionally, ensure we don't have constraints blocking it.
-- We might need ON DELETE CASCADE for enrollments.
-- Let's check constraints if necessary, but this policy is usually the main issue.
