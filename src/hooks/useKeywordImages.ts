import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Maps lowercase keyword -> sparse array of image URLs indexed by slot
// (index 0 = slot 1, index 1 = slot 2, index 2 = slot 3). Empty slots are undefined.
export type KeywordImageMap = Record<string, (string | undefined)[]>;

export const useKeywordImages = () => {
  const [images, setImages] = useState<KeywordImageMap>({});
  const [loading, setLoading] = useState(true);

  const fetchImages = async () => {
    const [kwRes, subRes] = await Promise.all([
      (supabase as any)
        .from("keyword_images")
        .select("keyword, image_url, image_index")
        .order("image_index", { ascending: true }),
      (supabase as any)
        .from("subcategory_images")
        .select("subcategory, image_url, image_index")
        .order("image_index", { ascending: true }),
    ]);

    const map: KeywordImageMap = {};

    // 1) Real keyword library entries (highest priority — declared by admin)
    if (kwRes.data) {
      kwRes.data.forEach((row: any) => {
        const key = (row.keyword || "").toLowerCase().trim();
        if (!key) return;
        if (!map[key]) map[key] = [];
        // image_index 0 = placeholder (keyword exists but no image yet)
        if (row.image_index && row.image_index >= 1 && row.image_index <= 3 && row.image_url) {
          map[key][row.image_index - 1] = row.image_url;
        }
      });
    }

    // 2) Auto-derive keywords from subcategories so every existing
    //    subcategory automatically becomes a usable keyword that reuses
    //    the subcategory's images. If an admin already declared a keyword
    //    with the same name and uploaded images, we keep the admin one.
    if (subRes.data) {
      const subMap: Record<string, string[]> = {};
      subRes.data.forEach((row: any) => {
        const key = (row.subcategory || "").toLowerCase().trim();
        if (!key || !row.image_url) return;
        if (!subMap[key]) subMap[key] = [];
        subMap[key].push(row.image_url);
      });
      Object.entries(subMap).forEach(([key, imgs]) => {
        const existing = map[key];
        // Only fill if there's no real keyword with images already.
        const hasReal = existing && existing.filter(Boolean).length > 0;
        if (!hasReal) {
          map[key] = imgs;
        }
      });
    }

    setImages(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return { images, loading, refetch: fetchImages };
};

// Normalize text: lowercase + remove diacritics
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Find the first matching keyword in the given text and return one of its
 * images, picked deterministically based on the provided seed (event id).
 * Returns undefined if no keyword matches or no images are configured.
 */
export function pickKeywordImage(
  text: string | undefined | null,
  keywordImages: KeywordImageMap | undefined,
  seed: string
): string | undefined {
  if (!keywordImages || !text) return undefined;
  const haystack = normalize(text);
  const keys = Object.keys(keywordImages);
  keys.sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const nk = normalize(k);
    if (!nk) continue;
    if (haystack.includes(nk)) {
      const imgs = (keywordImages[k] || []).filter(Boolean) as string[];
      if (imgs.length > 0) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
          hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
        }
        return imgs[Math.abs(hash) % imgs.length];
      }
    }
  }
  return undefined;
}

/**
 * Pick image based on an explicit list of event keywords (tags) — takes
 * priority over title scanning.
 */
export function pickImageByEventKeywords(
  eventKeywords: string[] | undefined | null,
  keywordImages: KeywordImageMap | undefined,
  seed: string
): string | undefined {
  if (!keywordImages || !eventKeywords || eventKeywords.length === 0) return undefined;
  for (const kw of eventKeywords) {
    const nk = normalize(kw);
    const matchKey = Object.keys(keywordImages).find((k) => normalize(k) === nk);
    if (matchKey) {
      const imgs = (keywordImages[matchKey] || []).filter(Boolean) as string[];
      if (imgs.length > 0) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
          hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
        }
        return imgs[Math.abs(hash) % imgs.length];
      }
    }
  }
  return undefined;
}
