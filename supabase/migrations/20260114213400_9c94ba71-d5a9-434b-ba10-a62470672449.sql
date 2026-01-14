-- Create patient_tasks table for pending tasks
CREATE TABLE public.patient_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approved users
CREATE POLICY "Approved users can view tasks"
  ON public.patient_tasks FOR SELECT
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can insert tasks"
  ON public.patient_tasks FOR INSERT
  WITH CHECK (public.is_approved(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Approved users can update tasks"
  ON public.patient_tasks FOR UPDATE
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can delete tasks"
  ON public.patient_tasks FOR DELETE
  USING (public.is_approved(auth.uid()));