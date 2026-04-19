CREATE TABLE public.custom_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  subcategoria text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (categoria, subcategoria)
);

ALTER TABLE public.custom_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom subcategories viewable by everyone"
  ON public.custom_subcategories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert custom subcategories"
  ON public.custom_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete custom subcategories"
  ON public.custom_subcategories FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE TABLE public.removed_default_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  subcategoria text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (categoria, subcategoria)
);

ALTER TABLE public.removed_default_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Removed defaults viewable by everyone"
  ON public.removed_default_subcategories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert removed defaults"
  ON public.removed_default_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete removed defaults"
  ON public.removed_default_subcategories FOR DELETE
  TO authenticated
  USING (is_admin());