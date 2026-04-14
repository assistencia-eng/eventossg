import { EventData, categoryLabels, categoryIcons, weekDayLabels } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { Calendar, Star, Clock, Repeat } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { useRef, useEffect, useState } from "react";

interface EventCardProps {
  event: EventData;
  onSelect: (event: EventData) => void;
  index: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isAdmin?: boolean;
}

const EventCard = ({ event, onSelect, index, selected, onToggleSelect, isFavorite, onToggleFavorite, isAdmin }: EventCardProps) => {
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM, yyyy", { locale: ptBR });
  const formattedEndDate = event.data_fim ? format(parseISO(event.data_fim), "dd 'de' MMMM, yyyy", { locale: ptBR }) : null;
  const mainCat = event.categorias?.[0] || event.categoria;
  const catColor = categoryColors[mainCat]?.vibrant || '#444';

  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleFontSize, setTitleFontSize] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    // Reset to measure naturally
    el.style.fontSize = '';
    const maxHeight = parseFloat(getComputedStyle(el).lineHeight) * 2 + 2; // 2 lines
    let size = 18; // start at base size (text-lg ≈ 18px)
    while (el.scrollHeight > maxHeight && size > 11) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
    setTitleFontSize(size < 18 ? size : undefined);
  }, [event.nome]);

  return (
    <div
      className={`rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group animate-fade-in-up relative border ${selected ? "ring-2 ring-primary" : ""}`}
      style={{ animationDelay: `${index * 80}ms`, borderColor: catColor }}
      onClick={() => onSelect(event)}
    >
      <div
        className="h-1.5 w-full rounded-none border-0"
        style={{ backgroundColor: catColor }}
      />

      <div className="p-4 sm:p-5 bg-[#1c1c1c]">
        <div className="flex items-start gap-2 mb-3">
          {isAdmin && onToggleSelect && (
            <div className="pt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(event.id)} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 ref={titleRef} className="font-bold leading-snug line-clamp-2 font-sans text-neutral-200 text-left" style={titleFontSize ? { fontSize: `${titleFontSize}px` } : { fontSize: '18px' }}>
                  {event.nome}
                </h3>
                {event.is_recurring && event.recurring_days && event.recurring_days.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                    <Repeat className="w-3 h-3" />
                    <span>{event.recurring_days.map(d => weekDayLabels[d] || d).join(", ")}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {(event.categorias?.length ? event.categorias : [event.categoria]).slice(0, 3).map((cat) => {
                  const colors = categoryColors[cat];
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium leading-none whitespace-nowrap"
                      style={{
                        backgroundColor: colors?.muted || '#2a2a2a',
                        color: colors?.vibrant || '#ccc',
                      }}
                    >
                      <span className="text-[10px]">{categoryIcons[cat]}</span>
                      {categoryLabels[cat]}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground pr-10">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-sm text-neutral-300">
              {formattedDate}
              {formattedEndDate && ` — ${formattedEndDate}`}
            </span>
          </div>
          {event.horario && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-sm text-neutral-300">{event.horario}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm truncate text-neutral-400">{event.local !== "Não informado" ? `${event.local} — ` : ""}{event.cidade}</span>
          </div>
        </div>

        {/* Favorite star - bottom right */}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(event.id); }}
            className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isFavorite
                ? "text-amber-500 hover:text-amber-600"
                : "text-muted-foreground hover:text-amber-500"
            }`}
            title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
          >
            <Star className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
          </button>
        )}
      </div>
    </div>
  );
};

export default EventCard;
