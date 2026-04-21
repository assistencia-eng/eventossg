CREATE TABLE public.category_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria text NOT NULL UNIQUE,
  image_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.category_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Category images viewable by everyone"
ON public.category_images
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert category images"
ON public.category_images
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update category images"
ON public.category_images
FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete category images"
ON public.category_images
FOR DELETE
TO authenticated
USING (is_admin());

CREATE TRIGGER update_category_images_updated_at
BEFORE UPDATE ON public.category_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();