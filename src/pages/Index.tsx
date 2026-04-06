import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { mockEvents, EventData, EventCategory } from "@/data/events";
import { getUserLocation, calculateDistance, UserLocation } from "@/lib/geolocation";
import HeroSection from "@/components/HeroSection";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";
import EventDetailModal from "@/components/EventDetailModal";
import { MapPin, Loader2 } from "lucide-react";

const Index = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "distance">("date");
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUserLocation()
      .then(setUserLocation)
      .catch(() => {})
      .finally(() => setLocationLoading(false));
  }, []);

  const toggleCategory = useCallback((cat: EventCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const eventsWithDistance = useMemo(() => {
    return mockEvents.map((event) => ({
      event,
      distance: userLocation
        ? calculateDistance(userLocation.latitude, userLocation.longitude, event.latitude, event.longitude)
        : null,
    }));
  }, [userLocation]);

  const filteredEvents = useMemo(() => {
    let results = eventsWithDistance;

    if (selectedCategories.length > 0) {
      results = results.filter(({ event }) => selectedCategories.includes(event.categoria));
    }

    if (distanceKm !== null && userLocation) {
      results = results.filter(({ distance }) => distance !== null && distance <= distanceKm);
    }

    if (sortBy === "distance" && userLocation) {
      results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else {
      results.sort((a, b) => new Date(a.event.data).getTime() - new Date(b.event.data).getTime());
    }

    return results;
  }, [eventsWithDistance, selectedCategories, distanceKm, sortBy, userLocation]);

  const selectedDistance = selectedEvent
    ? eventsWithDistance.find((e) => e.event.id === selectedEvent.id)?.distance
    : null;

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onScrollToEvents={() => eventsRef.current?.scrollIntoView({ behavior: "smooth" })} />

      <div ref={eventsRef} className="container mx-auto px-4 -mt-8 relative z-10 pb-16">
        {/* Location status */}
        <div className="flex items-center gap-2 mb-5 text-sm text-muted-foreground">
          {locationLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Obtendo localização...
            </>
          ) : userLocation ? (
            <>
              <MapPin className="w-4 h-4 text-accent" />
              Localização detectada — mostrando eventos próximos a você
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Localização indisponível — mostrando todos os eventos
            </>
          )}
        </div>

        <FilterBar
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          distanceKm={distanceKm}
          onDistanceChange={setDistanceKm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hasLocation={!!userLocation}
          totalResults={filteredEvents.length}
        />

        {/* Events grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {filteredEvents.map(({ event, distance }, i) => (
            <EventCard
              key={event.id}
              event={event}
              distance={distance}
              onSelect={setSelectedEvent}
              index={i}
            />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl font-serif text-muted-foreground">Nenhum evento encontrado</p>
            <p className="text-sm text-muted-foreground mt-2">Tente ajustar os filtros de interesse ou distância.</p>
          </div>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        distance={selectedDistance}
      />
    </div>
  );
};

export default Index;
