import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CategoryImageMap = Record<string, string>;

export const useCategoryImages = () => {
  const [images, setImages] = useState<CategoryImageMap>({});
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("category_images")
      .select("categoria, image_url");
    if (data) {
      const map: CategoryImageMap = {};
      data.forEach((row: any) => {
        map[row.categoria] = row.image_url;
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
