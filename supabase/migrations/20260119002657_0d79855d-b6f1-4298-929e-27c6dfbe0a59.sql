-- Create patient_precautions table
CREATE TABLE public.patient_precautions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  precaution_type TEXT NOT NULL,
  risk_level TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_patient_precautions_patient ON public.patient_precautions(patient_id);

-- Enable RLS
ALTER TABLE public.patient_precautions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Approved users can view precautions"
  ON public.patient_precautions FOR SELECT
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can insert precautions"
  ON public.patient_precautions FOR INSERT
  WITH CHECK (is_approved(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Approved users can update precautions"
  ON public.patient_precautions FOR UPDATE
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can delete precautions"
  ON public.patient_precautions FOR DELETE
  USING (is_approved(auth.uid()));