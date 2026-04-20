import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Maps "categoria::subcategoria" -> array of image URLs (up to 3)
// Using a composite key prevents subcategories with the same name in different
// categories (e.g. "tecnologia" in feiras and palestras) from sharing images.
export type SubcategoryImageMap = Record<string, string[]>;

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
