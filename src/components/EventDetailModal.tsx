import { EventData, categoryLabels, categoryIcons } from "@/data/events";
import { formatRecurringDays } from "@/lib/recurrence";
import { categoryColors } from "@/data/categoryColors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Star, Clock, Repeat, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ShareButton from "@/components/ShareButton";
import ContactsDisplay from "@/components/ContactsDisplay";
import { useEventContacts } from "@/hooks/useEventContacts";

interface EventDetailModalProps {
  event: EventData | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: EventData) => void;
  onDelete?: (event: EventData) => void;
  isAdmin?: boolean;
}

const EventDetailModal = ({ event, open, onClose, onEdit, onDelete, isAdmin }: EventDetailModalProps) => {
  const { contacts } = useEventContacts(event?.id, event?.venue_id, event?.custom_contacts);
  if (!event) return null;
  const formattedDate = format(parseISO(event.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedEndDate = event.data_fim ? format(parseISO(event.data_fim), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : null;
  const cats = event.categorias?.length ? event.categorias : [event.categoria];
  const mainCat = cats[0];
  const catColor = categoryColors[mainCat]?.vibrant || '#444';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[340px] sm:max-w-sm max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-2xl border-2"
        style={{ borderColor: catColor }}
      >
        {event.imagem && (
          <div className="w-full h-48 overflow-hidden">
            <img src={event.imagem} alt={event.nome} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="h-2 w-full rounded-none border-0" style={{ backgroundColor: catColor }} />

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {cats.map((cat) => {
                const colors = categoryColors[cat];
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: colors?.muted || '#2a2a2a',
                      color: colors?.vibrant || '#ccc',
                    }}
                  >
                    {categoryIcons[cat]} {categoryLabels[cat]}
                  </span>
                );
              })}
            </div>
            <DialogTitle className="text-2xl font-bold leading-snug font-sans">
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
            {event.horario && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">{event.horario}</span>
              </div>
            )}
            {event.is_recurring && event.recurring_days && event.recurring_days.length > 0 && (
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  Recorrente: {formatRecurringDays(event.recurring_days)}
                </span>
              </div>
            )}
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
            <h4 className="font-semibold text-foreground mb-1 font-sans">Sobre o evento</h4>
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

          {/* Disclaimer */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este evento pode sofrer alterações de data ou horário devido a condições climáticas ou fatores externos. Entre em contato com o administrador.
            </p>
          </div>

          {/* Admin actions */}
          {isAdmin && (onEdit || onDelete) && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              {onEdit && (
                <button
                  onClick={() => { onEdit(event); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { onDelete(event); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              )}
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
