
-- Add instructor_id to tutes table to link them to specific instructors
ALTER TABLE public.tutes ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL;

-- Update existing tutes to link them to an instructor if a matching course exists
-- This is a best-effort migration
UPDATE public.tutes t
SET instructor_id = (
    SELECT instructor_id 
    FROM public.courses c 
    WHERE c.subject = t.subject 
      AND (c.year = t.grade OR c.year = REPLACE(t.grade, 'Grade ', ''))
      AND c.batch = t.batch
    LIMIT 1
)
WHERE instructor_id IS NULL;
