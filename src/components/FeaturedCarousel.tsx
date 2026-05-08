import { useState, useEffect, useCallback } from "react";
import { EventData } from "@/data/events";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, ChevronRight as ArrowRight, MapPin } from "lucide-react";
import { SubcategoryImageMap, subImgKey } from "@/hooks/useSubcategoryImages";
import { CategoryImageMap } from "@/hooks/useCategoryImages";
import { KeywordImageMap, pickKeywordImage } from "@/hooks/useKeywordImages";

interface FeaturedCarouselProps {
  events: EventData[];
  onSelect: (event: EventData) => void;
  subcategoryImages?: SubcategoryImageMap;
  categoryImages?: CategoryImageMap;
  keywordImages?: KeywordImageMap;
}

const resolveImage = (
  event: EventData,
  subcategoryImages?: SubcategoryImageMap,
  categoryImages?: CategoryImageMap,
  keywordImages?: KeywordImageMap,
) => {
  let imgSrc = event.imagem;
  const cats = event.categorias?.length ? event.categorias : [event.categoria];
  if (!imgSrc) {
    const kw = pickKeywordImage(event.nome, keywordImages, event.id);
    if (kw) imgSrc = kw;
  }
  if (!imgSrc && subcategoryImages && event.subcategorias?.length) {
    outer: for (const sub of event.subcategorias) {
      for (const cat of cats) {
        const imgs = subcategoryImages[subImgKey(cat, sub)];
        if (imgs && imgs.length > 0) {
          let hash = 0;
          for (let i = 0; i < event.id.length; i++) hash = ((hash << 5) - hash + event.id.charCodeAt(i)) | 0;
          imgSrc = imgs[Math.abs(hash) % imgs.length];
          break outer;
        }
      }
    }
  }
  if (!imgSrc && categoryImages) {
    for (const cat of cats) if (categoryImages[cat]) { imgSrc = categoryImages[cat]; break; }
  }
  return imgSrc;
};

const FeaturedCarousel = ({ events, onSelect, subcategoryImages, categoryImages, keywordImages }: FeaturedCarouselProps) => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((p) => (p + 1) % events.length), [events.length]);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + events.length) % events.length), [events.length]);

  useEffect(() => {
    if (events.length === 0) return;
    const duration = (events[current]?.outdoor_duration || 7) * 1000;
    const timer = setInterval(next, duration);
    return () => clearInterval(timer);
  }, [current, events, next]);

  if (events.length === 0) return null;

  const event = events[current];
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM, yyyy", { locale: ptBR }).toUpperCase();
  const imgSrc = resolveImage(event, subcategoryImages, categoryImages, keywordImages);
  const px = event.outdoor_image_position_x ?? 50;
  const py = event.outdoor_image_position_y ?? 50;
  const zoom = event.outdoor_image_zoom ?? 1;

  return (
    <div className="relative w-full aspect-video md:aspect-auto md:h-[55vh] md:min-h-[440px] overflow-hidden bg-[#1a0a10]">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={event.nome}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            objectPosition: `${px}% ${py}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${px}% ${py}%`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#5a0d1f] to-[#1a0a10]" />
      )}

      {/* Overlay: vinho fade left + dark bottom for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#3d0814]/90 via-[#3d0814]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-5 md:px-12 max-w-3xl">
        <div className="inline-flex items-center gap-2 self-start bg-gradient-to-b from-[#7a1228] to-[#3d0814] rounded-full px-4 py-2 mb-4 shadow-lg shadow-black/40 ring-1 ring-white/10">
          <Calendar className="w-3.5 h-3.5 text-white" />
          <span className="text-[11px] md:text-xs font-bold tracking-[0.14em] text-white uppercase">{formattedDate}</span>
        </div>

        <h2 className="font-sans font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-[1.05] tracking-tight text-3xl md:text-5xl lg:text-6xl mb-4 md:mb-5">
          {event.nome}
        </h2>

        <div className="flex items-center gap-2 text-white/90 mb-5 md:mb-6">
          <MapPin className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
          <span className="text-sm md:text-base font-medium">
            {event.local} {event.cidade ? `— ${event.cidade}` : ""}
          </span>
        </div>

        <button
          onClick={() => onSelect(event)}
          className="self-start inline-flex items-center gap-3 bg-gradient-to-b from-[#7a1228] to-[#3d0814] hover:from-[#8d1530] hover:to-[#4d0a18] text-white font-bold tracking-[0.18em] uppercase text-sm md:text-base pl-7 pr-5 md:pl-9 md:pr-6 py-3 md:py-3.5 rounded-full ring-1 ring-white/10 shadow-lg shadow-black/50 transition-colors"
        >
          Saiba mais
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Nav arrows */}
      {events.length > 1 && (
        <>
          <button
            aria-label="Anterior"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Próximo"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {events.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {events.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir para slide ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "bg-[#c9a84c] w-6" : "bg-white/40 w-2"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedCarousel;
