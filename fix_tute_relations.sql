
-- Tute enrollments වල student details පෙන්නන්න බැරි ප්‍රශ්නය විසඳීම (Fix Relationship)

-- 1. දැනට තියෙන Foreign Key එක අයින් කරනවා
ALTER TABLE public.tute_enrollments DROP CONSTRAINT IF EXISTS tute_enrollments_student_id_fkey;

-- 2. අලුතින් Foreign Key එක public.profiles table එකට සම්බන්ධ කරනවා
-- මේකෙන් පස්සේ තමයි tute requests වල ශිෂ්‍යයාගේ නම පේන්න ගන්නේ.
ALTER TABLE public.tute_enrollments 
ADD CONSTRAINT tute_enrollments_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Tute එකට අදාළ instructor_id එක අනිවාර්යයෙන්ම තිබිය යුතු නිසා (Join Error මකා දැමීමට)
-- tutes table එකේ instructor_id එක නැති tutes වලට default අගයක් හෝ current instructor id එක දාගන්න.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutes' AND column_name='instructor_id') THEN
        -- මේ column එක තියෙනවා නම් විතරක් කරන්න
    ELSE
        ALTER TABLE public.tutes ADD COLUMN instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL;
    END IF;
END $$;
