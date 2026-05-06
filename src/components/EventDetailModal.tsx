import { EventData, categoryLabels, categoryIcons } from "@/data/events";
import { formatRecurringDays } from "@/lib/recurrence";
import { categoryColors } from "@/data/categoryColors";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Star, Clock, Repeat, AlertTriangle, Pencil, Trash2, ArrowLeft, MapPin, CalendarDays } from "lucide-react";
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
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedEndDate = event.data_fim ? format(parseISO(event.data_fim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : null;
  const cats = event.categorias?.length ? event.categorias : [event.categoria];
  const subs = event.subcategorias && event.subcategorias.length > 0 ? event.subcategorias : [];
  const mainCat = cats[0];
  const catColor = categoryColors[mainCat]?.vibrant || '#444';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[400px] sm:max-w-md max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-3xl border-2 bg-[#1a1a1a]"
        style={{ borderColor: catColor }}
      >
        <DialogTitle className="sr-only">{event.nome}</DialogTitle>
        <DialogDescription className="sr-only">Detalhes do evento</DialogDescription>

        {/* Hero image with overlays */}
        <div className="relative w-full h-56">
          {event.imagem ? (
            <img src={event.imagem} alt={event.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${catColor}, #1a1a1a)` }} />
          )}
          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30" />

          {/* Top buttons */}
          <button
            onClick={onClose}
            aria-label="Voltar"
            className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
            <CalendarDays className="w-5 h-5" />
          </div>

          {/* Title overlaying image */}
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-lg font-sans">
              {event.nome}
            </h2>
          </div>
        </div>

        <div className="p-5 space-y-5 bg-[#1f1f1f]">
          {/* Subcategory cards */}
          {subs.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {subs.slice(0, 3).map((sub) => {
                const color = categoryColors[mainCat]?.vibrant || '#6366f1';
                return (
                  <div
                    key={sub}
                    className="rounded-2xl p-3 flex flex-col items-center justify-center text-center aspect-square"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-2xl mb-1">{categoryIcons[mainCat]}</span>
                    <span className="text-xs font-semibold text-white capitalize leading-tight line-clamp-2">
                      {sub}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Category chips (when no subs) */}
          {subs.length === 0 && (
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
          )}

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-[#2a2a2a] p-3">
              <div className="flex items-center gap-1.5 text-white text-sm font-semibold mb-0.5">
                <Calendar className="w-4 h-4" style={{ color: catColor }} />
                <span className="capitalize">{formattedDate}</span>
              </div>
              {formattedEndDate && (
                <p className="text-xs text-neutral-400 capitalize">até {formattedEndDate}</p>
              )}
              {event.horario && (
                <p className="text-xs text-neutral-300 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {event.horario}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-[#2a2a2a] p-3">
              <div className="flex items-start gap-1.5 text-white text-sm font-semibold mb-0.5">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: catColor }} />
                <span className="leading-tight line-clamp-2">
                  {event.local !== "Não informado" ? event.local : event.cidade}
                </span>
              </div>
              <p className="text-xs text-neutral-400 line-clamp-2">
                {event.endereco !== "Não informado" && `${event.endereco}, `}
                {event.cidade}
              </p>
            </div>
          </div>

          {event.is_recurring && event.recurring_days && event.recurring_days.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <Repeat className="w-4 h-4" style={{ color: catColor }} />
              <span>Recorrente: {formatRecurringDays(event.recurring_days)}</span>
            </div>
          )}

          {/* About section */}
          <div>
            <h4 className="font-semibold text-white mb-1.5 font-sans">Sobre o evento</h4>
            <p className="text-sm text-neutral-300 leading-relaxed">{event.descricao}</p>
          </div>

          {event.atracoes.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-2">Atrações</h4>
              <ul className="grid gap-2">
                {event.atracoes.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-neutral-300">
                    <Star className="w-4 h-4 shrink-0" style={{ color: catColor }} fill={catColor} />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contacts.length > 0 && <ContactsDisplay contacts={contacts} />}

          {/* Disclaimer */}
          <div className="rounded-xl bg-black/30 border border-white/5 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-400 leading-relaxed">
              Este evento pode sofrer alterações de data ou horário devido a condições climáticas ou fatores externos. Entre em contato com o administrador.
            </p>
          </div>

          {/* Admin actions */}
          {isAdmin && (onEdit || onDelete) && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              {onEdit && (
                <button
                  onClick={() => { onEdit(event); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  style={{ backgroundColor: `${catColor}33` }}
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { onDelete(event); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              )}
            </div>
          )}

          {/* Share */}
          <div className="pt-2 border-t border-white/10">
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
