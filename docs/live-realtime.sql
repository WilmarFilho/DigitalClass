DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lesson_live_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_live_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lesson_live_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_live_messages;
  END IF;
END $$;
