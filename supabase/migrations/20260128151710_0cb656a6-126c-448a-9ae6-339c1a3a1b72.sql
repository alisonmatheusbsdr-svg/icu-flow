-- Add clinical hold and cancellation fields to patient_regulation
ALTER TABLE patient_regulation
-- Impossibilidade clínica (equipe sinaliza)
ADD COLUMN IF NOT EXISTS clinical_hold_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinical_hold_by UUID,
ADD COLUMN IF NOT EXISTS clinical_hold_reason TEXT,
-- Prazo definido pelo NIR
ADD COLUMN IF NOT EXISTS clinical_hold_deadline DATE,
ADD COLUMN IF NOT EXISTS clinical_hold_deadline_set_by UUID,
-- Solicitação de nova listagem (quando prazo vence)
ADD COLUMN IF NOT EXISTS relisting_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS relisting_requested_by UUID,
ADD COLUMN IF NOT EXISTS relisting_reason TEXT,
-- Cancelamento solicitado pela equipe
ADD COLUMN IF NOT EXISTS team_cancel_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_cancel_requested_by UUID,
ADD COLUMN IF NOT EXISTS team_cancel_reason TEXT;