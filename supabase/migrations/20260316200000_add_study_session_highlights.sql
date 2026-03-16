-- Tabela para guardar os trechos de texto destacados em uma sessão
CREATE TABLE IF NOT EXISTS public.study_session_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscar mais rapido os destaques de uma sessao especifica
CREATE INDEX IF NOT EXISTS idx_session_highlights_session_id ON public.study_session_highlights(session_id);
