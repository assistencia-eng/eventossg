CREATE TABLE IF NOT EXISTS public.subcategory_order (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria text NOT NULL,
  subcategoria text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(categoria, subcategoria)
);

ALTER TABLE public.subcategory_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcategory order viewable by everyone"
ON public.subcategory_order FOR SELECT
USING (true);

CREATE POLICY "Admins can insert subcategory order"
ON public.subcategory_order FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update subcategory order"
ON public.subcategory_order FOR UPDATE TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete subcategory order"
ON public.subcategory_order FOR DELETE TO authenticated
USING (is_admin());

CREATE TRIGGER update_subcategory_order_updated_at
BEFORE UPDATE ON public.subcategory_order
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();