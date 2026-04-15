import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubcategoryImageMap = Record<string, string>;

export const useSubcategoryImages = () => {
  const [images, setImages] = useState<SubcategoryImageMap>({});
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("subcategory_images")
      .select("subcategory, image_url");
    if (data) {
      const map: SubcategoryImageMap = {};
      data.forEach((row) => {
        map[row.subcategory] = row.image_url;
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
