CREATE TABLE IF NOT EXISTS public.session_chat_message_audio_cache (
  message_id UUID PRIMARY KEY REFERENCES public.session_chat_messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  audio_base64 TEXT,
  mime_type TEXT,
  voice TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_chat_message_audio_cache_status
  ON public.session_chat_message_audio_cache(status, updated_at);
