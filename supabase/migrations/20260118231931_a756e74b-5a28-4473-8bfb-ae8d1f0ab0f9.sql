-- Create patient_exams table for storing important exam findings
CREATE TABLE public.patient_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('imagem', 'laboratorial')),
  exam_name TEXT NOT NULL,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_exams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Approved users can view exams"
  ON public.patient_exams FOR SELECT
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can insert exams"
  ON public.patient_exams FOR INSERT
  WITH CHECK (public.is_approved(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Approved users can update exams"
  ON public.patient_exams FOR UPDATE
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can delete exams"
  ON public.patient_exams FOR DELETE
  USING (public.is_approved(auth.uid()));