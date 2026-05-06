import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EventCategory, EventData, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { supabase } from "@/integrations/supabase/client";
import { useSubcategoryImages, subImgKey, SubcategoryImageMap } from "@/hooks/useSubcategoryImages";
import { useCategoryImages } from "@/hooks/useCategoryImages";
import { useCategoriesVersion, getCustomCategoryKeys, getRemovedDefaultCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import EventCard from "@/components/EventCard";
import { parseISO } from "date-fns";

interface ExplorePageProps {
  events: EventData[];
  onSelectEvent: (event: EventData) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  isAdmin?: boolean;
  categoryImagesMap?: Record<string, string>;
  keywordImagesMap?: Record<string, (string | undefined)[]>;
}

interface SubItem {
  categoria: EventCategory;
  sub: string;
}

const defaultCategories: EventCategory[] = [
  "musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas",
];

const ExplorePage = ({ events, onSelectEvent, isFavorite, onToggleFavorite, isAdmin, categoryImagesMap, keywordImagesMap }: ExplorePageProps) => {
  const { images: subImages } = useSubcategoryImages();
  const { images: catImages } = useCategoryImages();
  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  const [orderRows, setOrderRows] = useState<Array<{ categoria: string; subcategoria: string; position: number }>>([]);
  const [selected, setSelected] = useState<SubItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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

  const handleBack = () => {
    setSelected(null);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!selected) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!selected || !touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (dx > 80 && Math.abs(dy) < 60) handleBack();
  };

  // Estado 2: lista de eventos da subcategoria selecionada
  if (selected) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const filtered = events
      .filter((e) => e.subcategorias?.includes(selected.sub))
      .filter((e) => {
        const end = e.data_fim ? parseISO(e.data_fim) : parseISO(e.data);
        return end >= today;
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    const color = categoryColors[selected.categoria]?.vibrant || "#6366f1";

    return (
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="container mx-auto px-4 py-4 bg-[#151414] min-h-screen"
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-neutral-200 hover:text-white py-2 mb-3"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Voltar</span>
        </button>

        <div className="mb-5">
          <span className="text-[11px] uppercase tracking-wider text-neutral-400">
            {categoryIcons[selected.categoria]} {categoryLabels[selected.categoria]}
          </span>
          <h2 className="text-2xl font-bold text-neutral-100 capitalize font-sans" style={{ color }}>
            {selected.sub}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {filtered.length} evento{filtered.length !== 1 && "s"}
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 py-12">
            Nenhum evento nesta subcategoria.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={onSelectEvent}
                index={i}
                isFavorite={isFavorite(event.id)}
                onToggleFavorite={onToggleFavorite}
                isAdmin={isAdmin}
                subcategoryImages={subImages}
                categoryImages={categoryImagesMap || {}}
                keywordImages={keywordImagesMap || {}}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Estado 1: grid de subcategorias
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
              onClick={() => setSelected({ categoria, sub })}
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
