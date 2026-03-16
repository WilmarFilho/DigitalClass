-- 1. Create Sections table
CREATE TABLE IF NOT EXISTS public.teacher_area_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.teacher_areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create Modules table
CREATE TABLE IF NOT EXISTS public.teacher_area_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.teacher_area_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Create Notices table
CREATE TABLE IF NOT EXISTS public.teacher_area_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.teacher_areas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Update Lessons table
-- Allow module_id to be null for backwards compatibility during migration if needed,
-- but the architectural goal is to use module_id going forward instead of just area_id.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.teacher_area_modules(id) ON DELETE CASCADE;

-- Optional: Since we are moving to a Section -> Module -> Lesson hierarchy,
-- we might still keep area_id on lessons for easier direct querying, or rely on joins.
-- Currently, we keep area_id in lessons, no changes needed.


-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.teacher_area_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_area_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_area_notices ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS Policies

-- For Sections
CREATE POLICY "sections_public_read"
  ON public.teacher_area_sections FOR SELECT
  USING (
    area_id IN (
      SELECT id FROM public.teacher_areas WHERE is_private = false OR teacher_id = auth.uid()
    ) OR
    area_id IN (
      SELECT teacher_area_id FROM public.teacher_subscriptions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "sections_owner_write"
  ON public.teacher_area_sections FOR ALL
  USING (
    area_id IN (
      SELECT id FROM public.teacher_areas WHERE teacher_id = auth.uid()
    )
  );


-- For Modules
CREATE POLICY "modules_public_read"
  ON public.teacher_area_modules FOR SELECT
  USING (
    section_id IN (
      SELECT id FROM public.teacher_area_sections WHERE area_id IN (
        SELECT id FROM public.teacher_areas WHERE is_private = false OR teacher_id = auth.uid()
      ) OR area_id IN (
        SELECT teacher_area_id FROM public.teacher_subscriptions WHERE student_id = auth.uid()
      )
    )
  );

CREATE POLICY "modules_owner_write"
  ON public.teacher_area_modules FOR ALL
  USING (
    section_id IN (
      SELECT id FROM public.teacher_area_sections WHERE area_id IN (
        SELECT id FROM public.teacher_areas WHERE teacher_id = auth.uid()
      )
    )
  );


-- For Notices
CREATE POLICY "notices_public_read"
  ON public.teacher_area_notices FOR SELECT
  USING (
    area_id IN (
      SELECT id FROM public.teacher_areas WHERE is_private = false OR teacher_id = auth.uid()
    ) OR
    area_id IN (
      SELECT teacher_area_id FROM public.teacher_subscriptions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "notices_owner_write"
  ON public.teacher_area_notices FOR ALL
  USING (
    area_id IN (
      SELECT id FROM public.teacher_areas WHERE teacher_id = auth.uid()
    )
  );


-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_teacher_area_sections_area_id ON public.teacher_area_sections(area_id);
CREATE INDEX IF NOT EXISTS idx_teacher_area_modules_section_id ON public.teacher_area_modules(section_id);
CREATE INDEX IF NOT EXISTS idx_teacher_area_notices_area_id ON public.teacher_area_notices(area_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
