-- Recria política de UPDATE com WITH CHECK separado para permitir desfecho por plantonista
DROP POLICY IF EXISTS "Approved users can update patients in assigned units" 
ON public.patients;

CREATE POLICY "Approved users can update patients in assigned units"
ON public.patients FOR UPDATE
USING (
  -- Verifica acesso à linha ORIGINAL
  (auth.uid() IS NOT NULL) AND 
  is_approved(auth.uid()) AND 
  (
    (bed_id IS NULL AND has_privileged_role(auth.uid())) OR 
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
)
WITH CHECK (
  -- Verifica se o resultado é permitido
  (auth.uid() IS NOT NULL) AND 
  is_approved(auth.uid()) AND 
  (
    -- Privileged roles podem fazer qualquer alteração
    has_privileged_role(auth.uid()) OR
    
    -- Plantonistas podem:
    (
      -- Liberar leito (desfecho) - bed_id vai para NULL
      (bed_id IS NULL) OR
      
      -- Manter no mesmo leito ou mover dentro da mesma unidade com sessão ativa
      (bed_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM beds b
        WHERE b.id = bed_id 
        AND has_unit_access(auth.uid(), b.unit_id)
        AND has_active_session_in_unit(auth.uid(), b.unit_id)
      ))
    )
  )
);