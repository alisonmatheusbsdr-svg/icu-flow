-- Fix: Patient Updates Bypass Unit Access Control
-- Drop the existing policy that doesn't verify unit access
DROP POLICY IF EXISTS "Approved users can update patients" ON public.patients;

-- Create new policy that mirrors the SELECT policy's unit access verification
CREATE POLICY "Approved users can update patients in assigned units"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      bed_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.beds b
        WHERE b.id = patients.bed_id
        AND public.has_unit_access(auth.uid(), b.unit_id)
      )
    )
  );