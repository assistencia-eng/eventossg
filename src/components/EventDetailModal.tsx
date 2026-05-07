import { useMemo } from "react";
import { EventData, categoryLabels, categoryIcons } from "@/data/events";
import { formatRecurringDays } from "@/lib/recurrence";
import { categoryColors } from "@/data/categoryColors";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Star, Clock, Repeat, AlertTriangle, Pencil, Trash2, ArrowLeft, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ShareButton from "@/components/ShareButton";
import ContactsDisplay from "@/components/ContactsDisplay";
import { useEventContacts } from "@/hooks/useEventContacts";
import { SubcategoryImageMap, subImgKey } from "@/hooks/useSubcategoryImages";
import { CategoryImageMap } from "@/hooks/useCategoryImages";
import { KeywordImageMap, pickKeywordImage, pickImageByEventKeywords } from "@/hooks/useKeywordImages";

interface EventDetailModalProps {
  event: EventData | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: EventData) => void;
  onDelete?: (event: EventData) => void;
  isAdmin?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  subcategoryImages?: SubcategoryImageMap;
  categoryImages?: CategoryImageMap;
  keywordImages?: KeywordImageMap;
}

function pickSubImg(event: EventData, map?: SubcategoryImageMap): string | undefined {
  if (!map || !event.subcategorias?.length) return undefined;
  const cats = event.categorias?.length ? event.categorias : [event.categoria];
  for (const sub of event.subcategorias) {
    let imgs: (string | undefined)[] | undefined;
    for (const cat of cats) {
      const c = map[subImgKey(cat, sub)];
      if (c && c.length > 0) { imgs = c; break; }
    }
    if (imgs && imgs.length > 0) {
      const manualIdx = event.subcategory_image_index;
      if (manualIdx && manualIdx >= 1 && manualIdx <= imgs.length && imgs[manualIdx - 1]) return imgs[manualIdx - 1];
      let hash = 0;
      for (let i = 0; i < event.id.length; i++) hash = ((hash << 5) - hash + event.id.charCodeAt(i)) | 0;
      const filtered = imgs.filter(Boolean) as string[];
      if (filtered.length) return filtered[Math.abs(hash) % filtered.length];
    }
  }
  return undefined;
}

const EventDetailModal = ({ event, open, onClose, onEdit, onDelete, isAdmin, isFavorite, onToggleFavorite, subcategoryImages, categoryImages, keywordImages }: EventDetailModalProps) => {
  const { contacts } = useEventContacts(event?.id, event?.venue_id, event?.custom_contacts);

  const fallbackImg = useMemo(() => {
    if (!event) return undefined;
    const subImg = pickSubImg(event, subcategoryImages);
    const kwTagImg = pickImageByEventKeywords(event.keywords, keywordImages, event.id);
    const kwImg = pickKeywordImage(event.nome, keywordImages, event.id);
    const cats = event.categorias?.length ? event.categorias : [event.categoria];
    let catImg: string | undefined;
    if (categoryImages) for (const c of cats) if (categoryImages[c]) { catImg = categoryImages[c]; break; }
    return kwTagImg || kwImg || subImg || catImg;
  }, [event, subcategoryImages, categoryImages, keywordImages]);

  if (!event) return null;
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedEndDate = event.data_fim ? format(parseISO(event.data_fim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : null;
  const cats = event.categorias?.length ? event.categorias : [event.categoria];
  const subs = event.subcategorias && event.subcategorias.length > 0 ? event.subcategorias : [];
  const mainCat = cats[0];
  const catColor = categoryColors[mainCat]?.vibrant || '#444';
  const heroImg = event.imagem || fallbackImg;

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
          {heroImg ? (
            <img src={heroImg} alt={event.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${catColor}, #1a1a1a)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30" />

          <button
            onClick={onClose}
            aria-label="Voltar"
            className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(event.id)}
              aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar"}
              className={`absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 active:scale-90 transition-all duration-200 ${
                isFavorite ? "text-amber-500 hover:text-amber-600" : "text-white hover:text-amber-400"
              }`}
            >
              <Star className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
            </button>
          )}

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

          {/* Info cards — vertical, full-width, expandable */}
          <div className="flex flex-col gap-2.5">
            <div className="rounded-2xl bg-[#2a2a2a] p-3 w-full">
              <div className="flex items-start gap-2 text-white text-sm font-semibold">
                <Calendar className="w-4 h-4 shrink-0 mt-0.5" style={{ color: catColor }} />
                <span className="capitalize break-words">{formattedDate}</span>
              </div>
              {formattedEndDate && (
                <p className="text-xs text-neutral-400 capitalize mt-1 break-words pl-6">até {formattedEndDate}</p>
              )}
              {event.horario && (
                <p className="text-xs text-neutral-300 mt-1 flex items-start gap-1 pl-6 break-words">
                  <Clock className="w-3 h-3 shrink-0 mt-0.5" /> <span>{event.horario}</span>
                </p>
              )}
              {event.is_recurring && event.recurring_days && event.recurring_days.length > 0 && (
                <p className="text-xs text-neutral-300 mt-1 flex items-start gap-1 pl-6 break-words">
                  <Repeat className="w-3 h-3 shrink-0 mt-0.5" style={{ color: catColor }} />
                  <span>Recorrente: {formatRecurringDays(event.recurring_days)}</span>
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-[#2a2a2a] p-3 w-full">
              <div className="flex items-start gap-2 text-white text-sm font-semibold">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: catColor }} />
                <span className="leading-snug break-words">
                  {event.local !== "Não informado" ? event.local : event.cidade}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 pl-6 break-words">
                {event.endereco !== "Não informado" && `${event.endereco}, `}
                {event.cidade}
              </p>
            </div>
          </div>

          {/* About section */}
          <div>
            <h4 className="font-semibold text-white mb-1.5 font-sans">Sobre o evento</h4>
            {(() => {
              const len = event.descricao?.length || 0;
              const fontClass =
                len > 1500 ? "text-[11px] leading-snug"
                : len > 900 ? "text-xs leading-snug"
                : len > 500 ? "text-[13px] leading-relaxed"
                : "text-sm leading-relaxed";
              return (
                <div
                  className={`text-neutral-300 whitespace-pre-wrap break-words ${fontClass}`}
                  style={{ fontFamily: 'inherit' }}
                >
                  {event.descricao}
                </div>
              );
            })()}
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

          <div className="rounded-xl bg-black/30 border border-white/5 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-400 leading-relaxed">
              Este evento pode sofrer alterações de data ou horário devido a condições climáticas ou fatores externos. Entre em contato com o administrador.
            </p>
          </div>

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
