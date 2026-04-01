-- ============================================================
-- FIX FREE CLASSES RLS (Row Level Security) POLICIES
-- Run this in Supabase -> SQL Editor
-- ============================================================

-- Enable RLS just in case it was off
ALTER TABLE public.free_classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent duplicates
DROP POLICY IF EXISTS "Public read free_classes" ON public.free_classes;
DROP POLICY IF EXISTS "Admin insert free_classes" ON public.free_classes;
DROP POLICY IF EXISTS "Admin update free_classes" ON public.free_classes;
DROP POLICY IF EXISTS "Admin delete free_classes" ON public.free_classes;

-- 1. Public can view all free classes
CREATE POLICY "Public read free_classes" 
ON public.free_classes FOR SELECT USING (true);

-- 2. Admin can create new free classes
CREATE POLICY "Admin insert free_classes" 
ON public.free_classes FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Admin can UPDATE existing classes (THIS IS THE FIX)
CREATE POLICY "Admin update free_classes" 
ON public.free_classes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Admin can DELETE classes
CREATE POLICY "Admin delete free_classes" 
ON public.free_classes FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
