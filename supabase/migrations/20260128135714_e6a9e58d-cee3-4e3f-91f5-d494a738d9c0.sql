-- Add denial_reason and updated_by columns to patient_regulation
ALTER TABLE patient_regulation 
ADD COLUMN IF NOT EXISTS denial_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Drop existing update policy
DROP POLICY IF EXISTS "Approved users can update regulation" ON patient_regulation;

-- NIR and admins can update regulation status and justification
CREATE POLICY "NIR and admins can update regulation status"
  ON patient_regulation FOR UPDATE
  USING (
    is_approved(auth.uid()) AND 
    (has_role(auth.uid(), 'nir') OR has_role(auth.uid(), 'admin'))
  );

-- Care team can only deactivate regulations (soft delete)
CREATE POLICY "Care team can deactivate regulations"
  ON patient_regulation FOR UPDATE
  USING (
    is_approved(auth.uid()) AND 
    NOT has_role(auth.uid(), 'nir')
  )
  WITH CHECK (
    is_active = false
  );