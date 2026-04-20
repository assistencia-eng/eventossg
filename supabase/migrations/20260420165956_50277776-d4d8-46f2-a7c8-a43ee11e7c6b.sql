-- Drop old constraint that prevented same subcategory across categories
ALTER TABLE public.subcategory_images DROP CONSTRAINT IF EXISTS unique_subcategory_image_index;

-- Add categoria column if not exists
ALTER TABLE public.subcategory_images ADD COLUMN IF NOT EXISTS categoria text;

-- Backfill: assign category to existing rows, duplicating for shared subcategory names
DO $$
DECLARE
  rec RECORD;
  cats text[];
  c text;
  first_cat text;
BEGIN
  FOR rec IN SELECT id, subcategory, image_url, image_index FROM public.subcategory_images WHERE categoria IS NULL LOOP
    cats := ARRAY[]::text[];
    IF rec.subcategory = ANY(ARRAY['rock','sertanejo','pagode','eletrônica','funk','hip-hop','reggae','jazz','tradicionalista','gaúcha','MPB']) THEN
      cats := array_append(cats, 'musica');
    END IF;
    IF rec.subcategory = ANY(ARRAY['futebol','corrida','vôlei','basquete','padel','tênis','beach tennis','futevôlei','arte marcial','natação','fitness','academia']) THEN
      cats := array_append(cats, 'esporte');
    END IF;
    IF rec.subcategory = ANY(ARRAY['bebidas','vinho','fast food','churrasco','vegano','sushi','doces','naturais']) THEN
      cats := array_append(cats, 'alimentacao');
    END IF;
    IF rec.subcategory = ANY(ARRAY['teatro','musical','drama','comédia','apresentação cultural','premiações','encontros']) THEN
      cats := array_append(cats, 'entretenimento');
    END IF;
    IF rec.subcategory = ANY(ARRAY['empreendedorismo','tecnologia','saúde','gestão','cultural','esporte']) THEN
      cats := array_append(cats, 'palestras');
    END IF;
    IF rec.subcategory = ANY(ARRAY['empreendedorismo','tecnologia','automação','alimentação']) THEN
      cats := array_append(cats, 'feiras');
    END IF;
    IF rec.subcategory = ANY(ARRAY['ar livre','festa de comunidade','festa temática','balada']) THEN
      cats := array_append(cats, 'festas');
    END IF;

    IF array_length(cats, 1) IS NULL THEN
      CONTINUE;
    END IF;

    first_cat := cats[1];
    UPDATE public.subcategory_images SET categoria = first_cat WHERE id = rec.id;

    FOREACH c IN ARRAY cats LOOP
      IF c = first_cat THEN CONTINUE; END IF;
      INSERT INTO public.subcategory_images (subcategory, image_url, image_index, categoria)
      VALUES (rec.subcategory, rec.image_url, rec.image_index, c);
    END LOOP;
  END LOOP;
END $$;

-- New composite unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS subcategory_images_cat_sub_idx_unique
  ON public.subcategory_images (categoria, subcategory, image_index);