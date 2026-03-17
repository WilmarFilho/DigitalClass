-- Add calendar_event_id to study_sessions to link a session clearly to an event
ALTER TABLE public.study_sessions 
ADD COLUMN IF NOT EXISTS calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL;

-- Add completed_minutes to subjects for finer tracking of goals
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS completed_minutes INT DEFAULT 0;

-- Sync completed_hours to completed_minutes if there's any data
UPDATE public.subjects SET completed_minutes = completed_hours * 60 WHERE completed_hours > 0;

-- RPC for atomic increments
CREATE OR REPLACE FUNCTION increment_subject_minutes(sub_id UUID, minutes INT)
RETURNS void AS $$
BEGIN
  UPDATE public.subjects
  SET completed_minutes = COALESCE(completed_minutes, 0) + minutes
  WHERE id = sub_id;
END;
$$ LANGUAGE plpgsql;

