
ALTER TABLE public.profiles
ADD COLUMN cidade text DEFAULT NULL,
ADD COLUMN receber_notificacoes boolean NOT NULL DEFAULT true;
