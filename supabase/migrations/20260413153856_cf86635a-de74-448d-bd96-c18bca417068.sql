ALTER TABLE public.events
ADD COLUMN outdoor_text_align text NOT NULL DEFAULT 'left',
ADD COLUMN outdoor_text_position text NOT NULL DEFAULT 'bottom',
ADD COLUMN outdoor_title_size integer NOT NULL DEFAULT 28,
ADD COLUMN outdoor_show_description boolean NOT NULL DEFAULT true;