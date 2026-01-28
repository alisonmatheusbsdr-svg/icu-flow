-- Fix: Require explicit authentication for patients table access
-- Drop existing SELECT and UPDATE policies and recreate with explicit auth check

DROP POLICY IF EXISTS "Approved users can view patients in assigned units" ON public.patients;
DROP POLICY IF EXISTS "Approved users can update patients in assigned units" ON public.patients;
DROP POLICY IF EXISTS "Approved users can insert patients" ON public.patients;

-- Recreate with explicit authentication requirement
CREATE POLICY "Approved users can view patients in assigned units" 
ON public.patients 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND public.is_approved(auth.uid()) 
  AND (
    (bed_id IS NULL) 
    OR (EXISTS (
      SELECT 1 FROM beds b 
      WHERE b.id = patients.bed_id 
      AND public.has_unit_access(auth.uid(), b.unit_id)
    ))
  )
);

CREATE POLICY "Approved users can update patients in assigned units" 
ON public.patients 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND public.is_approved(auth.uid()) 
  AND (
    (bed_id IS NULL) 
    OR (EXISTS (
      SELECT 1 FROM beds b 
      WHERE b.id = patients.bed_id 
      AND public.has_unit_access(auth.uid(), b.unit_id)
    ))
  )
);

CREATE POLICY "Approved users can insert patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND public.is_approved(auth.uid()));