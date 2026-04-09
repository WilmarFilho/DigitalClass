CREATE TABLE IF NOT EXISTS public.app_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    context TEXT,
    stack TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role Only"
    ON public.app_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
