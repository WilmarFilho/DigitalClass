-- Adiciona coluna scheduled_time para associar evento a um horário específico
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS scheduled_time TIME;
