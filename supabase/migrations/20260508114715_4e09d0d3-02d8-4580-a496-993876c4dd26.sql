CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App settings readable by everyone"
ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Admins can insert settings"
ON public.app_settings FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update settings"
ON public.app_settings FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

INSERT INTO public.app_settings (key, value) VALUES ('outdoor_show_info', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;