-- Função para registrar desfecho de paciente, bypassando RLS
CREATE OR REPLACE FUNCTION public.discharge_patient(
  _patient_id uuid,
  _outcome patient_outcome,
  _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bed_id uuid;
  _bed_unit_id uuid;
BEGIN
  -- Verificar se o usuário está aprovado
  IF NOT is_approved(_user_id) THEN
    RAISE EXCEPTION 'User not approved';
  END IF;
  
  -- Obter dados do paciente e leito
  SELECT p.bed_id, b.unit_id 
  INTO _bed_id, _bed_unit_id
  FROM patients p
  LEFT JOIN beds b ON b.id = p.bed_id
  WHERE p.id = _patient_id AND p.is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found or not active';
  END IF;
  
  -- Verificar se usuário tem acesso (privilegiado OU sessão ativa na unidade)
  IF NOT (
    has_privileged_role(_user_id) OR 
    (_bed_unit_id IS NOT NULL AND has_active_session_in_unit(_user_id, _bed_unit_id))
  ) THEN
    RAISE EXCEPTION 'User does not have access to this patient';
  END IF;
  
  -- Atualizar paciente
  UPDATE patients
  SET 
    outcome = _outcome,
    outcome_date = NOW(),
    is_active = false,
    bed_id = NULL
  WHERE id = _patient_id;
  
  -- Liberar leito
  IF _bed_id IS NOT NULL THEN
    UPDATE beds
    SET is_occupied = false
    WHERE id = _bed_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION public.discharge_patient(uuid, patient_outcome, uuid) TO authenticated;