-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create new SELECT policy with explicit authentication check
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());