-- Add weight column to patients table
ALTER TABLE public.patients ADD COLUMN weight NUMERIC NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.patients.weight IS 'Patient weight in kg';