CREATE TABLE public.duplicate_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_a_id UUID NOT NULL,
  event_b_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT duplicate_exceptions_pair_unique UNIQUE (event_a_id, event_b_id),
  CONSTRAINT duplicate_exceptions_ordered CHECK (event_a_id < event_b_id)
);

CREATE INDEX idx_duplicate_exceptions_a ON public.duplicate_exceptions(event_a_id);
CREATE INDEX idx_duplicate_exceptions_b ON public.duplicate_exceptions(event_b_id);

ALTER TABLE public.duplicate_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view duplicate exceptions"
  ON public.duplicate_exceptions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert duplicate exceptions"
  ON public.duplicate_exceptions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete duplicate exceptions"
  ON public.duplicate_exceptions FOR DELETE
  TO authenticated
  USING (is_admin());