-- Atualizar política SELECT da tabela beds para exigir autenticação explícita
DROP POLICY IF EXISTS "Approved users can view beds in assigned units" ON public.beds;

CREATE POLICY "Approved users can view beds in assigned units" 
ON public.beds 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND is_approved(auth.uid()) 
  AND has_unit_access(auth.uid(), unit_id)
);