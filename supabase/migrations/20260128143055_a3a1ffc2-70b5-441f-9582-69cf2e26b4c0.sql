-- Adicionar timestamps para cada etapa do fluxo
ALTER TABLE patient_regulation
ADD COLUMN IF NOT EXISTS regulated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ;

-- Campos para mudança de especialidade
ALTER TABLE patient_regulation
ADD COLUMN IF NOT EXISTS previous_support_type TEXT,
ADD COLUMN IF NOT EXISTS change_reason TEXT,
ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS changed_by UUID;

-- Migrar dados existentes
UPDATE patient_regulation 
SET status = 'aguardando_regulacao' 
WHERE status = 'aguardando';

UPDATE patient_regulation 
SET status = 'aguardando_transferencia',
    confirmed_at = updated_at
WHERE status = 'confirmado';

UPDATE patient_regulation 
SET status = 'negado_nir',
    denied_at = updated_at
WHERE status = 'negado';