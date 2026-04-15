
CREATE TABLE public.subcategory_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory text NOT NULL UNIQUE,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subcategory_images ENABLE ROW LEVEL SECURITY;

-- Everyone can view (needed for event cards)
CREATE POLICY "Subcategory images viewable by everyone"
  ON public.subcategory_images FOR SELECT TO public
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert subcategory images"
  ON public.subcategory_images FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update subcategory images"
  ON public.subcategory_images FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete subcategory images"
  ON public.subcategory_images FOR DELETE TO authenticated
  USING (is_admin());

CREATE TRIGGER update_subcategory_images_updated_at
  BEFORE UPDATE ON public.subcategory_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
