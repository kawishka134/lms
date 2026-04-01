-- Add is_blocked status to profiles and instructors
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.instructors ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Ensure delete_user_by_admin exists and is secure (re-deploying just in case)
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Target ID cannot be null';
  END IF;

  -- Delete from auth.users (if it exists)
  -- This will automatically cascade to profiles if FKEY is set to CASCADE
  DELETE FROM auth.users WHERE id = target_id;
  
  -- Explicitly delete from profiles just in case no cascade
  DELETE FROM public.profiles WHERE id = target_id;
  
  -- Delete from instructors if applicable
  DELETE FROM public.instructors WHERE id::UUID = target_id;
END;
$$;
