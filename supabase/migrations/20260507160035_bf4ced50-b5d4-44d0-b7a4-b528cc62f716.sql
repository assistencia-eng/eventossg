-- Add type column to subcategory_order to support both subcategories and keywords in the hybrid ranking
ALTER TABLE public.subcategory_order
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'sub';

-- Function to rename a subcategory (default or custom) and propagate to all events
CREATE OR REPLACE FUNCTION public.rename_subcategory(
  p_categoria text,
  p_old text,
  p_new text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_default boolean := false;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  IF p_old IS NULL OR p_new IS NULL OR length(trim(p_new)) = 0 THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;
  IF p_old = p_new THEN
    RETURN;
  END IF;

  -- Try removing custom row with old name (if exists)
  DELETE FROM public.custom_subcategories
   WHERE categoria = p_categoria AND subcategoria = p_old;

  -- Ensure the new name exists as a custom subcategory entry (so it survives across syncs)
  INSERT INTO public.custom_subcategories (categoria, subcategoria)
  VALUES (p_categoria, p_new)
  ON CONFLICT DO NOTHING;

  -- Hide the old default name (no-op if it wasn't a default)
  INSERT INTO public.removed_default_subcategories (categoria, subcategoria)
  VALUES (p_categoria, p_old)
  ON CONFLICT DO NOTHING;

  -- Update events that reference the old subcategory name
  UPDATE public.events
     SET subcategorias = array_replace(subcategorias, p_old, p_new),
         updated_at = now()
   WHERE p_old = ANY(subcategorias);

  -- Migrate ranking position
  UPDATE public.subcategory_order
     SET subcategoria = p_new
   WHERE categoria = p_categoria AND subcategoria = p_old AND tipo = 'sub';
END;
$$;