-- Permitir coordenadores verem profiles de plantonistas e diaristas
-- (ou usuários sem role ainda - para aprovar novos cadastros)
CREATE POLICY "Coordenadores podem ver perfis de plantonistas e diaristas"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coordenador') 
  AND (
    -- Usuários que têm role plantonista ou diarista
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = profiles.id 
      AND ur.role IN ('plantonista', 'diarista')
    )
    -- OU usuários que ainda não têm role (cadastro pendente)
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = profiles.id
    )
  )
);

-- Permitir coordenadores atualizarem approval_status de plantonistas/diaristas
CREATE POLICY "Coordenadores podem aprovar plantonistas e diaristas"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'coordenador') 
  AND (
    -- Usuários que têm role plantonista ou diarista
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = profiles.id 
      AND ur.role IN ('plantonista', 'diarista')
    )
    -- OU usuários que ainda não têm role (cadastro pendente)
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = profiles.id
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'coordenador') 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = profiles.id 
      AND ur.role IN ('plantonista', 'diarista')
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = profiles.id
    )
  )
);