-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Approved users can view tasks" ON public.patient_tasks;

-- Create new SELECT policy with explicit authentication check
CREATE POLICY "Approved users can view tasks"
ON public.patient_tasks
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_approved(auth.uid()));