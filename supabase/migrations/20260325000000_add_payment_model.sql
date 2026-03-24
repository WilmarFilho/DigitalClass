-- Add payment_model column to teacher_areas
-- Default 'recurring' ensures existing areas keep working as monthly subscriptions
ALTER TABLE public.teacher_areas
  ADD COLUMN IF NOT EXISTS payment_model TEXT DEFAULT 'recurring';
