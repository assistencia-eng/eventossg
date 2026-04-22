-- Create keyword_images table for keyword-based image library
CREATE TABLE public.keyword_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_index INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (keyword, image_index)
);

-- Index for fast keyword lookup (lowercase)
CREATE INDEX idx_keyword_images_keyword_lower ON public.keyword_images (LOWER(keyword));

-- Enable Row Level Security
ALTER TABLE public.keyword_images ENABLE ROW LEVEL SECURITY;

-- Policies: public read, admin write
CREATE POLICY "Keyword images viewable by everyone"
  ON public.keyword_images
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert keyword images"
  ON public.keyword_images
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update keyword images"
  ON public.keyword_images
  FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete keyword images"
  ON public.keyword_images
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Reuse the validate_image_index trigger to enforce 1..3 range
CREATE TRIGGER validate_keyword_image_index
  BEFORE INSERT OR UPDATE ON public.keyword_images
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_image_index();

-- Auto update updated_at
CREATE TRIGGER update_keyword_images_updated_at
  BEFORE UPDATE ON public.keyword_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();