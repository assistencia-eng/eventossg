
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS horario text DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurring_days text[] NOT NULL DEFAULT '{}'::text[];
