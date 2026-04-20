-- Fix instructor_payments RLS for anon inserts
DROP POLICY IF EXISTS "Allow authenticated to insert instructor payments" ON instructor_payments;
CREATE POLICY "Allow anon to insert instructor payments" 
ON instructor_payments FOR INSERT TO public WITH CHECK (true);

-- Ensure instructor_slips bucket allows anon uploads just in case
INSERT INTO storage.buckets (id, name, public) VALUES ('instructor_slips', 'instructor_slips', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Allow public uploads to instructor_slips" ON storage.objects;
CREATE POLICY "Allow public uploads to instructor_slips" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'instructor_slips');

-- Create promo_videos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('promo_videos', 'promo_videos', true, 20971520) -- 20MB limit (allows up to 15MB safely)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for promo_videos
CREATE POLICY "Allow public read promo_videos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'promo_videos');
CREATE POLICY "Allow auth upload promo_videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'promo_videos');
CREATE POLICY "Allow auth update promo_videos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'promo_videos');
CREATE POLICY "Allow auth delete promo_videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'promo_videos');
