-- Tabela de locais (venues)
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cidade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues viewable by everyone" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Admins can insert venues" ON public.venues FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update venues" ON public.venues FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete venues" ON public.venues FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER update_venues_updated_at
BEFORE UPDATE ON public.venues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de contatos do local
CREATE TABLE public.venue_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  nome TEXT,
  whatsapp TEXT,
  instagram TEXT,
  facebook TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_contacts_venue_id ON public.venue_contacts(venue_id);

ALTER TABLE public.venue_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue contacts viewable by everyone" ON public.venue_contacts FOR SELECT USING (true);
CREATE POLICY "Admins can insert venue contacts" ON public.venue_contacts FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update venue contacts" ON public.venue_contacts FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete venue contacts" ON public.venue_contacts FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER update_venue_contacts_updated_at
BEFORE UPDATE ON public.venue_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vincular eventos a locais e permitir contatos custom (override)
ALTER TABLE public.events
  ADD COLUMN venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  ADD COLUMN custom_contacts JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_events_venue_id ON public.events(venue_id);