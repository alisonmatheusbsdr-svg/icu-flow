-- Refresh the SELECT policy to ensure explicit auth.uid() IS NOT NULL check
-- This confirms authentication is required for all patient data access

DROP POLICY IF EXISTS "Approved users can view patients in assigned units" ON public.patients;

CREATE POLICY "Approved users can view patients in assigned units"
ON public.patients FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND 
  is_approved(auth.uid()) AND 
  (
    (bed_id IS NULL) OR 
    (EXISTS (
      SELECT 1 FROM beds b
      WHERE b.id = patients.bed_id 
      AND has_unit_access(auth.uid(), b.unit_id)
    ))
  )
);