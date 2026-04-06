import { EventData, categoryLabels, categoryIcons } from "@/data/events";
import { Calendar, MapPin, ChevronRight, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventCardProps {
  event: EventData;
  distance?: number | null;
  onSelect: (event: EventData) => void;
  onDelete?: (event: EventData) => void;
  index: number;
  showApproxLocation?: boolean;
}

const EventCard = ({ event, distance, onSelect, onDelete, index, showApproxLocation }: EventCardProps) => {
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM, yyyy", { locale: ptBR });

  return (
    <div
      className="glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => onSelect(event)}
    >
      {/* Category bar */}
      <div className={`h-1.5 category-chip-${event.categoria} active w-full rounded-none border-0`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <span className={`category-chip category-chip-${event.categoria} text-xs mb-2 inline-flex`}>
              {categoryIcons[event.categoria]} {categoryLabels[event.categoria]}
            </span>
            <h3 className="text-lg font-serif font-bold text-foreground leading-snug mt-1">
              {event.nome}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
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

        {/* Info */}
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            <span>{event.local} — {event.cidade}</span>
          </div>
          {distance != null && event.hasExactLocation !== false ? (
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-medium">
              📍 {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)} km`}
            </div>
          ) : event.hasExactLocation === false ? (
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
              📍 Localização aproximada
            </div>
          ) : null}
        </div>

        {/* Excerpt */}
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{event.descricao}</p>
      </div>
    </div>
  );
};

export default EventCard;
