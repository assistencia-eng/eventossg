CREATE TYPE public.event_category AS ENUM ('musica', 'esporte', 'teatro', 'alimentacao');

CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  local TEXT NOT NULL DEFAULT 'Não informado',
  cidade TEXT NOT NULL DEFAULT 'Não informado',
  endereco TEXT NOT NULL DEFAULT 'Não informado',
  data DATE NOT NULL,
  descricao TEXT NOT NULL DEFAULT 'Não informado',
  atracoes TEXT[] NOT NULL DEFAULT '{}',
  categoria public.event_category NOT NULL DEFAULT 'musica',
  latitude DOUBLE PRECISION NOT NULL DEFAULT -29.3731,
  longitude DOUBLE PRECISION NOT NULL DEFAULT -50.8760,
  imagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT USING (true);

CREATE POLICY "Anyone can insert events"
  ON public.events FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();