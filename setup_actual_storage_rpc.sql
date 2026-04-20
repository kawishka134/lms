
-- Storage monitor RPC එක වඩාත් ශක්තිමත් කිරීම
CREATE OR REPLACE FUNCTION get_actual_storage_usage()
RETURNS TABLE (bucket_id text, total_size bigint, file_count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.bucket_id,
        COALESCE(SUM(CASE WHEN (o.metadata->>'size') IS NOT NULL THEN (o.metadata->>'size')::bigint ELSE 0 END), 0) as total_size,
        COUNT(*)::bigint as file_count
    FROM storage.objects o
    GROUP BY o.bucket_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_actual_storage_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_actual_storage_usage() TO anon;
GRANT EXECUTE ON FUNCTION public.get_actual_storage_usage() TO service_role;
