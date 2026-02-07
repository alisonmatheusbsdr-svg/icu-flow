
-- 1. Coordenadores podem gerenciar roles de plantonistas e diaristas
CREATE POLICY "Coordenadores podem gerenciar roles de plantonistas e diaristas"
ON public.user_roles FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'coordenador') AND 
  role IN ('plantonista', 'diarista')
)
WITH CHECK (
  has_role(auth.uid(), 'coordenador') AND 
  role IN ('plantonista', 'diarista')
);

-- 2. Coordenadores podem gerenciar unidades
CREATE POLICY "Coordenadores podem gerenciar unidades"
ON public.user_units FOR ALL TO authenticated
USING (has_role(auth.uid(), 'coordenador'))
WITH CHECK (has_role(auth.uid(), 'coordenador'));

-- 3. Coordenadores podem ver todas as unidades (para popular checkboxes)
CREATE POLICY "Coordenadores podem ver todas as unidades"
ON public.units FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'coordenador'));
