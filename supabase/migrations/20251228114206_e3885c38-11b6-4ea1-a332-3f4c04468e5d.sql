-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'diarista', 'plantonista', 'coordenador');

-- Criar enum para status de aprovação
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Criar enum para status respiratório
CREATE TYPE public.respiratory_status AS ENUM ('ar_ambiente', 'tot');

-- Criar enum para desfecho do paciente
CREATE TYPE public.patient_outcome AS ENUM ('alta', 'obito', 'transferencia');

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  crm TEXT NOT NULL,
  approval_status approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de roles de usuários (separada por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tabela de unidades (UTIs)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bed_count INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vinculação usuário-unidade
CREATE TABLE public.user_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, unit_id)
);

-- Tabela de leitos
CREATE TABLE public.beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  bed_number INTEGER NOT NULL,
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (unit_id, bed_number)
);

-- Tabela de pacientes
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  initials TEXT NOT NULL,
  age INTEGER NOT NULL,
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  main_diagnosis TEXT,
  comorbidities TEXT,
  respiratory_status respiratory_status NOT NULL DEFAULT 'ar_ambiente',
  is_palliative BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  outcome patient_outcome,
  outcome_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de dispositivos invasivos
CREATE TABLE public.invasive_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  device_type TEXT NOT NULL, -- TOT, CVC, SVD, drenos, etc.
  insertion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de drogas vasoativas
CREATE TABLE public.vasoactive_drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  drug_name TEXT NOT NULL, -- Noradrenalina, Vasopressina, Dobutamina
  dose_ml_h DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de antibióticos
CREATE TABLE public.antibiotics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  antibiotic_name TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de plano terapêutico (apenas diarista edita)
CREATE TABLE public.therapeutic_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de evoluções (histórico imutável)
CREATE TABLE public.evolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invasive_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vasoactive_drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antibiotics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapeutic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (security definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário está aprovado
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND approval_status = 'approved'
  )
$$;

-- Função para verificar acesso à unidade
CREATE OR REPLACE FUNCTION public.has_unit_access(_user_id UUID, _unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_units
    WHERE user_id = _user_id
      AND unit_id = _unit_id
  ) OR public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'coordenador')
$$;

-- Função para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, crm)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', 'Sem Nome'),
    COALESCE(NEW.raw_user_meta_data ->> 'crm', 'Sem CRM')
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil no signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vasoactive_drugs_updated_at
  BEFORE UPDATE ON public.vasoactive_drugs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_therapeutic_plans_updated_at
  BEFORE UPDATE ON public.therapeutic_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para units
CREATE POLICY "Approved users can view assigned units"
  ON public.units FOR SELECT
  TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      public.has_unit_access(auth.uid(), id)
    )
  );

CREATE POLICY "Admins can manage units"
  ON public.units FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para user_units
CREATE POLICY "Users can view own unit assignments"
  ON public.user_units FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage unit assignments"
  ON public.user_units FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para beds
CREATE POLICY "Approved users can view beds in assigned units"
  ON public.beds FOR SELECT
  TO authenticated
  USING (
    public.is_approved(auth.uid()) AND
    public.has_unit_access(auth.uid(), unit_id)
  );

CREATE POLICY "Approved users can update beds in assigned units"
  ON public.beds FOR UPDATE
  TO authenticated
  USING (
    public.is_approved(auth.uid()) AND
    public.has_unit_access(auth.uid(), unit_id)
  );

CREATE POLICY "Admins can manage all beds"
  ON public.beds FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para patients (acesso via leito -> unidade)
CREATE POLICY "Approved users can view patients in assigned units"
  ON public.patients FOR SELECT
  TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      bed_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.beds b
        WHERE b.id = bed_id
        AND public.has_unit_access(auth.uid(), b.unit_id)
      )
    )
  );

CREATE POLICY "Approved users can insert patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can update patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (public.is_approved(auth.uid()));

-- RLS Policies para invasive_devices
CREATE POLICY "Approved users can view invasive devices"
  ON public.invasive_devices FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage invasive devices"
  ON public.invasive_devices FOR ALL
  TO authenticated
  USING (public.is_approved(auth.uid()));

-- RLS Policies para vasoactive_drugs
CREATE POLICY "Approved users can view vasoactive drugs"
  ON public.vasoactive_drugs FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage vasoactive drugs"
  ON public.vasoactive_drugs FOR ALL
  TO authenticated
  USING (public.is_approved(auth.uid()));

-- RLS Policies para antibiotics
CREATE POLICY "Approved users can view antibiotics"
  ON public.antibiotics FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage antibiotics"
  ON public.antibiotics FOR ALL
  TO authenticated
  USING (public.is_approved(auth.uid()));

-- RLS Policies para therapeutic_plans
CREATE POLICY "Approved users can view therapeutic plans"
  ON public.therapeutic_plans FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Diaristas can manage therapeutic plans"
  ON public.therapeutic_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved(auth.uid()) AND
    public.has_role(auth.uid(), 'diarista')
  );

CREATE POLICY "Diaristas can update own therapeutic plans"
  ON public.therapeutic_plans FOR UPDATE
  TO authenticated
  USING (
    public.is_approved(auth.uid()) AND
    public.has_role(auth.uid(), 'diarista')
  );

-- RLS Policies para evolutions
CREATE POLICY "Approved users can view evolutions"
  ON public.evolutions FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can insert evolutions"
  ON public.evolutions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_approved(auth.uid()) AND
    created_by = auth.uid()
  );