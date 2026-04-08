import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { EventData, EventCategory } from "@/data/events";
import { getUserLocation, calculateDistance, UserLocation } from "@/lib/geolocation";
import { supabase } from "@/integrations/supabase/client";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";
import EventDetailModal from "@/components/EventDetailModal";
import ImportEvents from "@/components/ImportEvents";
import AddEventForm from "@/components/AddEventForm";
import EditEventForm from "@/components/EditEventForm";
import OutdoorSettings from "@/components/OutdoorSettings";
import { Loader2, Upload, Plus, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

const Index = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [distanceKm, setDistanceKm] = useState(155);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventData | null>(null);
  const [outdoorSettingsOpen, setOutdoorSettingsOpen] = useState(false);
  const [dbEvents, setDbEvents] = useState<EventData[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<EventData | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [searchCity, setSearchCity] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date());
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
          data_fim: e.data_fim,
          descricao: e.descricao,
          atracoes: e.atracoes,
          categoria: e.categoria as EventCategory,
          categorias: (e.categorias || [e.categoria]) as EventCategory[],
          subcategorias: e.subcategorias || [],
          latitude: e.latitude,
          longitude: e.longitude,
          imagem: e.imagem ?? undefined,
          hasExactLocation: e.endereco !== "Não informado" && e.endereco !== "",
          is_featured: e.is_featured,
          outdoor_duration: e.outdoor_duration,
        }))
      );
    }
  }, []);

  useEffect(() => { fetchDbEvents(); }, [fetchDbEvents]);

  const allEvents = useMemo(() => dbEvents, [dbEvents]);

  const featuredEvents = useMemo(() => allEvents.filter((e) => e.is_featured), [allEvents]);

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

  const monthStart = useMemo(() => startOfMonth(filterMonth), [filterMonth]);
  const monthEnd = useMemo(() => endOfMonth(filterMonth), [filterMonth]);

  const filteredEvents = useMemo(() => {
    let results = [...eventsWithDistance];

    // Category filter
    if (selectedCategories.length > 0) {
      results = results.filter(({ event }) =>
        event.categorias?.some((c) => selectedCategories.includes(c)) ||
        selectedCategories.includes(event.categoria)
      );
    }

    // City search
    if (searchCity.trim()) {
      const q = searchCity.trim().toLowerCase();
      results = results.filter(({ event }) => event.cidade.toLowerCase().includes(q));
    }

    // Distance filter (only if < 155)
    if (distanceKm < 155 && userLocation) {
      results = results.filter(({ distance, event }) => {
        if (event.hasExactLocation !== true) return true;
        return distance !== null && distance <= distanceKm;
      });
    }

    // Month filter
    results = results.filter(({ event }) => {
      const eventStart = parseISO(event.data);
      const eventEnd = event.data_fim ? parseISO(event.data_fim) : eventStart;
      return eventEnd >= monthStart && eventStart <= monthEnd;
    });

    // Sort by date
    results.sort((a, b) => new Date(a.event.data).getTime() - new Date(b.event.data).getTime());

    return results;
  }, [eventsWithDistance, selectedCategories, distanceKm, userLocation, searchCity, monthStart, monthEnd]);

  const upcomingEvents = useMemo(
    () => filteredEvents.filter(({ event }) => {
      const end = event.data_fim ? new Date(event.data_fim) : new Date(event.data);
      return end >= today;
    }),
    [filteredEvents, today]
  );

  const pastEvents = useMemo(
    () => filteredEvents.filter(({ event }) => {
      const end = event.data_fim ? new Date(event.data_fim) : new Date(event.data);
      return end < today;
    }),
    [filteredEvents, today]
  );

  const displayedEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir.");
    else { toast.success("Evento excluído!"); fetchDbEvents(); }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("events").delete().in("id", ids);
    if (error) toast.error("Erro ao excluir.");
    else { toast.success(`${ids.length} evento(s) excluído(s)!`); setSelectedIds(new Set()); fetchDbEvents(); }
    setBulkDeleteOpen(false);
  };

  const handleDeleteAll = async () => {
    const allIds = allEvents.map((e) => e.id);
    if (allIds.length === 0) return;
    const { error } = await supabase.from("events").delete().in("id", allIds);
    if (error) toast.error("Erro ao excluir.");
    else { toast.success("Todos os eventos excluídos!"); setSelectedIds(new Set()); fetchDbEvents(); }
    setDeleteAllOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <FeaturedCarousel events={featuredEvents} onSelect={setSelectedEvent} />

      <div ref={eventsRef} className="container mx-auto px-4 py-6 pb-16">
        {/* Action buttons */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {locationLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Obtendo localização...</>
            ) : userLocation ? (
              <span className="text-xs">📍 Localização ativa</span>
            ) : (
              <span className="text-xs">📍 Localização indisponível</span>
            )}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Excluir ({selectedIds.size})
              </Button>
            )}
            {allEvents.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setDeleteAllOpen(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-1.5" /> Excluir todos
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setOutdoorSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-1.5" /> Outdoor
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Novo
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" /> Importar
            </Button>
          </div>
        </div>

        <FilterBar
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          distanceKm={distanceKm}
          onDistanceChange={setDistanceKm}
          hasLocation={!!userLocation}
          totalResults={displayedEvents.length}
          searchCity={searchCity}
          onSearchCityChange={setSearchCity}
          filterMonth={filterMonth}
          onFilterMonthChange={setFilterMonth}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="upcoming" className="flex-1">
              Atuais e Futuros ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1">
              Passados ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          {[
            { key: "upcoming", events: upcomingEvents, emptyMsg: "Nenhum evento futuro encontrado" },
            { key: "past", events: pastEvents, emptyMsg: "Nenhum evento passado encontrado" },
          ].map(({ key, events, emptyMsg }) => (
            <TabsContent key={key} value={key}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                {events.map(({ event }, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelect={setSelectedEvent}
                    onDelete={setDeleteTarget}
                    onEdit={setEditEvent}
                    index={i}
                    selected={selectedIds.has(event.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </div>
              {events.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-xl font-serif text-muted-foreground">{emptyMsg}</p>
                  <p className="text-sm text-muted-foreground mt-2">Tente ajustar os filtros ou adicione novos eventos.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <EventDetailModal event={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} />

      <EditEventForm event={editEvent} open={!!editEvent} onClose={() => setEditEvent(null)} onUpdated={fetchDbEvents} />

      <ImportEvents open={importOpen} onClose={() => setImportOpen(false)} onImported={fetchDbEvents} />

      <AddEventForm open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchDbEvents} />

      <OutdoorSettings open={outdoorSettingsOpen} onClose={() => setOutdoorSettingsOpen(false)} events={allEvents} onUpdated={fetchDbEvents} />

      {/* Single delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>Excluir "{deleteTarget?.nome}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} evento(s)</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir TODOS os eventos</AlertDialogTitle>
            <AlertDialogDescription>Isso excluirá {allEvents.length} evento(s). Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir todos</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
