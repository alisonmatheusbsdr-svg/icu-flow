-- Add columns for team confirmation (double-check for transfers)
ALTER TABLE patient_regulation
ADD COLUMN IF NOT EXISTS team_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_confirmed_by UUID;