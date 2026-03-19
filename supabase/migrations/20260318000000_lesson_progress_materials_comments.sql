-- 1. Lesson Progress (aluno marca aula como assistida/lida)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  watched_until_percent DECIMAL(5,2) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON public.lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_progress_own"
  ON public.lesson_progress FOR ALL
  USING (student_id = auth.uid());

-- 2. Lesson Materials (materiais complementares: fotos, arquivos, executáveis)
CREATE TABLE IF NOT EXISTS public.lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'file', 'executable')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson ON public.lesson_materials(lesson_id);

ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

-- Read: teacher or subscriber of the area containing the lesson
CREATE POLICY "lesson_materials_read"
  ON public.lesson_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.teacher_areas ta ON l.area_id = ta.id
      WHERE l.id = lesson_materials.lesson_id
      AND (ta.teacher_id = auth.uid() OR ta.id IN (SELECT teacher_area_id FROM public.teacher_subscriptions WHERE student_id = auth.uid() AND subscription_status IN ('active', 'past_due')))
    )
  );

-- Write: only teacher who owns the area
CREATE POLICY "lesson_materials_teacher_write"
  ON public.lesson_materials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.teacher_areas ta ON l.area_id = ta.id
      WHERE l.id = lesson_materials.lesson_id AND ta.teacher_id = auth.uid()
    )
  );

-- 3. Lesson Comments (alunos comentam nas aulas)
CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson ON public.lesson_comments(lesson_id);

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_comments_read"
  ON public.lesson_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.teacher_areas ta ON l.area_id = ta.id
      WHERE l.id = lesson_comments.lesson_id
      AND (ta.teacher_id = auth.uid() OR ta.id IN (SELECT teacher_area_id FROM public.teacher_subscriptions WHERE student_id = auth.uid() AND subscription_status IN ('active', 'past_due')))
    )
  );

CREATE POLICY "lesson_comments_insert"
  ON public.lesson_comments FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.teacher_areas ta ON l.area_id = ta.id
      WHERE l.id = lesson_comments.lesson_id
      AND ta.id IN (SELECT teacher_area_id FROM public.teacher_subscriptions WHERE student_id = auth.uid() AND subscription_status IN ('active', 'past_due'))
    )
  );

CREATE POLICY "lesson_comments_delete_own"
  ON public.lesson_comments FOR DELETE
  USING (student_id = auth.uid());
