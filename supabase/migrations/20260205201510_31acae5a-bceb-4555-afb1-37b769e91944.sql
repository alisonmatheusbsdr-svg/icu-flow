ALTER TABLE public.active_sessions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
