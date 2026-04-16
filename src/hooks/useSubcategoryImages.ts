import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Maps subcategory -> array of image URLs (up to 3)
export type SubcategoryImageMap = Record<string, string[]>;

export const useSubcategoryImages = () => {
  const [images, setImages] = useState<SubcategoryImageMap>({});
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("subcategory_images")
      .select("subcategory, image_url, image_index")
      .order("image_index", { ascending: true });
    if (data) {
      const map: SubcategoryImageMap = {};
      data.forEach((row) => {
        if (!map[row.subcategory]) map[row.subcategory] = [];
        map[row.subcategory].push(row.image_url);
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
