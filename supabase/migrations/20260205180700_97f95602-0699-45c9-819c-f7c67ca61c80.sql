-- Criar tabela de logs de impressão
CREATE TABLE public.print_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  print_type text NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  unit_name text,
  patient_count integer DEFAULT 1,
  patient_ids uuid[] DEFAULT '{}',
  bed_numbers integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

-- Admin e coordenador podem ler todos os logs
CREATE POLICY "Admin e coordenador podem ler print_logs"
ON public.print_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'coordenador')
);

-- Usuários aprovados podem inserir logs das próprias impressões
CREATE POLICY "Usuários aprovados podem registrar impressões"
ON public.print_logs FOR INSERT TO authenticated
WITH CHECK (
  public.is_approved(auth.uid()) AND
  user_id = auth.uid()
);