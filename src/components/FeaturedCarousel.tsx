import { useState, useEffect, useCallback, useRef } from "react";
import { EventData } from "@/data/events";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { SubcategoryImageMap, subImgKey } from "@/hooks/useSubcategoryImages";
import { CategoryImageMap } from "@/hooks/useCategoryImages";
import { KeywordImageMap, pickKeywordImage } from "@/hooks/useKeywordImages";

interface FeaturedCarouselProps {
  events: EventData[];
  onSelect: (event: EventData) => void;
  subcategoryImages?: SubcategoryImageMap;
  categoryImages?: CategoryImageMap;
  keywordImages?: KeywordImageMap;
  showInfo?: boolean;
}

export const resolveOutdoorImage = (
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

const FeaturedCarousel = ({ events, onSelect, subcategoryImages, categoryImages, keywordImages, showInfo = true }: FeaturedCarouselProps) => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((p) => (p + 1) % events.length), [events.length]);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + events.length) % events.length), [events.length]);

  useEffect(() => {
    if (current >= events.length) setCurrent(0);
  }, [events.length, current]);

  useEffect(() => {
    if (events.length === 0) return;
    const duration = (events[current]?.outdoor_duration || 7) * 1000;
    const timer = setInterval(next, duration);
    return () => clearInterval(timer);
  }, [current, events, next]);

  // Swipe (touch)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchMoved = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchMoved.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - (touchStartY.current ?? 0);
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) touchMoved.current = true;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
  };

  if (events.length === 0) return null;

  const event = events[current] ?? events[0];
  if (!event) return null;
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM, yyyy", { locale: ptBR }).toUpperCase();
  const imgSrc = resolveOutdoorImage(event, subcategoryImages, categoryImages, keywordImages);
  const px = event.outdoor_image_position_x ?? 50;
  const py = event.outdoor_image_position_y ?? 50;
  const zoom = event.outdoor_image_zoom ?? 1;

  const handleClick = () => {
    if (touchMoved.current) return;
    onSelect(event);
  };

  return (
    <div className="bg-[#151414]">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter") onSelect(event); }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative w-full aspect-[16/11] md:aspect-auto md:h-[55vh] md:min-h-[440px] overflow-hidden bg-[#1a0a10] cursor-pointer select-none"
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={event.nome}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              objectPosition: `${px}% ${py}%`,
              transform: `scale(${zoom})`,
              transformOrigin: `${px}% ${py}%`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#5a0d1f] to-[#1a0a10]" />
        )}

        {(event.outdoor_show_info ?? showInfo) && (
          <>
            {/* Bottom gradient for legibility */}
            <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 z-10 px-5 md:px-10 pb-5 md:pb-7 max-w-3xl">
              <h2 className="font-sans font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-[1.1] tracking-tight text-xl md:text-4xl lg:text-5xl mb-3 md:mb-4">
                {event.nome}
              </h2>

              <div className="flex items-center gap-3 md:gap-4 text-white/90 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#e23a4a] shrink-0" strokeWidth={2.2} />
                  <span className="text-[11px] md:text-xs font-bold tracking-[0.12em] uppercase">{formattedDate}</span>
                </div>
                <span className="hidden sm:inline-block w-px h-4 bg-white/30" />
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#e23a4a] shrink-0" strokeWidth={2.2} />
                  <span className="text-[11px] md:text-xs font-bold tracking-[0.12em] uppercase truncate">
                    {event.local}{event.cidade ? ` — ${event.cidade}` : ""}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Nav arrows (desktop hover) */}
        {events.length > 1 && (
          <>
            <button
              aria-label="Anterior"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="hidden md:flex absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              aria-label="Próximo"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="hidden md:flex absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots — between outdoor and search field */}
      {events.length > 1 && (
        <div className="flex justify-center gap-2 py-3">
          {events.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir para slide ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "bg-[#c9a84c] w-6" : "bg-white/30 w-2"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedCarousel;
