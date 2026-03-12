-- Adiciona colunas extras na área do professor
ALTER TABLE public.teacher_areas
  ADD COLUMN IF NOT EXISTS color_code TEXT DEFAULT '#4F46E5',
  ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0;

-- Adiciona tipo e ordem nas aulas
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('video', 'pdf')) DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Bucket para arquivos de aula (execute no Supabase Storage se necessário)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lessons', 'lessons', false) ON CONFLICT DO NOTHING;

-- Política RLS básica para teacher_areas (leitura pública de áreas não privadas)
ALTER TABLE public.teacher_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Teacher Areas Policies
CREATE POLICY "teacher_areas_public_read"
  ON public.teacher_areas FOR SELECT
  USING (is_private = false OR teacher_id = auth.uid());

CREATE POLICY "teacher_areas_owner_write"
  ON public.teacher_areas FOR ALL
  USING (teacher_id = auth.uid());

-- 2. Lessons Policies
CREATE POLICY "lessons_subscribed_or_owner"
  ON public.lessons FOR SELECT
  USING (
    area_id IN (
      SELECT id FROM public.teacher_areas WHERE teacher_id = auth.uid()
    ) OR
    area_id IN (
      SELECT teacher_area_id FROM public.teacher_subscriptions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "lessons_owner_write"
  ON public.lessons FOR ALL
  USING (
    area_id IN (
      SELECT id FROM public.teacher_areas WHERE teacher_id = auth.uid()
    )
  );

-- 3. Subscriptions Policy
CREATE POLICY "subscriptions_own"
  ON public.teacher_subscriptions FOR ALL
  USING (student_id = auth.uid());

-- Indices (These ARE allowed to use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_teacher_areas_teacher_id ON public.teacher_areas(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_area_id ON public.lessons(area_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subscriptions_student_id ON public.teacher_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subscriptions_area_id ON public.teacher_subscriptions(teacher_area_id);