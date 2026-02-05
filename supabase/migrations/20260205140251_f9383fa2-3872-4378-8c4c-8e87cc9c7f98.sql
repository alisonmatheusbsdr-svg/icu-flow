-- Função de debug temporária para validar WITH CHECK
CREATE OR REPLACE FUNCTION public.debug_patient_update_check(
  _user_id uuid,
  _new_bed_id uuid
)
RETURNS TABLE(
  auth_uid_not_null boolean,
  is_user_approved boolean,
  is_user_privileged boolean,
  bed_is_null boolean,
  full_check_result boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (_user_id IS NOT NULL) as auth_uid_not_null,
    is_approved(_user_id) as is_user_approved,
    has_privileged_role(_user_id) as is_user_privileged,
    (_new_bed_id IS NULL) as bed_is_null,
    (
      (_user_id IS NOT NULL) AND 
      is_approved(_user_id) AND 
      (
        has_privileged_role(_user_id) OR 
        (_new_bed_id IS NULL) OR 
        (_new_bed_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM beds b
          WHERE b.id = _new_bed_id 
          AND has_unit_access(_user_id, b.unit_id)
          AND has_active_session_in_unit(_user_id, b.unit_id)
        ))
      )
    ) as full_check_result
$$;