ALTER TABLE public.teacher_areas
  ADD COLUMN IF NOT EXISTS banner_fit TEXT NOT NULL DEFAULT 'cover'
    CHECK (banner_fit IN ('cover', 'contain', 'fill')),
  ADD COLUMN IF NOT EXISTS banner_position TEXT NOT NULL DEFAULT 'center'
    CHECK (banner_position IN ('center', 'top', 'bottom', 'left', 'right'));
