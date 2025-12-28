-- Adicionar novos valores ao enum patient_outcome
ALTER TYPE patient_outcome ADD VALUE IF NOT EXISTS 'alta_enfermaria';
ALTER TYPE patient_outcome ADD VALUE IF NOT EXISTS 'transferencia_externa';
ALTER TYPE patient_outcome ADD VALUE IF NOT EXISTS 'transferencia_interna';