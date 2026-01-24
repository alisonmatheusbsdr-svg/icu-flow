-- Add handover mode columns to active_sessions
ALTER TABLE public.active_sessions 
ADD COLUMN handover_mode BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.active_sessions 
ADD COLUMN is_handover_receiver BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.active_sessions.handover_mode IS 'When true, the unit is in handover mode allowing a second viewer';
COMMENT ON COLUMN public.active_sessions.is_handover_receiver IS 'When true, this session is the receiver viewing in read-only mode';