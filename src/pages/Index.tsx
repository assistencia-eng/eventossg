import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { EventData, EventCategory } from "@/data/events";
import { getUserLocation, calculateDistance, UserLocation } from "@/lib/geolocation";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/HeroSection";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";
import EventDetailModal from "@/components/EventDetailModal";
import ImportEvents from "@/components/ImportEvents";
import AddEventForm from "@/components/AddEventForm";
import { MapPin, Loader2, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const Index = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "distance">("date");
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dbEvents, setDbEvents] = useState<EventData[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<EventData | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const eventsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUserLocation()
      .then(setUserLocation)
      .catch(() => {})
      .finally(() => setLocationLoading(false));
  }, []);

  const fetchDbEvents = useCallback(async () => {
    const { data } = await supabase.from("events").select("*");
    if (data) {
      setDbEvents(
        data.map((e) => ({
          id: e.id,
          nome: e.nome,
          local: e.local,
          cidade: e.cidade,
          endereco: e.endereco,
          data: e.data,
          descricao: e.descricao,
          atracoes: e.atracoes,
          categoria: e.categoria as EventCategory,
          latitude: e.latitude,
          longitude: e.longitude,
          imagem: e.imagem ?? undefined,
          hasExactLocation: e.endereco !== "Não informado" && e.endereco !== "",
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchDbEvents();
  }, [fetchDbEvents]);

  const allEvents = useMemo(() => dbEvents, [dbEvents]);

  const cities = useMemo(() => {
    const set = new Set(allEvents.map((e) => e.cidade));
    return Array.from(set).sort();
  }, [allEvents]);

  const toggleCategory = useCallback((cat: EventCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const eventsWithDistance = useMemo(() => {
    return allEvents.map((event) => ({
      event,
      distance:
        userLocation && event.hasExactLocation === true
          ? calculateDistance(userLocation.latitude, userLocation.longitude, event.latitude, event.longitude)
          : null,
    }));
  }, [userLocation, allEvents]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filteredEvents = useMemo(() => {
    let results = [...eventsWithDistance];

    if (selectedCategories.length > 0) {
      results = results.filter(({ event }) => selectedCategories.includes(event.categoria));
    }

    if (selectedCity) {
      results = results.filter(({ event }) => event.cidade === selectedCity);
    }

    if (distanceKm !== null && userLocation) {
      results = results.filter(({ distance, event }) => {
        if (event.hasExactLocation !== true) return true;
        return distance !== null && distance <= distanceKm;
      });
    }

    if (sortBy === "distance" && userLocation) {
      results.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else {
      results.sort((a, b) => new Date(a.event.data).getTime() - new Date(b.event.data).getTime());
    }

    return results;
  }, [eventsWithDistance, selectedCategories, distanceKm, sortBy, userLocation, selectedCity]);

  const upcomingEvents = useMemo(
    () => filteredEvents.filter(({ event }) => new Date(event.data) >= today),
    [filteredEvents, today]
  );

  const pastEvents = useMemo(
    () => filteredEvents.filter(({ event }) => new Date(event.data) < today),
    [filteredEvents, today]
  );

  const displayedEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  const selectedDistance = selectedEvent
    ? eventsWithDistance.find((e) => e.event.id === selectedEvent.id)?.distance
    : null;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Erro ao excluir evento.");
    } else {
      toast.success("Evento excluído com sucesso!");
      fetchDbEvents();
    }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const { error } = await supabase.from("events").delete().in("id", ids);
    if (error) {
      toast.error("Erro ao excluir eventos.");
    } else {
      toast.success(`${ids.length} evento(s) excluído(s) com sucesso!`);
      setSelectedIds(new Set());
      fetchDbEvents();
    }
    setBulkDeleteOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onScrollToEvents={() => eventsRef.current?.scrollIntoView({ behavior: "smooth" })} />

      <div ref={eventsRef} className="container mx-auto px-4 -mt-8 relative z-10 pb-16">
        {/* Location status + action buttons */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
          <div className="flex gap-2 shrink-0">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1.5" />
                Excluir ({selectedIds.size})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Novo
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              Importar
            </Button>
          </div>
        </div>

        <FilterBar
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          distanceKm={distanceKm}
          onDistanceChange={setDistanceKm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hasLocation={!!userLocation}
          totalResults={displayedEvents.length}
          cities={cities}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="upcoming" className="flex-1">
              Atuais e Futuros ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1">
              Passados ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
              {upcomingEvents.map(({ event, distance }, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  distance={distance}
                  onSelect={setSelectedEvent}
                  onDelete={setDeleteTarget}
                  index={i}
                  selected={selectedIds.has(event.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
            {upcomingEvents.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl font-serif text-muted-foreground">Nenhum evento futuro encontrado</p>
                <p className="text-sm text-muted-foreground mt-2">Tente ajustar os filtros ou adicione novos eventos.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
              {pastEvents.map(({ event, distance }, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  distance={distance}
                  onSelect={setSelectedEvent}
                  onDelete={setDeleteTarget}
                  index={i}
                  selected={selectedIds.has(event.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
            {pastEvents.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl font-serif text-muted-foreground">Nenhum evento passado encontrado</p>
                <p className="text-sm text-muted-foreground mt-2">Eventos passados aparecerão aqui.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        distance={selectedDistance}
      />

      <ImportEvents
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={fetchDbEvents}
      />

      <AddEventForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={fetchDbEvents}
      />

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} evento(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} evento(s) selecionado(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
