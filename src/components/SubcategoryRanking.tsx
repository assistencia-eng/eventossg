import { useEffect, useMemo, useState } from "react";
import { EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { supabase } from "@/integrations/supabase/client";
import AdminSection from "@/components/AdminSection";
import { useCategoriesVersion, getCustomCategoryKeys, getRemovedDefaultCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import { useKeywordImages } from "@/hooks/useKeywordImages";
import { ListOrdered, GripVertical, Tag, EyeOff, Eye, Plus } from "lucide-react";
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
  id: string;
  kind: "sub" | "kw";
  categoria?: EventCategory;
  sub?: string;
  keyword?: string;
  hidden?: boolean;
}

const SortableRow = ({ item, onToggleHidden }: { item: Item; onToggleHidden: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : item.hidden ? 0.4 : 1,
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
          <span className="text-xs text-neutral-500 ml-2">{categoryLabels[item.categoria!]}</span>
        </>
      ) : (
        <>
          <Tag className="w-4 h-4 text-amber-400" />
          <span className="text-sm capitalize text-neutral-200">{item.keyword}</span>
          <span className="text-xs text-neutral-500 ml-2">Palavra-chave</span>
        </>
      )}
      <button
        onClick={() => onToggleHidden(item.id)}
        className="ml-auto text-neutral-400 hover:text-white p-1"
        title={item.hidden ? "Mostrar no Explorar" : "Ocultar do Explorar"}
        aria-label={item.hidden ? "Mostrar" : "Ocultar"}
      >
        {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
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
  const [addType, setAddType] = useState<"sub" | "kw">("sub");
  const [addCat, setAddCat] = useState<EventCategory | "">("");
  const [addSub, setAddSub] = useState("");
  const [addKw, setAddKw] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const allCats = useMemo<EventCategory[]>(() => {
    const customs = getCustomCategoryKeys();
    const removed = new Set(getRemovedDefaultCategoryKeys());
    return [
      ...defaultCategories.filter((c) => !removed.has(c)),
      ...customs.filter((c) => !defaultCategories.includes(c)),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catVersion]);

  const allItems = useMemo<Item[]>(() => {
    const list: Item[] = [];
    const subSeen = new Set<string>();
    allCats.forEach((cat) => {
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
  }, [allCats, subVersion, keywordImages]);

  useEffect(() => {
    if (!expanded) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("subcategory_order")
        .select("tipo, categoria, subcategoria, position, hidden")
        .order("position", { ascending: true });
      const positionMap = new Map<string, number>();
      const hiddenMap = new Map<string, boolean>();
      (data || []).forEach((r: any) => {
        const tipo = r.tipo || "sub";
        const id = tipo === "kw" ? `kw::${r.subcategoria}` : `sub::${r.categoria}::${r.subcategoria}`;
        positionMap.set(id, r.position);
        hiddenMap.set(id, !!r.hidden);
      });
      const sorted = [...allItems]
        .map((i) => ({ ...i, hidden: hiddenMap.get(i.id) || false }))
        .sort((a, b) => {
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

  const toggleHidden = (id: string) => {
    setOrder((prev) => prev.map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i)));
  };

  const handleAddSub = async () => {
    if (!addCat || !addSub.trim()) {
      toast.error("Selecione categoria e digite o nome.");
      return;
    }
    const sub = addSub.trim();
    const exists = (subcategoryOptions[addCat] || []).includes(sub);
    if (!exists) {
      const { error } = await supabase
        .from("custom_subcategories")
        .insert({ categoria: addCat, subcategoria: sub });
      if (error) {
        toast.error("Erro ao criar: " + error.message);
        return;
      }
    }
    const id = `sub::${addCat}::${sub}`;
    setOrder((prev) => (prev.some((i) => i.id === id) ? prev : [...prev, { id, kind: "sub", categoria: addCat, sub }]));
    setAddSub("");
    toast.success(`"${sub}" adicionada ao ranking.`);
  };

  const handleAddKw = () => {
    const kw = addKw.trim().toLowerCase();
    if (!kw) return;
    const id = `kw::${kw}`;
    setOrder((prev) => (prev.some((i) => i.id === id) ? prev : [...prev, { id, kind: "kw", keyword: kw }]));
    setAddKw("");
    toast.success(`"${kw}" adicionada ao ranking. Salve para persistir.`);
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
              hidden: !!item.hidden,
            }
          : {
              tipo: "kw",
              categoria: "_keyword_",
              subcategoria: item.keyword!,
              position: index,
              hidden: !!item.hidden,
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
      count={order.length}
    >
      <p className="text-xs text-neutral-500 mb-3">
        Arraste para reordenar. Use 👁️ para ocultar do Explorar (sem excluir do banco). Adicione subcategorias ou palavras-chave abaixo.
      </p>

      {/* Add panel */}
      <div className="mb-3 p-3 rounded-lg bg-[#161616] border border-border space-y-2">
        <div className="flex gap-1.5 text-xs">
          <button
            onClick={() => setAddType("sub")}
            className={`px-3 py-1 rounded ${addType === "sub" ? "bg-primary text-primary-foreground" : "bg-[#222] text-neutral-300"}`}
          >
            Subcategoria
          </button>
          <button
            onClick={() => setAddType("kw")}
            className={`px-3 py-1 rounded ${addType === "kw" ? "bg-primary text-primary-foreground" : "bg-[#222] text-neutral-300"}`}
          >
            Palavra-chave
          </button>
        </div>
        {addType === "sub" ? (
          <div className="flex gap-1.5">
            <select
              value={addCat}
              onChange={(e) => setAddCat(e.target.value as EventCategory)}
              className="bg-[#1c1c1c] border border-border text-sm text-neutral-200 rounded px-2 py-1 flex-1"
            >
              <option value="">Categoria...</option>
              {allCats.map((c) => (
                <option key={c} value={c}>{categoryLabels[c]}</option>
              ))}
            </select>
            <input
              value={addSub}
              onChange={(e) => setAddSub(e.target.value)}
              placeholder="Nome da subcategoria"
              className="bg-[#1c1c1c] border border-border text-sm text-neutral-200 rounded px-2 py-1 flex-1"
            />
            <button onClick={handleAddSub} className="bg-primary text-primary-foreground rounded px-3 text-sm flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <input
              value={addKw}
              onChange={(e) => setAddKw(e.target.value)}
              placeholder="Palavra-chave"
              className="bg-[#1c1c1c] border border-border text-sm text-neutral-200 rounded px-2 py-1 flex-1"
            />
            <button onClick={handleAddKw} className="bg-primary text-primary-foreground rounded px-3 text-sm flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {order.map((item) => (
              <SortableRow key={item.id} item={item} onToggleHidden={toggleHidden} />
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
