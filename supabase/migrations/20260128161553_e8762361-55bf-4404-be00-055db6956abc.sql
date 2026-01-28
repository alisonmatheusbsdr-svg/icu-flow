-- Drop a politica restritiva atual para care team
DROP POLICY IF EXISTS "Care team can deactivate regulations" ON patient_regulation;

-- Criar politica para permitir equipe assistencial desativar regulacoes
CREATE POLICY "Care team can deactivate regulations"
ON patient_regulation
FOR UPDATE
TO authenticated
USING (
  is_approved(auth.uid()) AND 
  NOT has_role(auth.uid(), 'nir'::app_role)
)
WITH CHECK (is_active = false);

-- Criar nova politica para permitir equipe assistencial sinalizar acoes
CREATE POLICY "Care team can signal clinical actions"
ON patient_regulation
FOR UPDATE
TO authenticated
USING (
  is_approved(auth.uid()) AND 
  NOT has_role(auth.uid(), 'nir'::app_role) AND
  status = 'aguardando_transferencia'
)
WITH CHECK (
  -- Permite atualizar campos de sinalizacao, mas nao o status principal
  status = 'aguardando_transferencia'
);