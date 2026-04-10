import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { EventData, EventCategory } from "@/data/events";
import { getUserLocation, calculateDistance, UserLocation } from "@/lib/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";
import EventDetailModal from "@/components/EventDetailModal";
import ImportEvents from "@/components/ImportEvents";
import AddEventForm from "@/components/AddEventForm";
import EditEventForm from "@/components/EditEventForm";
import OutdoorSettings from "@/components/OutdoorSettings";
import BottomNav from "@/components/BottomNav";
import ProfilePage from "@/components/ProfilePage";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import { Loader2, Upload, Plus, Trash2, Settings, Sparkles, LogOut, LogIn, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserInterests } from "@/hooks/useUserInterests";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, profile, loading: authLoading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
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
  const [allDates, setAllDates] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [activeNav, setActiveNav] = useState<"events" | "profile" | "search">("events");
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const eventsRef = useRef<HTMLDivElement>(null);

  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const { interests, toggleCategory: toggleInterestCategory, toggleSubcategory } = useUserInterests();

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
          horario: (e as any).horario ?? null,
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
          is_recurring: (e as any).is_recurring ?? false,
          recurring_days: (e as any).recurring_days ?? [],
        }))
      );
    }
  }, []);

  useEffect(() => { fetchDbEvents(); }, [fetchDbEvents]);

  const allEvents = useMemo(() => dbEvents, [dbEvents]);
  const featuredEvents = useMemo(() => allEvents.filter((e) => e.is_featured), [allEvents]);

  const availableCities = useMemo(() => {
    const cities = new Set(allEvents.map((e) => e.cidade));
    return [...cities].sort();
  }, [allEvents]);

  const toggleCategory = useCallback((cat: EventCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    await toggleFavorite(id);
  }, [user, toggleFavorite]);

  const handleNavChange = useCallback((tab: "events" | "profile" | "search") => {
    if (tab === "profile" && !user) {
      navigate("/auth");
      return;
    }
    setActiveNav(tab);
  }, [user, navigate]);

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

    if (selectedCategories.length > 0) {
      results = results.filter(({ event }) =>
        event.categorias?.some((c) => selectedCategories.includes(c)) ||
        selectedCategories.includes(event.categoria)
      );
    }

    if (searchCity.trim()) {
      const q = searchCity.trim().toLowerCase();
      results = results.filter(({ event }) => event.cidade.toLowerCase().includes(q));
    }

    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      results = results.filter(({ event }) => event.nome.toLowerCase().includes(q));
    }

    if (distanceKm < 155 && userLocation) {
      results = results.filter(({ distance, event }) => {
        if (event.hasExactLocation !== true) return true;
        return distance !== null && distance <= distanceKm;
      });
    }

    // Only apply month filter if "all dates" is off
    if (!allDates) {
      results = results.filter(({ event }) => {
        const eventStart = parseISO(event.data);
        const eventEnd = event.data_fim ? parseISO(event.data_fim) : eventStart;
        return eventEnd >= monthStart && eventStart <= monthEnd;
      });
    }

    results.sort((a, b) => new Date(a.event.data).getTime() - new Date(b.event.data).getTime());
    return results;
  }, [eventsWithDistance, selectedCategories, distanceKm, userLocation, searchCity, searchName, allDates, monthStart, monthEnd]);

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

  const forYouEvents = useMemo(() => {
    if (interests.categories.length === 0 && interests.subcategories.length === 0) return [];
    return allEvents.filter((event) => {
      const end = event.data_fim ? new Date(event.data_fim) : new Date(event.data);
      if (end < today) return false;
      const matchesCat = event.categorias?.some((c) => interests.categories.includes(c)) ||
        interests.categories.includes(event.categoria);
      const matchesSub = event.subcategorias?.some((s) => interests.subcategories.includes(s));
      return matchesCat || matchesSub;
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [allEvents, interests, today]);

  const displayedEvents = activeTab === "upcoming" ? upcomingEvents : activeTab === "past" ? pastEvents : [];

  const favoriteEvents = useMemo(
    () => allEvents.filter((e) => favoriteIds.has(e.id)),
    [allEvents, favoriteIds]
  );

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

  const userInitials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  // Search view filtered events
  const searchResults = useMemo(() => {
    if (!searchName.trim()) return allEvents;
    const q = searchName.trim().toLowerCase();
    return allEvents.filter((e) => e.nome.toLowerCase().includes(q));
  }, [allEvents, searchName]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* User header bar */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 flex items-center justify-between h-14 bg-wine-dark">
          <h1 className="font-serif font-bold text-center text-amber-50 text-4xl"> Serra Eventos</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:block">
                    {profile?.full_name || user.email}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="gap-2">
                <LogIn className="w-4 h-4" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </div>

      {activeNav === "events" ? (
        <>
          <FeaturedCarousel events={featuredEvents} onSelect={setSelectedEvent} />

          <div ref={eventsRef} className="container mx-auto px-4 py-6 text-gray-900 bg-[#151414]">
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
              {isAdmin && (
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
              )}
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
              availableCities={availableCities}
              allDates={allDates}
              onAllDatesChange={setAllDates}
              searchName={searchName}
              onSearchNameChange={setSearchName}
            />

            {user && forYouEvents.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-serif font-semibold">Para você</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {forYouEvents.slice(0, 3).map((event, i) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={setSelectedEvent}
                      index={i}
                      isFavorite={isFavorite(event.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="upcoming" className="flex-1">
                  Próximos ({upcomingEvents.length})
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
                        isFavorite={isFavorite(event.id)}
                        onToggleFavorite={handleToggleFavorite}
                        isAdmin={isAdmin}
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
        </>
      ) : activeNav === "search" ? (
        <div className="container mx-auto px-4 py-6">
          <h2 className="text-xl font-serif font-bold mb-4">Buscar eventos</h2>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do evento..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9 h-12"
              autoFocus
            />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            <strong className="text-foreground">{searchResults.length}</strong> evento{searchResults.length !== 1 && "s"} encontrado{searchResults.length !== 1 && "s"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {searchResults.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={setSelectedEvent}
                onDelete={setDeleteTarget}
                onEdit={setEditEvent}
                index={i}
                isFavorite={isFavorite(event.id)}
                onToggleFavorite={handleToggleFavorite}
                isAdmin={isAdmin}
              />
            ))}
          </div>
          {searchResults.length === 0 && searchName.trim() && (
            <div className="text-center py-20">
              <p className="text-xl font-serif text-muted-foreground">Nenhum evento encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">Tente outro termo de busca.</p>
            </div>
          )}
        </div>
      ) : (
        <ProfilePage
          interests={interests}
          onToggleCategory={toggleInterestCategory}
          onToggleSubcategory={toggleSubcategory}
          favoriteEvents={favoriteEvents}
          onSelectEvent={setSelectedEvent}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={isFavorite}
        />
      )}

      <BottomNav active={activeNav} onChange={handleNavChange} />
      <LoginRequiredModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      <EventDetailModal event={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
      <EditEventForm event={editEvent} open={!!editEvent} onClose={() => setEditEvent(null)} onUpdated={fetchDbEvents} />
      <ImportEvents open={importOpen} onClose={() => setImportOpen(false)} onImported={fetchDbEvents} />
      <AddEventForm open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchDbEvents} />
      <OutdoorSettings open={outdoorSettingsOpen} onClose={() => setOutdoorSettingsOpen(false)} events={allEvents} onUpdated={fetchDbEvents} />

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
