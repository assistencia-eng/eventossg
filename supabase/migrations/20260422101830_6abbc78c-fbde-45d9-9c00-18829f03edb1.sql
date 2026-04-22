-- Convert events.categoria from enum to text so custom categories work
ALTER TABLE public.events
  ALTER COLUMN categoria DROP DEFAULT;

ALTER TABLE public.events
  ALTER COLUMN categoria TYPE text USING categoria::text;

ALTER TABLE public.events
  ALTER COLUMN categoria SET DEFAULT 'musica';