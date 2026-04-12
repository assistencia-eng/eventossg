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
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />

      {/* Content */}
      <div
        className="absolute bottom-0 left-0 right-0 p-6 md:p-10 cursor-pointer z-10"
        onClick={() => onSelect(event)}
      >
        <div className="container mx-auto">
          <p className="text-sm text-primary-foreground/80 font-medium mb-1">{formattedDate}</p>
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-primary-foreground drop-shadow-lg mb-2">
            {event.nome}
          </h2>
          <p className="text-sm text-primary-foreground/70">{event.local} — {event.cidade}</p>
        </div>
      </div>

      {/* Nav arrows */}
      {events.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-background/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-background/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
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
              className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-primary-foreground w-5" : "bg-primary-foreground/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedCarousel;
