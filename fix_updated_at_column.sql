-- Add updated_at column to enrollments table if it doesn't exist
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add updated_at column to tute_enrollments table if it doesn't exist
ALTER TABLE public.tute_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add updated_at column to instructor_payments table if it doesn't exist
ALTER TABLE public.instructor_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tute_enrollments_updated_at BEFORE UPDATE ON public.tute_enrollments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_instructor_payments_updated_at BEFORE UPDATE ON public.instructor_payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
