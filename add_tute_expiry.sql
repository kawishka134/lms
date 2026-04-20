
-- Tute enrollments වලට කාලසීමාව එකතු කිරීම (Expiry Logic)

ALTER TABLE public.tute_enrollments 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- මේ columns දැනට තියෙන approved ඒවාට දාන්න (Optional)
UPDATE public.tute_enrollments 
SET approved_at = created_at, 
    expires_at = created_at + interval '7 hours'
WHERE status = 'approved' AND approved_at IS NULL;
