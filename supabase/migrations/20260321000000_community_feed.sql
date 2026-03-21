-- ============================================================
-- COMMUNITY & FEED FEATURE
-- ============================================================

-- 1. Storage bucket for community posts (images/videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('community', 'community', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "community_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community');

CREATE POLICY "community_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'community' AND auth.uid() IS NOT NULL);

CREATE POLICY "community_owner_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'community' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 2. teacher_follows (quem segue quem)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_follows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_follows_follower ON public.teacher_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_teacher_follows_teacher  ON public.teacher_follows(teacher_id);

ALTER TABLE public.teacher_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_follows_read"
  ON public.teacher_follows FOR SELECT USING (true);

CREATE POLICY "teacher_follows_insert"
  ON public.teacher_follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "teacher_follows_delete"
  ON public.teacher_follows FOR DELETE
  USING (follower_id = auth.uid());

-- ============================================================
-- 3. community_posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('text', 'photo', 'video', 'clip')),
  caption    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_teacher ON public.community_posts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_type    ON public.community_posts(type);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_posts_read"
  ON public.community_posts FOR SELECT USING (true);

CREATE POLICY "community_posts_insert"
  ON public.community_posts FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "community_posts_delete"
  ON public.community_posts FOR DELETE
  USING (teacher_id = auth.uid());

-- ============================================================
-- 4. community_post_media (imagens / videos das postagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_post_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url         TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_media_post ON public.community_post_media(post_id);

ALTER TABLE public.community_post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_post_media_read"
  ON public.community_post_media FOR SELECT USING (true);

CREATE POLICY "community_post_media_insert"
  ON public.community_post_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id AND cp.teacher_id = auth.uid()
    )
  );

CREATE POLICY "community_post_media_delete"
  ON public.community_post_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id = post_id AND cp.teacher_id = auth.uid()
    )
  );

-- ============================================================
-- 5. community_post_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_post_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_likes_post ON public.community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_likes_user ON public.community_post_likes(user_id);

ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_post_likes_read"
  ON public.community_post_likes FOR SELECT USING (true);

CREATE POLICY "community_post_likes_insert"
  ON public.community_post_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "community_post_likes_delete"
  ON public.community_post_likes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 6. community_post_comments (comments + replies via parent_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post   ON public.community_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON public.community_post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user   ON public.community_post_comments(user_id);

ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_comments_read"
  ON public.community_post_comments FOR SELECT USING (true);

CREATE POLICY "community_comments_insert"
  ON public.community_post_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "community_comments_delete"
  ON public.community_post_comments FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 7. community_comment_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_comment_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.community_post_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_comment_likes_comment ON public.community_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comment_likes_user    ON public.community_comment_likes(user_id);

ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_comment_likes_read"
  ON public.community_comment_likes FOR SELECT USING (true);

CREATE POLICY "community_comment_likes_insert"
  ON public.community_comment_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "community_comment_likes_delete"
  ON public.community_comment_likes FOR DELETE
  USING (user_id = auth.uid());



-- Execute isso se o backend não estiver recebendo NADA da tabela profiles de outros usuários
CREATE POLICY "Profiles são visíveis por todos" 
ON public.profiles FOR SELECT 
USING (true);




CREATE OR REPLACE FUNCTION public.handle_social_login_metadata()
RETURNS TRIGGER AS $$
DECLARE
    google_photo TEXT;
BEGIN
    -- Extrai a URL da foto dos metadados do provedor social
    google_photo := NEW.raw_user_meta_data->>'avatar_url';

    -- Atualiza ou Insere na tabela profiles
    -- Ajuste 'id' e 'foto_url' conforme os nomes reais das suas colunas
    UPDATE public.profiles
    SET avatar_url = COALESCE(profiles.avatar_url, google_photo)
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_social_update
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_login_metadata();