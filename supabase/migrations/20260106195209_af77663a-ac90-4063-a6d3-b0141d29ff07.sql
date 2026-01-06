-- Create venous_access table
CREATE TABLE public.venous_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
  insertion_site TEXT NOT NULL,
  lumen_count TEXT NOT NULL,
  insertion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE venous_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Approved users can view venous_access"
  ON venous_access FOR SELECT
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can manage venous_access"
  ON venous_access FOR ALL
  USING (is_approved(auth.uid()));