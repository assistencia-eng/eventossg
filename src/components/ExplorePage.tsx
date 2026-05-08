import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EventCategory, EventData, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { supabase } from "@/integrations/supabase/client";
import { useSubcategoryImages, subImgKey } from "@/hooks/useSubcategoryImages";
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
  resetSignal?: number;
}

type SubItem = { kind: "sub"; categoria: EventCategory; sub: string };
type KwItem = { kind: "kw"; keyword: string };
type Item = SubItem | KwItem;

const defaultCategories: EventCategory[] = [
  "musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas",
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const ExplorePage = ({ events, onSelectEvent, isFavorite, onToggleFavorite, isAdmin, categoryImagesMap, keywordImagesMap }: ExplorePageProps) => {
  const { images: subImages } = useSubcategoryImages();
  const { images: catImages } = useCategoryImages();
  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  const [orderRows, setOrderRows] = useState<Array<{ tipo?: string; categoria: string; subcategoria: string; position: number; hidden?: boolean }>>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    (supabase as any)
      .from("subcategory_order")
      .select("tipo, categoria, subcategoria, position, hidden")
      .then(({ data }: any) => {
        if (data) setOrderRows(data);
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

  // Build subcategory items + keyword items (only keywords with at least one image
  // OR explicitly declared by admin in keyword_images — already represented in keywordImagesMap)
  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    const subSeen = new Set<string>();
    categories.forEach((cat) => {
      (subcategoryOptions[cat] || []).forEach((sub) => {
        list.push({ kind: "sub", categoria: cat, sub });
        subSeen.add(norm(sub));
      });
    });

    // Keyword cards — exclude any keyword that already exists as a subcategory name
    // (subcategories already auto-derive their images via useKeywordImages, so the
    // sub card already represents that keyword visually).
    const kwMap = keywordImagesMap || {};
    Object.keys(kwMap).forEach((kw) => {
      const imgs = (kwMap[kw] || []).filter(Boolean);
      if (imgs.length === 0) return;
      if (subSeen.has(norm(kw))) return;
      list.push({ kind: "kw", keyword: kw });
    });

    const orderMap = new Map<string, number>();
    const hiddenSet = new Set<string>();
    orderRows.forEach((r) => {
      const tipo = r.tipo || "sub";
      const key = tipo === "kw" ? `kw::${r.subcategoria}` : `sub::${r.categoria}::${r.subcategoria}`;
      orderMap.set(key, r.position);
      if (r.hidden) hiddenSet.add(key);
    });
    const keyOf = (it: Item) =>
      it.kind === "sub" ? `sub::${it.categoria}::${it.sub}` : `kw::${it.keyword}`;
    return list
      .filter((it) => !hiddenSet.has(keyOf(it)))
      .sort((a, b) => {
        const pa = orderMap.has(keyOf(a)) ? orderMap.get(keyOf(a))! : 9999;
        const pb = orderMap.has(keyOf(b)) ? orderMap.get(keyOf(b))! : 9999;
        if (pa !== pb) return pa - pb;
        const la = a.kind === "sub" ? a.sub : a.keyword;
        const lb = b.kind === "sub" ? b.sub : b.keyword;
        return la.localeCompare(lb);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, subVersion, orderRows, keywordImagesMap]);

  const getSubImage = (cat: EventCategory, sub: string): string | undefined => {
    const arr = subImages[subImgKey(cat, sub)];
    if (arr && arr.length) {
      const found = arr.find((u) => !!u);
      if (found) return found;
    }
    return catImages[cat];
  };

  const getKwImage = (kw: string): string | undefined => {
    const arr = (keywordImagesMap || {})[kw.toLowerCase()] || (keywordImagesMap || {})[kw];
    if (!arr) return undefined;
    return arr.find((u) => !!u);
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

  // Selected state — list events
  if (selected) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const filtered = events
      .filter((e) => {
        if (selected.kind === "sub") {
          return e.subcategorias?.includes(selected.sub);
        }
        const target = norm(selected.keyword);
        return (e.keywords || []).some((k) => norm(k) === target);
      })
      .filter((e) => {
        const end = e.data_fim ? parseISO(e.data_fim) : parseISO(e.data);
        return end >= today;
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    const color =
      selected.kind === "sub"
        ? categoryColors[selected.categoria]?.vibrant || "#6366f1"
        : "#6366f1";

    const title = selected.kind === "sub" ? selected.sub : selected.keyword;
    const headerTag =
      selected.kind === "sub"
        ? `${categoryIcons[selected.categoria]} ${categoryLabels[selected.categoria]}`
        : "🏷️ Palavra-chave";

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
          <span className="text-[11px] uppercase tracking-wider text-neutral-400">{headerTag}</span>
          <h2 className="text-2xl font-bold text-neutral-100 capitalize font-sans" style={{ color }}>
            {title}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {filtered.length} evento{filtered.length !== 1 && "s"}
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-neutral-500 py-12">
            Nenhum evento {selected.kind === "kw" ? "com esta palavra-chave" : "nesta subcategoria"}.
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

  // Grid state
  return (
    <div className="container mx-auto px-4 py-6 bg-[#151414]">
      <h2 className="text-xl font-bold mb-4 text-neutral-200 font-sans">Explorar</h2>
      <p className="text-sm text-neutral-400 mb-5">
        Navegue por subcategorias e palavras-chave e descubra eventos.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => {
          const key = it.kind === "sub" ? `sub::${it.categoria}::${it.sub}` : `kw::${it.keyword}`;
          const label = it.kind === "sub" ? it.sub : it.keyword;
          const img = it.kind === "sub" ? getSubImage(it.categoria, it.sub) : getKwImage(it.keyword);
          const color =
            it.kind === "sub"
              ? categoryColors[it.categoria]?.vibrant || "#6366f1"
              : "#6366f1";
          return (
            <button
              key={key}
              onClick={() => setSelected(it)}
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
                  style={{ background: `linear-gradient(135deg, ${color}55, #1c1c1c)` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/0" />
              <div className="absolute inset-0 flex flex-col justify-end p-3">
                <span className="text-base font-bold capitalize text-white drop-shadow leading-tight">
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {items.length === 0 && (
        <p className="text-center text-sm text-neutral-500 py-12">Nenhum item disponível.</p>
      )}
    </div>
  );
};

export default ExplorePage;
