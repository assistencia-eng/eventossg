
-- Add new enum values (may already exist from partial previous migration)
DO $$ BEGIN
  ALTER TYPE public.event_category ADD VALUE 'entretenimento';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.event_category ADD VALUE 'festas';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS data_fim date,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subcategorias text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS categorias text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS outdoor_duration integer NOT NULL DEFAULT 7;
