-- Create prophylaxis table
CREATE TABLE public.prophylaxis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prophylaxis_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prophylaxis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Approved users can view prophylaxis"
  ON public.prophylaxis FOR SELECT
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can manage prophylaxis"
  ON public.prophylaxis FOR ALL
  USING (is_approved(auth.uid()));

-- Add diet_type column to patients table
ALTER TABLE public.patients 
ADD COLUMN diet_type TEXT DEFAULT NULL;