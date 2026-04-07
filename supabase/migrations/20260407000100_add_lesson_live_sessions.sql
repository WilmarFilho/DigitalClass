DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lessons_type_check'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons DROP CONSTRAINT lessons_type_check;
  END IF;
END $$;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_type_check
  CHECK (type IN ('video', 'pdf', 'live'));

CREATE TABLE IF NOT EXISTS public.lesson_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'ready', 'live', 'ended', 'canceled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  aws_channel_arn TEXT,
  aws_stream_key_arn TEXT,
  aws_ingest_endpoint TEXT,
  playback_url TEXT,
  replay_url TEXT,
  recording_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_live_sessions_lesson_id
  ON public.lesson_live_sessions(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_live_sessions_status
  ON public.lesson_live_sessions(status);

ALTER TABLE public.lesson_live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_live_sessions_read"
  ON public.lesson_live_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.teacher_areas ta ON l.area_id = ta.id
      WHERE l.id = lesson_live_sessions.lesson_id
        AND (
          ta.teacher_id = auth.uid()
          OR ta.id IN (
            SELECT teacher_area_id
            FROM public.teacher_subscriptions
            WHERE student_id = auth.uid()
              AND subscription_status IN ('active', 'past_due', 'lifetime')
          )
        )
    )
  );

CREATE POLICY "lesson_live_sessions_teacher_write"
  ON public.lesson_live_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.teacher_areas ta ON l.area_id = ta.id
      WHERE l.id = lesson_live_sessions.lesson_id
        AND ta.teacher_id = auth.uid()
    )
  );
