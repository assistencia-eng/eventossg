import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Maps "categoria::subcategoria" -> sparse array of image URLs indexed by slot
// (index 0 = slot 1, index 1 = slot 2, index 2 = slot 3). Empty slots are undefined.
// Using a composite key prevents subcategories with the same name in different
// categories (e.g. "tecnologia" in feiras and palestras) from sharing images.
export type SubcategoryImageMap = Record<string, (string | undefined)[]>;

export const subImgKey = (categoria: string | undefined | null, subcategory: string) =>
  `${categoria || ""}::${subcategory}`;

export const useSubcategoryImages = () => {
  const [images, setImages] = useState<SubcategoryImageMap>({});
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("subcategory_images")
      .select("categoria, subcategory, image_url, image_index")
      .order("image_index", { ascending: true });
    if (data) {
      const map: SubcategoryImageMap = {};
      data.forEach((row: any) => {
        const key = subImgKey(row.categoria, row.subcategory);
        if (!map[key]) map[key] = [];
        map[key].push(row.image_url);
      });
      setImages(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return { images, loading, refetch: fetchImages };
};
