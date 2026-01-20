-- Create active_sessions table for exclusive UTI access
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_blocking BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one blocking session per UTI (plantonistas)
CREATE UNIQUE INDEX idx_active_sessions_blocking_unit 
ON public.active_sessions(unit_id) 
WHERE is_blocking = true;

-- Only one session per user (can't be in multiple UTIs)
CREATE UNIQUE INDEX idx_active_sessions_user 
ON public.active_sessions(user_id);

-- Index for activity-based queries (timeout cleanup)
CREATE INDEX idx_active_sessions_activity ON public.active_sessions(last_activity);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Approved users can view all sessions (to see UTI status)
CREATE POLICY "Approved users can view sessions"
ON public.active_sessions
FOR SELECT
USING (is_approved(auth.uid()));

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.active_sessions
FOR INSERT
WITH CHECK (is_approved(auth.uid()) AND user_id = auth.uid());

-- Users can update their own sessions (heartbeat)
CREATE POLICY "Users can update own sessions"
ON public.active_sessions
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own sessions (logout)
CREATE POLICY "Users can delete own sessions"
ON public.active_sessions
FOR DELETE
USING (user_id = auth.uid());

-- Admins and Coordenadores can delete any session (force release)
CREATE POLICY "Admins can delete any session"
ON public.active_sessions
FOR DELETE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenador'));

-- Function to cleanup expired sessions (30 minutes timeout)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.active_sessions
  WHERE last_activity < NOW() - INTERVAL '30 minutes';
END;
$$;

-- Function to check if a unit is available (no blocking session or expired)
CREATE OR REPLACE FUNCTION public.is_unit_available(_unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.active_sessions
    WHERE unit_id = _unit_id
      AND is_blocking = true
      AND last_activity > NOW() - INTERVAL '30 minutes'
  )
$$;