-- Create a secure function to permanently delete a user from auth.users
-- This requires SECURITY DEFINER so it runs with elevated database privileges
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Target ID cannot be null';
  END IF;

  -- Delete from built-in auth.users table
  -- This will automatically wipe out their login ability and cascade to profiles
  DELETE FROM auth.users WHERE id = target_id;
END;
$$;
