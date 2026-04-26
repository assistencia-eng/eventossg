ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS image_source text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS image_keyword text,
  ADD COLUMN IF NOT EXISTS keyword_image_index integer;