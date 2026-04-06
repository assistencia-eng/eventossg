
-- Add new enum values
ALTER TYPE public.event_category ADD VALUE IF NOT EXISTS 'palestras';
ALTER TYPE public.event_category ADD VALUE IF NOT EXISTS 'feiras';
ALTER TYPE public.event_category ADD VALUE IF NOT EXISTS 'empreendedorismo';

-- Allow deleting events
CREATE POLICY "Anyone can delete events"
ON public.events
FOR DELETE
TO public
USING (true);

-- Allow updating events
CREATE POLICY "Anyone can update events"
ON public.events
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true);

-- Storage policies
CREATE POLICY "Event images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Anyone can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anyone can delete event images"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-images');
