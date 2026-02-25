CREATE POLICY "Users can delete own evolutions"
  ON public.evolutions FOR DELETE
  USING (auth.uid() = created_by);