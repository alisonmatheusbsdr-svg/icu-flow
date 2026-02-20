
-- Create fluid_balance table for 12h shift hydric balance
CREATE TABLE public.fluid_balance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  shift_start timestamptz NOT NULL,
  intake_ml integer NOT NULL DEFAULT 0,
  output_ml integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fluid_balance_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT fluid_balance_intake_non_negative CHECK (intake_ml >= 0),
  CONSTRAINT fluid_balance_output_non_negative CHECK (output_ml >= 0)
);

-- Enable RLS
ALTER TABLE public.fluid_balance ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Approved users can view fluid_balance"
  ON public.fluid_balance
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()));

CREATE POLICY "Approved users can insert fluid_balance"
  ON public.fluid_balance
  FOR INSERT
  WITH CHECK (is_approved(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Approved users can update fluid_balance"
  ON public.fluid_balance
  FOR UPDATE
  USING (is_approved(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_fluid_balance_updated_at
  BEFORE UPDATE ON public.fluid_balance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup by patient + shift
CREATE INDEX idx_fluid_balance_patient_shift ON public.fluid_balance (patient_id, shift_start DESC);
