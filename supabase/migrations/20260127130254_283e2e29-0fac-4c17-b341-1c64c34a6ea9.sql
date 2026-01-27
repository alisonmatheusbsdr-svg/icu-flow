-- Create table for patient regulation requests
CREATE TABLE public.patient_regulation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  support_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.patient_regulation ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Approved users can view regulation"
  ON public.patient_regulation FOR SELECT
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can insert regulation"
  ON public.patient_regulation FOR INSERT
  WITH CHECK (is_approved(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Approved users can update regulation"
  ON public.patient_regulation FOR UPDATE
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can delete regulation"
  ON public.patient_regulation FOR DELETE
  USING (is_approved(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_patient_regulation_updated_at
  BEFORE UPDATE ON public.patient_regulation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();