-- Add start_date column to vasoactive_drugs table
ALTER TABLE public.vasoactive_drugs ADD COLUMN start_date DATE DEFAULT CURRENT_DATE;

-- Populate existing records with date from created_at
UPDATE public.vasoactive_drugs SET start_date = created_at::date WHERE start_date IS NULL;