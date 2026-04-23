import { EventData, categoryLabels, categoryIcons, weekDayLabels } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { Calendar, MapPin, Star, Repeat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { SubcategoryImageMap, subImgKey } from "@/hooks/useSubcategoryImages";
import { CategoryImageMap } from "@/hooks/useCategoryImages";
import { KeywordImageMap, pickKeywordImage, pickImageByEventKeywords } from "@/hooks/useKeywordImages";
import { useMemo } from "react";

interface EventCardProps {
  event: EventData;
  onSelect: (event: EventData) => void;
  index: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isAdmin?: boolean;
  subcategoryImages?: SubcategoryImageMap;
  categoryImages?: CategoryImageMap;
  keywordImages?: KeywordImageMap;
}

const categoryPlaceholders: Record<string, string> = {
  musica: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=200&fit=crop",
  esporte: "https://images.unsplash.com/photo-1461896836934-bd45ba24e308?w=400&h=200&fit=crop",
  alimentacao: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop",
  entretenimento: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=200&fit=crop",
  palestras: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=200&fit=crop",
  feiras: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=200&fit=crop",
  festas: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=200&fit=crop",
};

// Deterministic but varied image selection based on event id
function pickSubcategoryImage(
  event: EventData,
  subcategoryImages?: SubcategoryImageMap
): string | undefined {
  if (!subcategoryImages || !event.subcategorias?.length) return undefined;
  // Prefer the event's own categories so we get the right image when a
  // subcategory name (e.g. "tecnologia") exists in multiple categories.
  const cats = event.categorias?.length ? event.categorias : [event.categoria];
  for (const sub of event.subcategorias) {
    let imgs: string[] | undefined;
    for (const cat of cats) {
      const candidate = subcategoryImages[subImgKey(cat, sub)];
      if (candidate && candidate.length > 0) {
        imgs = candidate;
        break;
      }
    }
    if (imgs && imgs.length > 0) {
      // If admin manually selected an image index (1-based), respect it
      const manualIdx = event.subcategory_image_index;
      if (manualIdx && manualIdx >= 1 && manualIdx <= imgs.length) {
        return imgs[manualIdx - 1];
      }
      // Otherwise auto-pick deterministically based on event id
      let hash = 0;
      for (let i = 0; i < event.id.length; i++) {
        hash = ((hash << 5) - hash + event.id.charCodeAt(i)) | 0;
      }
      return imgs[Math.abs(hash) % imgs.length];
    }
  }
  return undefined;
}

const EventCard = ({ event, onSelect, index, selected, onToggleSelect, isFavorite, onToggleFavorite, isAdmin, subcategoryImages, categoryImages, keywordImages }: EventCardProps) => {
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM, yyyy", { locale: ptBR });
  const formattedEndDate = event.data_fim ? format(parseISO(event.data_fim), "dd 'de' MMMM, yyyy", { locale: ptBR }) : null;
  const mainCat = event.categorias?.[0] || event.categoria;
  const catColor = categoryColors[mainCat]?.vibrant || '#444';

  const kwTagImg = useMemo(() => pickImageByEventKeywords(event.keywords, keywordImages, event.id), [event.keywords, event.id, keywordImages]);
  const kwImg = useMemo(() => pickKeywordImage(event.nome, keywordImages, event.id), [event.nome, event.id, keywordImages]);
  const subImg = useMemo(() => pickSubcategoryImage(event, subcategoryImages), [event, subcategoryImages]);
  // Fallback: event image -> explicit event keyword tag image -> title-scanned keyword -> subcategory -> category -> placeholder
  const cats = event.categorias?.length ? event.categorias : [event.categoria];
  let catImg: string | undefined;
  if (categoryImages) {
    for (const c of cats) {
      if (categoryImages[c]) { catImg = categoryImages[c]; break; }
    }
  }
  const imgSrc = event.imagem || kwTagImg || kwImg || subImg || catImg || categoryPlaceholders[mainCat] || categoryPlaceholders.entretenimento;

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer group animate-fade-in-up relative border bg-[#1c1c1c] shadow-md shadow-black/30 hover:shadow-xl hover:shadow-black/40 ${selected ? "ring-2 ring-primary" : ""}`}
      style={{ animationDelay: `${index * 80}ms`, borderColor: catColor }}
      onClick={() => onSelect(event)}
    >
      {/* Image section */}
      <div className="relative w-full h-[120px] overflow-hidden">
        <img
          src={imgSrc}
          alt={event.nome}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#1c1c1c] to-transparent" />

        {/* Category chips top-right */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {(event.categorias?.length ? event.categorias : [event.categoria]).slice(0, 3).map((cat) => {
            const colors = categoryColors[cat];
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium leading-none whitespace-nowrap backdrop-blur-sm"
                style={{
                  backgroundColor: (colors?.muted || '#2a2a2a') + 'cc',
                  color: colors?.vibrant || '#ccc',
                }}
              >
                <span className="text-[10px]">{categoryIcons[cat]}</span>
                {categoryLabels[cat]}
              </span>
            );
          })}
        </div>

        {/* Admin checkbox top-left */}
        {isAdmin && onToggleSelect && (
          <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(event.id)} className="border-neutral-400 data-[state=checked]:bg-primary" />
          </div>
        )}
      </div>

      {/* Color bar */}
      <div className="h-1 w-full" style={{ backgroundColor: catColor }} />

      {/* Content */}
      <div className="p-4 pr-12 space-y-2.5">
        <h3 className="font-bold text-base leading-snug line-clamp-2 font-sans text-neutral-100">
          {event.nome}
        </h3>

        {event.is_recurring && event.recurring_days && event.recurring_days.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Repeat className="w-3 h-3" />
            <span>{event.recurring_days.map(d => weekDayLabels[d] || d).join(", ")}</span>
          </div>
        )}

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-neutral-300 text-xs">
              {formattedDate}
              {formattedEndDate && ` — ${formattedEndDate}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-neutral-400 text-xs truncate">
              {event.local !== "Não informado" ? `${event.local} — ` : ""}{event.cidade}
            </span>
          </div>
        </div>
      </div>

      {/* Favorite star */}
      {onToggleFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(event.id); }}
          className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            isFavorite
              ? "text-amber-500 hover:text-amber-600"
              : "text-neutral-500 hover:text-amber-500"
          }`}
          title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
        >
          <Star className="w-4.5 h-4.5" fill={isFavorite ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
};

export default EventCard;
