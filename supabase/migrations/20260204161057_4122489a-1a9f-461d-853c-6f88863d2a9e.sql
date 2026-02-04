-- Create a helper function to check if user has an active session in a unit
CREATE OR REPLACE FUNCTION public.has_active_session_in_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.active_sessions
    WHERE user_id = _user_id
      AND unit_id = _unit_id
      AND last_activity > (NOW() - INTERVAL '30 minutes')
  )
$$;

-- Create a helper function to check if user has a privileged role (can view across units)
CREATE OR REPLACE FUNCTION public.has_privileged_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'coordenador', 'diarista', 'nir')
  )
$$;

-- Update SELECT policy to require active session OR privileged role
DROP POLICY IF EXISTS "Approved users can view patients in assigned units" ON public.patients;

CREATE POLICY "Approved users can view patients in assigned units"
ON public.patients FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND 
  is_approved(auth.uid()) AND 
  (
    -- Patients without beds (e.g., being admitted) require privileged role
    (bed_id IS NULL AND has_privileged_role(auth.uid())) OR 
    -- For patients in beds, check unit access AND (active session OR privileged role)
    (bed_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM beds b
      WHERE b.id = patients.bed_id 
      AND has_unit_access(auth.uid(), b.unit_id)
      AND (
        has_active_session_in_unit(auth.uid(), b.unit_id) OR
        has_privileged_role(auth.uid())
      )
    ))
  )
);

-- Update UPDATE policy to require active session OR privileged role
DROP POLICY IF EXISTS "Approved users can update patients in assigned units" ON public.patients;

CREATE POLICY "Approved users can update patients in assigned units"
ON public.patients FOR UPDATE
USING (
  (auth.uid() IS NOT NULL) AND 
  is_approved(auth.uid()) AND 
  (
    -- Patients without beds require privileged role to update
    (bed_id IS NULL AND has_privileged_role(auth.uid())) OR 
    -- For patients in beds, check unit access AND (active session OR privileged role)
    (bed_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM beds b
      WHERE b.id = patients.bed_id 
      AND has_unit_access(auth.uid(), b.unit_id)
      AND (
        has_active_session_in_unit(auth.uid(), b.unit_id) OR
        has_privileged_role(auth.uid())
      )
    ))
  )
);

-- Update INSERT policy to require active session OR privileged role
DROP POLICY IF EXISTS "Approved users can insert patients" ON public.patients;

CREATE POLICY "Approved users can insert patients"
ON public.patients FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  is_approved(auth.uid()) AND
  (
    -- Inserting without bed requires privileged role
    (bed_id IS NULL AND has_privileged_role(auth.uid())) OR
    -- Inserting with bed requires active session in that unit OR privileged role
    (bed_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM beds b
      WHERE b.id = bed_id 
      AND has_unit_access(auth.uid(), b.unit_id)
      AND (
        has_active_session_in_unit(auth.uid(), b.unit_id) OR
        has_privileged_role(auth.uid())
      )
    ))
  )
);