-- 1. Enable the crypto extension needed to securely hash passwords
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create the function that will sync passwords and auto-confirm emails
CREATE OR REPLACE FUNCTION public.sync_instructor_password()
RETURNS TRIGGER AS $$
DECLARE
    auth_user_id uuid;
BEGIN
    -- Only run if raw_password is provided and has changed/inserted
    IF NEW.raw_password IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.raw_password IS DISTINCT FROM OLD.raw_password) THEN
        
        -- Check if user already exists
        SELECT id INTO auth_user_id FROM auth.users WHERE email = NEW.email;

        IF auth_user_id IS NOT NULL THEN
            -- Update existing user
            UPDATE auth.users
            SET 
                encrypted_password = crypt(NEW.raw_password, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, now()),
                updated_at = now()
            WHERE id = auth_user_id;
        ELSE
            -- Insert missing user into auth.users directly
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

-- 3. Attach the trigger to the instructors table
DROP TRIGGER IF EXISTS trigger_sync_instructor_password ON public.instructors;

CREATE TRIGGER trigger_sync_instructor_password
AFTER INSERT OR UPDATE ON public.instructors
FOR EACH ROW
EXECUTE FUNCTION public.sync_instructor_password();


-- 4. FIX EXISTING DATA:
-- Let's manually sync all current instructors so anyone already registered can log in right now!
DO $$
DECLARE
    inst_record RECORD;
    auth_user_id uuid;
BEGIN
    FOR inst_record IN SELECT email, raw_password FROM public.instructors WHERE raw_password IS NOT NULL LOOP
        SELECT id INTO auth_user_id FROM auth.users WHERE email = inst_record.email;

        IF auth_user_id IS NOT NULL THEN
            UPDATE auth.users
            SET 
                encrypted_password = crypt(inst_record.raw_password, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, now()),
                updated_at = now()
            WHERE id = auth_user_id;
        ELSE
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
