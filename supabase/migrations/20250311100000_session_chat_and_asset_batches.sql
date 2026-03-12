-- Tabela para mensagens do chat da sessão
CREATE TABLE IF NOT EXISTS public.session_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_chat_messages_session_id ON public.session_chat_messages(session_id);

-- Coluna para agrupar questões de quiz e flashcards em "batches"
ALTER TABLE public.study_assets ADD COLUMN IF NOT EXISTS batch_id UUID;
