ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS content_text TEXT,      -- Para o texto extraído do PDF
ADD COLUMN IF NOT EXISTS transcription TEXT;    -- Para a transcrição do vídeo

-- Migration: 20260319020000_add_ai_sync_control.sql

ALTER TABLE public.teacher_areas
ADD COLUMN IF NOT EXISTS ai_last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_tutor_enabled boolean DEFAULT FALSE 


-- 1. Habilitar a extensão (Certifique-se de rodar isso sozinho primeiro se o erro persistir)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela de Conhecimento
CREATE TABLE IF NOT EXISTS public.teacher_area_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.teacher_areas(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- Confirmar que AiService usa text-embedding-3-small
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Chats
CREATE TABLE IF NOT EXISTS public.teacher_area_ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.teacher_areas(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices (Atenção aqui)
CREATE INDEX IF NOT EXISTS idx_knowledge_area_id ON public.teacher_area_knowledge(area_id);

-- DICA: Se a tabela estiver vazia, o índice HNSW é mais moderno e performático que o IVFFLAT
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON public.teacher_area_knowledge 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_ai_chats_student_area ON public.teacher_area_ai_chats(student_id, area_id);

-- 5. RLS (Segurança)
ALTER TABLE public.teacher_area_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_area_ai_chats ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'knowledge_access_policy') THEN
        CREATE POLICY "knowledge_access_policy" ON public.teacher_area_knowledge
        FOR SELECT USING (
            area_id IN (SELECT id FROM public.teacher_areas WHERE teacher_id = auth.uid()) OR
            area_id IN (SELECT teacher_area_id FROM public.teacher_subscriptions WHERE student_id = auth.uid() AND (subscription_status = 'active' OR subscription_status = 'trialing'))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_chats_own_access') THEN
        CREATE POLICY "ai_chats_own_access" ON public.teacher_area_ai_chats
        FOR ALL USING (student_id = auth.uid());
    END IF;
END $$;


CREATE OR REPLACE FUNCTION match_teacher_knowledge (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_area_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tk.id,
    tk.content,
    1 - (tk.embedding <=> query_embedding) AS similarity
  FROM teacher_area_knowledge tk
  WHERE tk.area_id = p_area_id
    AND 1 - (tk.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;