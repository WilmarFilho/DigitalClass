CREATE TABLE IF NOT EXISTS public.lesson_live_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_live_messages_lesson
  ON public.lesson_live_messages(lesson_id, created_at);

ALTER TABLE public.lesson_live_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_live_messages_read"
  ON public.lesson_live_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.teacher_areas ta ON l.area_id = ta.id
      WHERE l.id = lesson_live_messages.lesson_id
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

CREATE POLICY "lesson_live_messages_insert"
  ON public.lesson_live_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.teacher_areas ta ON l.area_id = ta.id
      WHERE l.id = lesson_live_messages.lesson_id
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
