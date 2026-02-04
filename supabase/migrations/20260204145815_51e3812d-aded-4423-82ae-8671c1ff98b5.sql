-- Fix: Add explicit auth.uid() IS NOT NULL check to Coordenadores SELECT policy
-- This prevents unauthenticated access to healthcare provider data

DROP POLICY IF EXISTS "Coordenadores podem ver perfis de plantonistas e diaristas" ON public.profiles;

CREATE POLICY "Coordenadores podem ver perfis de plantonistas e diaristas"
ON public.profiles FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND
  has_role(auth.uid(), 'coordenador'::app_role) AND 
  (
    (EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = profiles.id 
      AND ur.role = ANY (ARRAY['plantonista'::app_role, 'diarista'::app_role])
    )) 
    OR 
    (NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = profiles.id
    ))
  )
);