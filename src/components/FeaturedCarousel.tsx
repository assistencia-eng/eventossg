import { useState, useEffect, useCallback } from "react";
import { EventData } from "@/data/events";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FeaturedCarouselProps {
  events: EventData[];
  onSelect: (event: EventData) => void;
}

const FeaturedCarousel = ({ events, onSelect }: FeaturedCarouselProps) => {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % events.length);
  }, [events.length]);

  const prev = useCallback(() => {
    setCurrent((p) => (p - 1 + events.length) % events.length);
  }, [events.length]);

  useEffect(() => {
    if (events.length === 0) return;
    const duration = (events[current]?.outdoor_duration || 7) * 1000;
    const timer = setInterval(next, duration);
    return () => clearInterval(timer);
  }, [current, events, next]);

  if (events.length === 0) return null;

  const event = events[current];
  const formattedDate = format(parseISO(event.data), "dd 'de' MMMM, yyyy", { locale: ptBR });

  const textAlign = event.outdoor_text_align || "left";
  const textPosition = event.outdoor_text_position || "bottom";
  const titleSize = event.outdoor_title_size || 28;
  const showDescription = event.outdoor_show_description ?? true;

  // Compute position classes
  const positionClasses = (() => {
    const align = textAlign === "center" ? "text-center items-center" : textAlign === "right" ? "text-right items-end" : "text-left items-start";
    if (textPosition === "top") return `absolute top-0 left-0 right-0 px-14 pt-8 pb-6 md:px-16 md:pt-10 flex flex-col ${align}`;
    if (textPosition === "center") return `absolute inset-0 flex flex-col justify-center px-14 md:px-16 ${align}`;
    return `absolute bottom-0 left-0 right-0 px-14 pb-8 pt-6 md:px-16 md:pb-10 flex flex-col ${align}`;
  })();

  // Gradient direction based on text position
  const gradientClass = textPosition === "top"
    ? "bg-gradient-to-b from-black/90 via-black/40 to-transparent"
    : textPosition === "center"
    ? "bg-black/50"
    : "bg-gradient-to-t from-black/90 via-black/40 to-transparent";

  return (
    <div className="relative w-full h-[35vh] min-h-[200px] overflow-hidden bg-muted">
      {/* Background image */}
      {event.imagem ? (
        <img
          src={event.imagem}
          alt={event.nome}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
      )}

      {/* Overlay */}
      <div className={`absolute inset-0 ${gradientClass}`} />

      {/* Content */}
      <div
        className={`${positionClasses} cursor-pointer z-10`}
        onClick={() => onSelect(event)}
      >
        <p className="text-sm text-white/80 font-medium mb-1 tracking-wide uppercase">{formattedDate}</p>
        <h2
          className="font-sans font-bold text-white drop-shadow-lg mb-2 tracking-wide leading-tight"
          style={{ fontSize: `${titleSize}px` }}
        >
          {event.nome}
        </h2>
        {showDescription && (
          <p className="text-sm text-white/70 font-medium">{event.local} — {event.cidade}</p>
        )}
      </div>

      {/* Nav arrows */}
      {events.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-1 top-1/3 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-1 top-1/3 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {events.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {events.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedCarousel;
