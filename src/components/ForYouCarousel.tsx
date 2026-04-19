import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import EventCard from "@/components/EventCard";
import { EventData } from "@/data/events";
import { SubcategoryImageMap } from "@/hooks/useSubcategoryImages";

interface ForYouCarouselProps {
  events: EventData[];
  onSelect: (event: EventData) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  isAdmin?: boolean;
  subcategoryImages?: SubcategoryImageMap;
}

const ForYouCarousel = ({
  events,
  onSelect,
  isFavorite,
  onToggleFavorite,
  isAdmin,
  subcategoryImages,
}: ForYouCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;
      const scrollLeft = el.scrollLeft;
      let closest = 0;
      let minDist = Infinity;
      children.forEach((child, i) => {
        const dist = Math.abs(child.offsetLeft - scrollLeft);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      setActiveIndex(closest);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [events.length]);

  const scrollToIndex = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-serif font-semibold">Para você</h2>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {events.map((event, i) => (
          <div
            key={event.id}
            className="snap-start shrink-0 basis-[65%] sm:basis-[45%] md:basis-[32%] lg:basis-[28%]"
          >
            <EventCard
              event={event}
              onSelect={onSelect}
              index={i}
              isFavorite={isFavorite(event.id)}
              onToggleFavorite={onToggleFavorite}
              isAdmin={isAdmin}
              subcategoryImages={subcategoryImages}
            />
          </div>
        ))}
      </div>

      {events.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {events.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              aria-label={`Ir para card ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? "w-5 bg-primary" : "w-1.5 bg-neutral-600"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ForYouCarousel;
