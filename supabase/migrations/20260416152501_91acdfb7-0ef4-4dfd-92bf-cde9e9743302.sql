
-- Add image_index column (1, 2, or 3)
ALTER TABLE public.subcategory_images
ADD COLUMN image_index integer NOT NULL DEFAULT 1;

-- Add constraint to ensure index is 1-3
CREATE OR REPLACE FUNCTION public.validate_image_index()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.image_index < 1 OR NEW.image_index > 3 THEN
    RAISE EXCEPTION 'image_index must be between 1 and 3';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_subcategory_image_index
BEFORE INSERT OR UPDATE ON public.subcategory_images
FOR EACH ROW
EXECUTE FUNCTION public.validate_image_index();

-- Add unique constraint on subcategory + image_index
ALTER TABLE public.subcategory_images
ADD CONSTRAINT unique_subcategory_image_index UNIQUE (subcategory, image_index);
