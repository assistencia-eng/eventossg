-- Track which default (built-in) categories were removed by admins
CREATE TABLE IF NOT EXISTS public.removed_default_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.removed_default_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Removed default categories viewable by everyone"
  ON public.removed_default_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert removed default categories"
  ON public.removed_default_categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete removed default categories"
  ON public.removed_default_categories FOR DELETE
  TO authenticated
  USING (is_admin());