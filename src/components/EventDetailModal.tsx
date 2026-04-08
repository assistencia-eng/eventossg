import { EventData, categoryLabels, categoryIcons } from "@/data/events";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Star } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ShareButton from "@/components/ShareButton";

interface EventDetailModalProps {
  event: EventData | null;
  open: boolean;
  onClose: () => void;
}

const EventDetailModal = ({ event, open, onClose }: EventDetailModalProps) => {
  if (!event) return null;
  const formattedDate = format(parseISO(event.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedEndDate = event.data_fim ? format(parseISO(event.data_fim), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : null;
  const cats = event.categorias?.length ? event.categorias : [event.categoria];
  const mainCat = cats[0];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {event.imagem && (
          <div className="w-full h-48 overflow-hidden">
            <img src={event.imagem} alt={event.nome} className="w-full h-full object-cover" />
          </div>
        )}

        <div className={`h-2 category-chip-${mainCat} active w-full rounded-none border-0`} />

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {cats.map((cat) => (
                <span key={cat} className={`category-chip category-chip-${cat} text-xs inline-flex`}>
                  {categoryIcons[cat]} {categoryLabels[cat]}
                </span>
              ))}
            </div>
            <DialogTitle className="text-2xl font-serif font-bold leading-snug">
              {event.nome}
            </DialogTitle>
            <DialogDescription className="sr-only">Detalhes do evento {event.nome}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="capitalize font-medium">
                {formattedDate}
                {formattedEndDate && <><br />até {formattedEndDate}</>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {event.local !== "Não informado" && `${event.local}, `}
                {event.endereco !== "Não informado" && `${event.endereco} — `}
                {event.cidade}
              </span>
            </div>
          </div>

          {/* Subcategories */}
          {event.subcategorias && event.subcategorias.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-2 text-sm">Subcategorias</h4>
              <div className="flex flex-wrap gap-1.5">
                {event.subcategorias.map((sub) => (
                  <span key={sub} className="px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground border border-border">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-foreground mb-1">Sobre o evento</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{event.descricao}</p>
          </div>

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

          {/* Share */}
          <div className="pt-2 border-t border-border">
            <ShareButton
              title={event.nome}
              text={`${formattedDate} — ${event.cidade}`}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailModal;
