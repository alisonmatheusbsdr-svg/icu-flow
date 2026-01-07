-- Create respiratory_support table
CREATE TABLE public.respiratory_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Modalidade atual
  modality TEXT NOT NULL DEFAULT 'ar_ambiente', -- ar_ambiente, cateter_nasal, mascara_simples, mascara_reservatorio, vni, tot, traqueostomia
  
  -- Parâmetros gerais
  spo2_target NUMERIC,           -- SpO2 alvo/basal (%)
  flow_rate NUMERIC,             -- Fluxo (L/min)
  fio2 NUMERIC,                  -- FiO2 (%)
  
  -- Parâmetros VNI
  vni_type TEXT,                 -- cpap, bipap
  vni_tolerance TEXT,            -- boa, parcial, ruim
  
  -- Parâmetros TOT
  intubation_date DATE,
  ventilator_mode TEXT,
  peep NUMERIC,
  volume_or_pressure NUMERIC,
  is_sedated BOOLEAN DEFAULT false,
  
  -- Parâmetros Traqueostomia
  cannula_type TEXT,             -- plastica, metalica
  cuff_status TEXT,              -- insuflado, desinsuflado
  on_ventilation BOOLEAN DEFAULT false,
  
  -- Situação clínica
  clinical_status TEXT,          -- estavel, dependente_o2, desmame, alto_risco, paliativo
  
  -- Controle
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.respiratory_support ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Approved users can view respiratory_support"
  ON public.respiratory_support FOR SELECT
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can manage respiratory_support"
  ON public.respiratory_support FOR ALL
  USING (is_approved(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_respiratory_support_updated_at
  BEFORE UPDATE ON public.respiratory_support
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();