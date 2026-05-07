ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS outdoor_image_position_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS outdoor_image_position_y numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS outdoor_image_zoom numeric NOT NULL DEFAULT 1;