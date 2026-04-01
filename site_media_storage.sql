-- ============================================================
-- RADICAL COMMERCE — SITE MEDIA STORAGE SETUP
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Create the public storage bucket for site media (videos, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'site-media',
    'site-media',
    true,
    524288000,  -- 500 MB max file size
    ARRAY['video/mp4', 'video/webm', 'video/ogg', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;


-- 2. PUBLIC READ — anyone can view uploaded files
CREATE POLICY "Public read site-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-media');


-- 3. ADMIN UPLOAD — only authenticated admins can upload
CREATE POLICY "Admin insert site-media"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'site-media'
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);


-- 4. ADMIN UPDATE — admins can replace files
CREATE POLICY "Admin update site-media"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'site-media'
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);


-- 5. ADMIN DELETE — admins can delete files
CREATE POLICY "Admin delete site-media"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'site-media'
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
