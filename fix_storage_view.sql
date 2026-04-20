
-- Storage Monitor එක සඳහා View එකක් නිර්මාණය කිරීම
-- (RPC එකට වඩා මේ ක්‍රමය ස්ථිරවම වැඩ කරයි)

DROP VIEW IF EXISTS public.storage_usage_view;
CREATE VIEW public.storage_usage_view AS
SELECT 
    o.bucket_id,
    COALESCE(SUM(CASE WHEN (o.metadata->>'size') IS NOT NULL THEN (o.metadata->>'size')::bigint ELSE 0 END), 0) as total_size,
    COUNT(*)::bigint as file_count
FROM storage.objects o
GROUP BY o.bucket_id;

-- ඕනෑම කෙනෙකුට (Admin) මේක කියවීමට අවසර ලබාදීම
GRANT SELECT ON public.storage_usage_view TO authenticated;
GRANT SELECT ON public.storage_usage_view TO anon;
GRANT SELECT ON public.storage_usage_view TO service_role;
