import { useEffect, useRef, useState, useMemo } from "react";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import EventCard from "@/components/EventCard";
import { EventData } from "@/data/events";
import { SubcategoryImageMap } from "@/hooks/useSubcategoryImages";
import { CategoryImageMap } from "@/hooks/useCategoryImages";

interface ForYouCarouselProps {
  events: EventData[];
  onSelect: (event: EventData) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  isAdmin?: boolean;
  subcategoryImages?: SubcategoryImageMap;
  categoryImages?: CategoryImageMap;
}

const MAX_EVENTS = 5;

const ForYouCarousel = ({
  events,
  onSelect,
  isFavorite,
  onToggleFavorite,
  isAdmin,
  subcategoryImages,
  categoryImages,
}: ForYouCarouselProps) => {
  const limited = useMemo(() => events.slice(0, MAX_EVENTS), [events]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdjustingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Triple the list for infinite loop illusion: [clones | real | clones]
  const looped = useMemo(
    () => (limited.length > 1 ? [...limited, ...limited, ...limited] : limited),
    [limited]
  );
  const realLen = limited.length;

  // Center on the middle copy initially
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || realLen <= 1) return;
    const child = el.children[realLen] as HTMLElement | undefined;
    if (child) {
      isAdjustingRef.current = true;
      const target = child.offsetLeft - (el.clientWidth - child.clientWidth) / 2;
      el.scrollTo({ left: target, behavior: "auto" });
      requestAnimationFrame(() => {
        isAdjustingRef.current = false;
      });
    }
  }, [realLen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId = 0;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (isAdjustingRef.current) return;
        const children = Array.from(el.children) as HTMLElement[];
        if (children.length === 0) return;
        const center = el.scrollLeft + el.clientWidth / 2;
        let closest = 0;
        let minDist = Infinity;
        children.forEach((child, i) => {
          const childCenter = child.offsetLeft + child.clientWidth / 2;
          const dist = Math.abs(childCenter - center);
          if (dist < minDist) {
            minDist = dist;
            closest = i;
          }
        });
        setActiveIndex(realLen > 1 ? closest % realLen : closest);

        // Loop teleport when entering first or last copy
        if (realLen > 1) {
          if (closest < realLen) {
            // jumped into first copy → teleport forward by realLen
            const target = children[closest + realLen];
            if (target) {
              isAdjustingRef.current = true;
              el.scrollTo({
                left: target.offsetLeft - (el.clientWidth - target.clientWidth) / 2,
                behavior: "auto",
              });
              requestAnimationFrame(() => {
                isAdjustingRef.current = false;
              });
            }
          } else if (closest >= realLen * 2) {
            // jumped into last copy → teleport back by realLen
            const target = children[closest - realLen];
            if (target) {
              isAdjustingRef.current = true;
              el.scrollTo({
                left: target.offsetLeft - (el.clientWidth - target.clientWidth) / 2,
                behavior: "auto",
              });
              requestAnimationFrame(() => {
                isAdjustingRef.current = false;
              });
            }
          }
        }
      });
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [realLen]);

  const scrollToRealIndex = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const targetIdx = realLen > 1 ? i + realLen : i;
    const child = el.children[targetIdx] as HTMLElement | undefined;
    if (child) {
      el.scrollTo({
        left: child.offsetLeft - (el.clientWidth - child.clientWidth) / 2,
        behavior: "smooth",
      });
    }
  };

  const scrollByDir = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.clientWidth + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (limited.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-serif font-semibold">Para você</h2>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-[12%] gap-3 pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollPaddingLeft: "12%",
            scrollPaddingRight: "12%",
          }}
        >
          {looped.map((event, i) => {
            const realIdx = realLen > 1 ? i % realLen : i;
            const isActive = realIdx === activeIndex;
            return (
              <div
                key={`${event.id}-${i}`}
                className={`snap-center shrink-0 w-[280px] sm:w-[320px] md:w-[340px] lg:w-[360px] h-[290px] transition-transform duration-300 ${
                  isActive ? "scale-100" : "scale-[0.94] opacity-80"
                }`}
              >
                <div className="h-full [&>div]:h-full [&>div]:flex [&>div]:flex-col">
                  <EventCard
                    event={event}
                    onSelect={onSelect}
                    index={i}
                    isFavorite={isFavorite(event.id)}
                    onToggleFavorite={onToggleFavorite}
                    isAdmin={isAdmin}
                    subcategoryImages={subcategoryImages}
                    categoryImages={categoryImages}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {limited.length > 1 && (
          <>
            <button
              onClick={() => scrollByDir(-1)}
              aria-label="Anterior"
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white shadow-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollByDir(1)}
              aria-label="Próximo"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white shadow-md transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {limited.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {limited.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToRealIndex(i)}
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
