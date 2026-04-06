import { EventData, categoryLabels, categoryIcons } from "@/data/events";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, MapPin, Star } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventDetailModalProps {
  event: EventData | null;
  open: boolean;
  onClose: () => void;
  distance?: number | null;
}

const EventDetailModal = ({ event, open, onClose, distance }: EventDetailModalProps) => {
  if (!event) return null;
  const formattedDate = format(parseISO(event.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Cover image */}
        {event.imagem && (
          <div className="w-full h-48 overflow-hidden">
            <img src={event.imagem} alt={event.nome} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Category bar */}
        <div className={`h-2 category-chip-${event.categoria} active w-full rounded-none border-0`} />

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-2">
            <div className={`category-chip category-chip-${event.categoria} text-xs inline-flex w-fit`}>
              {categoryIcons[event.categoria]} {categoryLabels[event.categoria]}
            </div>
            <DialogTitle className="text-2xl font-serif font-bold leading-snug">
              {event.nome}
            </DialogTitle>
            <DialogDescription className="sr-only">Detalhes do evento {event.nome}</DialogDescription>
          </DialogHeader>

          {/* Info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="capitalize font-medium">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span>{event.local}, {event.endereco} — {event.cidade}</span>
            </div>
            {distance != null && event.hasExactLocation !== false ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-medium">
                📍 {distance.toFixed(1)} km de distância
              </div>
            ) : event.hasExactLocation === false ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                📍 Localização aproximada — {event.cidade}
              </div>
            ) : null}
          </div>

          {/* Description */}
          <div>
            <h4 className="font-semibold text-foreground mb-1">Sobre o evento</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{event.descricao}</p>
          </div>

          {/* Atrações */}
          {event.atracoes.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2">Atrações</h4>
              <ul className="grid gap-1.5">
                {event.atracoes.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-3.5 h-3.5 text-amber" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Map placeholder */}
          <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground border border-border">
            <MapPin className="w-6 h-6 mx-auto mb-1 text-accent" />
            {event.hasExactLocation !== false ? (
              <>
                Integração com mapa em breve
                <br />
                <span className="text-xs">Lat: {event.latitude.toFixed(4)}, Lng: {event.longitude.toFixed(4)}</span>
              </>
            ) : (
              <span className="text-xs">Localização aproximada — coordenadas da cidade</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailModal;
