import { useEffect, useMemo, useState } from "react";
import { EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { supabase } from "@/integrations/supabase/client";
import { useSubcategoryImages, subImgKey } from "@/hooks/useSubcategoryImages";
import { useCategoryImages } from "@/hooks/useCategoryImages";
import { useCategoriesVersion, getCustomCategoryKeys, getRemovedDefaultCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";

interface ExplorePageProps {
  onSelectSubcategory: (categoria: EventCategory, sub: string) => void;
}

interface SubItem {
  categoria: EventCategory;
  sub: string;
}

const defaultCategories: EventCategory[] = [
  "musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas",
];

const ExplorePage = ({ onSelectSubcategory }: ExplorePageProps) => {
  const { images: subImages } = useSubcategoryImages();
  const { images: catImages } = useCategoryImages();
  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  const [orderRows, setOrderRows] = useState<Array<{ categoria: string; subcategoria: string; position: number }>>([]);

  useEffect(() => {
    supabase
      .from("subcategory_order")
      .select("categoria, subcategoria, position")
      .then(({ data }) => {
        if (data) setOrderRows(data as any);
      });
  }, []);

  const categories = useMemo<EventCategory[]>(() => {
    const customs = getCustomCategoryKeys();
    const removed = new Set(getRemovedDefaultCategoryKeys());
    return [
      ...defaultCategories.filter((c) => !removed.has(c)),
      ...customs.filter((c) => !defaultCategories.includes(c)),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catVersion]);

  const items = useMemo<SubItem[]>(() => {
    const all: SubItem[] = [];
    categories.forEach((cat) => {
      (subcategoryOptions[cat] || []).forEach((sub) => {
        all.push({ categoria: cat, sub });
      });
    });
    const orderMap = new Map<string, number>();
    orderRows.forEach((r) => orderMap.set(`${r.categoria}::${r.subcategoria}`, r.position));
    return all.sort((a, b) => {
      const pa = orderMap.has(`${a.categoria}::${a.sub}`) ? orderMap.get(`${a.categoria}::${a.sub}`)! : 9999;
      const pb = orderMap.has(`${b.categoria}::${b.sub}`) ? orderMap.get(`${b.categoria}::${b.sub}`)! : 9999;
      if (pa !== pb) return pa - pb;
      return a.sub.localeCompare(b.sub);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, subVersion, orderRows]);

  const getImage = (cat: EventCategory, sub: string): string | undefined => {
    const arr = subImages[subImgKey(cat, sub)];
    if (arr && arr.length) {
      const found = arr.find((u) => !!u);
      if (found) return found;
    }
    return catImages[cat];
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-[#151414]">
      <h2 className="text-xl font-bold mb-4 text-neutral-200 font-sans">Explorar</h2>
      <p className="text-sm text-neutral-400 mb-5">Navegue por subcategorias e descubra eventos.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(({ categoria, sub }) => {
          const img = getImage(categoria, sub);
          const color = categoryColors[categoria]?.vibrant || "#6366f1";
          return (
            <button
              key={`${categoria}::${sub}`}
              onClick={() => onSelectSubcategory(categoria, sub)}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-[#1c1c1c] text-left"
              style={{
                backgroundImage: img ? `url(${img})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!img && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${color}55, #1c1c1c)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/0" />
              <div className="absolute inset-0 flex flex-col justify-end p-3">
                <span className="text-[11px] font-medium uppercase tracking-wider opacity-80 text-white drop-shadow">
                  {categoryIcons[categoria]} {categoryLabels[categoria]}
                </span>
                <span className="text-base font-bold capitalize text-white drop-shadow leading-tight">
                  {sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {items.length === 0 && (
        <p className="text-center text-sm text-neutral-500 py-12">Nenhuma subcategoria disponível.</p>
      )}
    </div>
  );
};

export default ExplorePage;
