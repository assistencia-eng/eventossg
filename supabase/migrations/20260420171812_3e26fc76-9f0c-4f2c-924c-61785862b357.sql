-- Table for fully custom categories created by admins
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '📌',
  color_vibrant text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom categories viewable by everyone"
  ON public.custom_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert custom categories"
  ON public.custom_categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update custom categories"
  ON public.custom_categories FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete custom categories"
  ON public.custom_categories FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE TRIGGER update_custom_categories_updated_at
  BEFORE UPDATE ON public.custom_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table that stores admin overrides (label/icon/color) for the built-in default categories
CREATE TABLE IF NOT EXISTS public.category_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text,
  icon text,
  color_vibrant text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Category overrides viewable by everyone"
  ON public.category_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert category overrides"
  ON public.category_overrides FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update category overrides"
  ON public.category_overrides FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete category overrides"
  ON public.category_overrides FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE TRIGGER update_category_overrides_updated_at
  BEFORE UPDATE ON public.category_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();