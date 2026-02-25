ALTER TABLE public.evolutions 
  ADD COLUMN cancelled_at timestamptz DEFAULT NULL;

-- Permitir que o autor atualize (para marcar cancelled_at)
CREATE POLICY "Users can cancel own evolutions"
  ON public.evolutions
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);