-- Add allergies column to patients table
ALTER TABLE public.patients 
ADD COLUMN allergies text DEFAULT NULL;