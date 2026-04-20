-- 1. Update the sync function to also handle email changes
CREATE OR REPLACE FUNCTION public.sync_instructor_password()
RETURNS TRIGGER AS $$
DECLARE
    auth_user_id uuid;
BEGIN
    -- Run if password changed OR email changed
    IF NEW.raw_password IS NOT NULL AND (
        TG_OP = 'INSERT' OR 
        NEW.raw_password IS DISTINCT FROM OLD.raw_password OR
        NEW.email IS DISTINCT FROM OLD.email
    ) THEN
        
        -- First, check if a user already exists with the OLD email (if this is an update)
        IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
            SELECT id INTO auth_user_id FROM auth.users WHERE email = OLD.email;
            
            IF auth_user_id IS NOT NULL THEN
                -- Update the existing user's email and password
                UPDATE auth.users
                SET 
                    email = NEW.email,
                    encrypted_password = crypt(NEW.raw_password, gen_salt('bf')),
                    email_confirmed_at = COALESCE(email_confirmed_at, now()),
                    updated_at = now()
                WHERE id = auth_user_id;
                
                RETURN NEW;
            END IF;
        END IF;

        -- If no OLD user found or it's an INSERT, look for NEW email
        SELECT id INTO auth_user_id FROM auth.users WHERE email = NEW.email;

        IF auth_user_id IS NOT NULL THEN
            -- Update existing user found with NEW email
            UPDATE auth.users
            SET 
                encrypted_password = crypt(NEW.raw_password, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, now()),
                updated_at = now()
            WHERE id = auth_user_id;
        ELSE
            -- Create brand new user
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
                recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
                created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', NEW.email, crypt(NEW.raw_password, gen_salt('bf')), now(),
                null, null, '{"provider":"email","providers":["email"]}', '{}',
                now(), now(), '', '', '', ''
            );
        END IF;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Manually trigger a sync for all instructors to fix the current issue
DO $$
DECLARE
    inst_record RECORD;
    auth_user_id uuid;
BEGIN
    FOR inst_record IN SELECT email, raw_password FROM public.instructors WHERE raw_password IS NOT NULL LOOP
        -- Look for any user with this email
        SELECT id INTO auth_user_id FROM auth.users WHERE email = inst_record.email;

        IF auth_user_id IS NOT NULL THEN
            UPDATE auth.users
            SET 
                encrypted_password = crypt(inst_record.raw_password, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, now()),
                updated_at = now()
            WHERE id = auth_user_id;
        ELSE
            -- Try to find if there's someone with NO matching email (maybe they changed it in instructors but not here)
            -- This is hard to automate safely, so we just insert a new one if not found.
            INSERT INTO auth.users (
                instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
                recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
                created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000', uuid_generate_v4(), 'authenticated', 'authenticated', inst_record.email, crypt(inst_record.raw_password, gen_salt('bf')), now(),
                null, null, '{"provider":"email","providers":["email"]}', '{}',
                now(), now(), '', '', '', ''
            );
        END IF;
    END LOOP;
END;
$$;
