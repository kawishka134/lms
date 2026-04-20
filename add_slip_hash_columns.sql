-- Add slip_hash column to enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS slip_hash TEXT;

-- Add slip_hash column to tute_enrollments
ALTER TABLE public.tute_enrollments ADD COLUMN IF NOT EXISTS slip_hash TEXT;

-- Add slip_hash column to instructor_payments
ALTER TABLE public.instructor_payments ADD COLUMN IF NOT EXISTS slip_hash TEXT;

-- Optional: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_slip_hash ON public.enrollments(slip_hash);
CREATE INDEX IF NOT EXISTS idx_tute_enrollments_slip_hash ON public.tute_enrollments(slip_hash);
CREATE INDEX IF NOT EXISTS idx_instructor_payments_slip_hash ON public.instructor_payments(slip_hash);
