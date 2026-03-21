ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS content_text TEXT,      -- Para o texto extraído do PDF
ADD COLUMN IF NOT EXISTS transcription TEXT;    -- Para a transcrição do vídeo