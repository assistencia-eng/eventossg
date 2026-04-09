import { EventData, categoryLabels, categoryIcons } from "@/data/events";
import { Calendar, ChevronRight, Trash2, Pencil, Star } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

interface EventCardProps {
  event: EventData;
  onSelect: (event: EventData) => void;
  onDelete?: (event: EventData) => void;
  onEdit?: (event: EventData) => void;
  index: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const EventCard = ({ event, onSelect, onDelete, onEdit, index, selected, onToggleSelect, isFavorite, onToggleFavorite }: EventCardProps) => {
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM, yyyy", { locale: ptBR });
  const formattedEndDate = event.data_fim ? format(parseISO(event.data_fim), "dd 'de' MMMM, yyyy", { locale: ptBR }) : null;
  const mainCat = event.categorias?.[0] || event.categoria;

  return (
    <div
      className={`glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group animate-fade-in-up ${selected ? "ring-2 ring-primary" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => onSelect(event)}
    >
      <div className={`h-1.5 category-chip-${mainCat} active w-full rounded-none border-0`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1">
            {onToggleSelect && (
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(event.id)} />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-serif font-bold text-foreground leading-snug">
                {event.nome}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(event.id); }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  isFavorite
                    ? "text-amber-500 hover:text-amber-600"
                    : "text-muted-foreground hover:text-amber-500"
                }`}
                title={isFavorite ? "Remover dos favoritos" : "Favoritar"}
              >
                <Star className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                title="Editar evento"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(event); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                title="Excluir evento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">
              {formattedDate}
              {formattedEndDate && ` — ${formattedEndDate}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{event.local !== "Não informado" ? `${event.local} — ` : ""}{event.cidade}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
