ALTER TABLE public.events ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS idx_events_keywords ON public.events USING GIN (keywords);