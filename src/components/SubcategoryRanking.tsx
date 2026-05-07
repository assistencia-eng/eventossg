import { useEffect, useMemo, useState } from "react";
import { EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { supabase } from "@/integrations/supabase/client";
import AdminSection from "@/components/AdminSection";
import { useCategoriesVersion, getCustomCategoryKeys, getRemovedDefaultCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import { useKeywordImages } from "@/hooks/useKeywordImages";
import { ListOrdered, GripVertical, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const defaultCategories: EventCategory[] = [
  "musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas",
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

interface Item {
  id: string; // unique
  kind: "sub" | "kw";
  categoria?: EventCategory;
  sub?: string;
  keyword?: string;
}

const SortableRow = ({ item }: { item: Item }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1c1c1c] border border-border"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing text-neutral-500"
        aria-label="Arrastar"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {item.kind === "sub" ? (
        <>
          <span className="text-base">{categoryIcons[item.categoria!]}</span>
          <span className="text-sm capitalize text-neutral-200">{item.sub}</span>
          <span className="text-xs text-neutral-500 ml-auto">{categoryLabels[item.categoria!]}</span>
        </>
      ) : (
        <>
          <Tag className="w-4 h-4 text-amber-400" />
          <span className="text-sm capitalize text-neutral-200">{item.keyword}</span>
          <span className="text-xs text-neutral-500 ml-auto">Palavra-chave</span>
        </>
      )}
    </div>
  );
};

const SubcategoryRanking = () => {
  const [expanded, setExpanded] = useState(false);
  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  const { images: keywordImages } = useKeywordImages();
  const [order, setOrder] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const allItems = useMemo<Item[]>(() => {
    const customs = getCustomCategoryKeys();
    const removed = new Set(getRemovedDefaultCategoryKeys());
    const cats: EventCategory[] = [
      ...defaultCategories.filter((c) => !removed.has(c)),
      ...customs.filter((c) => !defaultCategories.includes(c)),
    ];
    const list: Item[] = [];
    const subSeen = new Set<string>();
    cats.forEach((cat) => {
      (subcategoryOptions[cat] || []).forEach((sub) => {
        list.push({ id: `sub::${cat}::${sub}`, kind: "sub", categoria: cat, sub });
        subSeen.add(norm(sub));
      });
    });
    Object.keys(keywordImages || {}).forEach((kw) => {
      const imgs = (keywordImages[kw] || []).filter(Boolean);
      if (imgs.length === 0) return;
      if (subSeen.has(norm(kw))) return;
      list.push({ id: `kw::${kw}`, kind: "kw", keyword: kw });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catVersion, subVersion, keywordImages]);

  useEffect(() => {
    if (!expanded) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("subcategory_order")
        .select("tipo, categoria, subcategoria, position")
        .order("position", { ascending: true });
      const positionMap = new Map<string, number>();
      (data || []).forEach((r: any) => {
        const tipo = r.tipo || "sub";
        const id =
          tipo === "kw" ? `kw::${r.subcategoria}` : `sub::${r.categoria}::${r.subcategoria}`;
        positionMap.set(id, r.position);
      });
      const sorted = [...allItems].sort((a, b) => {
        const pa = positionMap.has(a.id) ? positionMap.get(a.id)! : 9999;
        const pb = positionMap.has(b.id) ? positionMap.get(b.id)! : 9999;
        if (pa !== pb) return pa - pb;
        const la = a.sub || a.keyword || "";
        const lb = b.sub || b.keyword || "";
        return la.localeCompare(lb);
      });
      setOrder(sorted);
    })();
  }, [expanded, allItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((i) => i.id === active.id);
    const newIndex = order.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setOrder((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = order.map((item, index) =>
        item.kind === "sub"
          ? {
              tipo: "sub",
              categoria: item.categoria!,
              subcategoria: item.sub!,
              position: index,
            }
          : {
              tipo: "kw",
              categoria: "_keyword_",
              subcategoria: item.keyword!,
              position: index,
            }
      );
      await supabase.from("subcategory_order").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await (supabase as any).from("subcategory_order").insert(rows);
      if (error) throw error;
      toast.success("Ordem salva!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminSection
      title="Ranking híbrido (Explorar)"
      icon={<ListOrdered className="w-5 h-5" />}
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      count={allItems.length}
    >
      <p className="text-xs text-neutral-500 mb-3">
        Arraste para reordenar a exibição na aba Explorar. Inclui subcategorias e palavras-chave com imagens.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {order.map((item) => (
              <SortableRow key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar ordem"}
        </button>
      </div>
    </AdminSection>
  );
};

export default SubcategoryRanking;
