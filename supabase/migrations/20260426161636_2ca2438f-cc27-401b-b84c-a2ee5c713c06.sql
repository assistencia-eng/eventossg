CREATE OR REPLACE FUNCTION public.validate_image_index()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'keyword_images' THEN
    IF NEW.image_index < 0 OR NEW.image_index > 3 THEN
      RAISE EXCEPTION 'image_index must be between 0 and 3 for keyword_images';
    END IF;
  ELSE
    IF NEW.image_index < 1 OR NEW.image_index > 3 THEN
      RAISE EXCEPTION 'image_index must be between 1 and 3';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;