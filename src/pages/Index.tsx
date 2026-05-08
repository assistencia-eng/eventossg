import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { EventData, EventCategory, subcategoryOptions } from "@/data/events";
import { getUserLocation, calculateDistance, UserLocation } from "@/lib/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import { useAppSetting } from "@/hooks/useAppSetting";
import FilterBar from "@/components/FilterBar";
import EventCard from "@/components/EventCard";
import ForYouCarousel from "@/components/ForYouCarousel";
import EventDetailModal from "@/components/EventDetailModal";
import ImportEvents from "@/components/ImportEvents";
import AddEventForm from "@/components/AddEventForm";
import EditEventForm from "@/components/EditEventForm";
import OutdoorSettings from "@/components/OutdoorSettings";
import BottomNav from "@/components/BottomNav";
import ProfilePage from "@/components/ProfilePage";
import DuplicateDetector from "@/components/DuplicateDetector";
import ExplorePage from "@/components/ExplorePage";
import LoginRequiredModal from "@/components/LoginRequiredModal";
import { Loader2, Upload, Plus, Trash2, Settings, Sparkles, LogOut, LogIn, Search, ChevronDown, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserInterests } from "@/hooks/useUserInterests";
import { useSubcategoryImages } from "@/hooks/useSubcategoryImages";
import { useCategoryImages } from "@/hooks/useCategoryImages";
import { useKeywordImages } from "@/hooks/useKeywordImages";
import { buildRecurrenceMap } from "@/lib/recurrence";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, profile, loading: authLoading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState(155);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventData | null>(null);
  const [outdoorSettingsOpen, setOutdoorSettingsOpen] = useState(false);
  const [duplicateDetectorOpen, setDuplicateDetectorOpen] = useState(false);
  const [dbEvents, setDbEvents] = useState<EventData[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<EventData | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteFilteredOpen, setDeleteFilteredOpen] = useState(false);
  const [deleteFilterMonth, setDeleteFilterMonth] = useState<string>(""); // YYYY-MM
  const [deleteFilterCity, setDeleteFilterCity] = useState<string>("");
  const [searchCity, setSearchCity] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date());
  const [allDates, setAllDates] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [activeNav, setActiveNav] = useState<"events" | "profile" | "explore">("events");
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [exploreResetSignal, setExploreResetSignal] = useState(0);
  const eventsRef = useRef<HTMLDivElement>(null);

  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const { interests, toggleCategory: toggleInterestCategory, toggleSubcategory } = useUserInterests();
  const { images: subcategoryImages } = useSubcategoryImages();
  const { images: categoryImages } = useCategoryImages();
  const { images: keywordImages } = useKeywordImages();
  const { value: outdoorShowInfo } = useAppSetting<boolean>("outdoor_show_info", true);

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
          outdoor_text_align: (e as any).outdoor_text_align ?? 'left',
          outdoor_text_position: (e as any).outdoor_text_position ?? 'bottom',
          outdoor_title_size: (e as any).outdoor_title_size ?? 28,
          outdoor_show_description: (e as any).outdoor_show_description ?? true,
          is_recurring: (e as any).is_recurring ?? false,
          recurring_days: (e as any).recurring_days ?? [],
          subcategory_image_index: (e as any).subcategory_image_index ?? null,
          keywords: (e as any).keywords ?? [],
          image_source: (e as any).image_source ?? "auto",
          image_keyword: (e as any).image_keyword ?? null,
          keyword_image_index: (e as any).keyword_image_index ?? null,
          venue_id: (e as any).venue_id ?? null,
          custom_contacts: Array.isArray((e as any).custom_contacts) ? (e as any).custom_contacts : [],
          outdoor_image_position_x: (e as any).outdoor_image_position_x ?? 50,
          outdoor_image_position_y: (e as any).outdoor_image_position_y ?? 50,
          outdoor_image_zoom: (e as any).outdoor_image_zoom ?? 1,
        }))
      );
    }
  }, []);

  useEffect(() => { fetchDbEvents(); }, [fetchDbEvents]);

  const allEvents = useMemo(() => dbEvents, [dbEvents]);
  const featuredEvents = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return allEvents.filter((e) => {
      if (!e.is_featured) return false;
      // Recurring events stay featured while flagged
      if (e.is_recurring) return true;
      const end = e.data_fim ? parseISO(e.data_fim) : parseISO(e.data);
      // Keep visible during the full day of its end date; remove only the next day
      return end >= t;
    });
  }, [allEvents]);
  const recurrenceMap = useMemo(() => buildRecurrenceMap(allEvents), [allEvents]);

  const availableCities = useMemo(() => {
    const cities = new Set(allEvents.map((e) => e.cidade));
    return [...cities].sort();
  }, [allEvents]);

  const toggleCategory = useCallback((cat: EventCategory) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      // Remove subcategories of deselected category
      if (prev.includes(cat)) {
        const subs = subcategoryOptions[cat] || [];
        setSelectedSubcategories((sp) => sp.filter((s) => !subs.includes(s)));
      }
      return next;
    });
  }, []);

  const toggleFilterSubcategory = useCallback((sub: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  }, []);

  const handleToggleFavorite = useCallback(async (id: string) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    await toggleFavorite(id);
  }, [user, toggleFavorite]);

  const handleNavChange = useCallback((tab: "events" | "profile" | "explore") => {
    if (tab === "profile" && !user) {
      navigate("/auth");
      return;
    }
    if (tab === "events" && activeNav === "events") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (tab === "explore" && activeNav === "explore") {
      // Reset explore page (clear filter / go back to grid)
      setExploreResetSignal((n) => n + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setActiveNav(tab);
    if (tab === "events") {
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
    if (tab === "explore") {
      // Always start fresh when entering explore from another tab
      setExploreResetSignal((n) => n + 1);
    }
  }, [user, navigate, activeNav]);

  const handleCreate = useCallback(() => {
    if (!isAdmin) {
      toast.info("Somente administradores podem criar eventos.");
      return;
    }
    setAddOpen(true);
  }, [isAdmin]);

  const resetToInitial = useCallback(() => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setDistanceKm(155);
    setSearchCity("");
    setSearchName("");
    setAllDates(true);
    setFilterMonth(new Date());
    setActiveNav("events");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setDistanceKm(155);
    setSearchCity("");
    setSearchName("");
    setAllDates(true);
    setFilterMonth(new Date());
  }, []);

  const handleScrollToResults = useCallback(() => {
    eventsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // City auto-detect from smart search field
  const cityFromSearch = useMemo(() => {
    const q = searchName.trim().toLowerCase();
    if (!q) return "";
    const match = availableCities.find((c) => c.toLowerCase() === q);
    if (match) return match;
    const partial = availableCities.find((c) => c.toLowerCase().includes(q) && q.length >= 3);
    return partial || "";
  }, [searchName, availableCities]);

  const effectiveCity = searchCity.trim() || cityFromSearch;

  const filteredEvents = useMemo(() => {
    let results = [...eventsWithDistance];

    // Subcategory has PRIORITY over category — when subs are selected,
    // ignore category filter and only show events matching one of the subs.
    if (selectedSubcategories.length > 0) {
      results = results.filter(({ event }) =>
        event.subcategorias?.some((s) => selectedSubcategories.includes(s))
      );
    } else if (selectedCategories.length > 0) {
      results = results.filter(({ event }) =>
        event.categorias?.some((c) => selectedCategories.includes(c)) ||
        selectedCategories.includes(event.categoria)
      );
    }

    if (effectiveCity) {
      const q = effectiveCity.toLowerCase();
      results = results.filter(({ event }) => event.cidade.toLowerCase().includes(q));
    }

    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const nq = norm(q);
      results = results.filter(({ event }) => {
        // If query matched a city, do not also require name match
        if (cityFromSearch && cityFromSearch.toLowerCase() === q) return true;
        return (
          event.nome.toLowerCase().includes(q) ||
          (event.descricao || "").toLowerCase().includes(q) ||
          (event.keywords || []).some((k) => norm(k).includes(nq)) ||
          event.cidade.toLowerCase().includes(q)
        );
      });
    }

    if (distanceKm < 155 && userLocation) {
      results = results.filter(({ distance, event }) => {
        if (event.hasExactLocation !== true) return true;
        return distance !== null && distance <= distanceKm;
      });
    }

    if (!allDates) {
      results = results.filter(({ event }) => {
        const eventStart = parseISO(event.data);
        const eventEnd = event.data_fim ? parseISO(event.data_fim) : eventStart;
        return eventEnd >= monthStart && eventStart <= monthEnd;
      });
    }

    const todayTime = today.getTime();
    // Priority: 0 = starts today, 1 = already in progress (started before, still ongoing), 2 = future
    const priority = (e: EventData) => {
      const startTime = parseISO(e.data).getTime();
      if (startTime === todayTime) return 0;
      const endTime = e.data_fim ? parseISO(e.data_fim).getTime() : startTime;
      if (startTime < todayTime && endTime >= todayTime) return 1;
      return 2;
    };
    results.sort((a, b) => {
      const pa = priority(a.event);
      const pb = priority(b.event);
      if (pa !== pb) return pa - pb;
      const dt = parseISO(a.event.data).getTime() - parseISO(b.event.data).getTime();
      if (dt !== 0) return dt;
      // Non-recurring first when same date
      const ar = a.event.is_recurring ? 1 : 0;
      const br = b.event.is_recurring ? 1 : 0;
      return ar - br;
    });
    return results;
  }, [eventsWithDistance, selectedCategories, selectedSubcategories, distanceKm, userLocation, effectiveCity, searchName, cityFromSearch, allDates, monthStart, monthEnd]);

  const upcomingEvents = useMemo(() => {
    const list = filteredEvents.filter(({ event }) => {
      const end = event.data_fim ? parseISO(event.data_fim) : parseISO(event.data);
      return end >= today;
    });
    // Collapse recurring groups to only the next upcoming occurrence per name.
    const seenRecurring = new Set<string>();
    const collapsed: typeof list = [];
    const normName = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    for (const item of list) {
      if (recurrenceMap.has(item.event.id)) {
        const key = normName(item.event.nome);
        if (seenRecurring.has(key)) continue;
        seenRecurring.add(key);
      }
      collapsed.push(item);
    }
    return collapsed;
  }, [filteredEvents, today, recurrenceMap]);

  const pastEvents = useMemo(
    () => filteredEvents.filter(({ event }) => {
      const end = event.data_fim ? parseISO(event.data_fim) : parseISO(event.data);
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

  const filteredForDeletion = useMemo(() => {
    return allEvents.filter((e) => {
      if (deleteFilterMonth) {
        // YYYY-MM matches start date OR end date OR spans the month
        const ymStart = e.data?.slice(0, 7);
        const ymEnd = e.data_fim?.slice(0, 7);
        if (ymStart !== deleteFilterMonth && ymEnd !== deleteFilterMonth) return false;
      }
      if (deleteFilterCity && e.cidade !== deleteFilterCity) return false;
      return true;
    });
  }, [allEvents, deleteFilterMonth, deleteFilterCity]);

  const handleDeleteFiltered = async () => {
    const ids = filteredForDeletion.map((e) => e.id);
    if (ids.length === 0) {
      toast.info("Nenhum evento corresponde aos filtros.");
      return;
    }
    const { error } = await supabase.from("events").delete().in("id", ids);
    if (error) toast.error("Erro ao excluir.");
    else {
      toast.success(`${ids.length} evento(s) excluído(s)!`);
      setSelectedIds(new Set());
      setDeleteFilterMonth("");
      setDeleteFilterCity("");
      fetchDbEvents();
    }
    setDeleteFilteredOpen(false);
  };

  const userInitials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  // Search view filtered events — matches name OR any keyword tag
  const searchResults = useMemo(() => {
    if (!searchName.trim()) return allEvents;
    const q = searchName.trim().toLowerCase();
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const nq = norm(q);
    return allEvents.filter((e) =>
      e.nome.toLowerCase().includes(q) ||
      (e.keywords || []).some((k) => norm(k).includes(nq))
    );
  }, [allEvents, searchName]);

  return (
    <div className="min-h-screen bg-[#151414] pb-20">
      {/* User header bar */}
      <header
        className="sticky top-0 z-40 bg-[#5a0d1f] border-b border-[#c9a84c]/60 shadow-md"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.25) 0%, transparent 60%)",
        }}
      >
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <button
            type="button"
            onClick={resetToInitial}
            className="font-serif italic text-2xl md:text-3xl text-[#f0d78c] tracking-wide hover:opacity-80 transition-opacity drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
          >
            Serra Eventos
          </button>
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 group">
                    <Avatar className="w-9 h-9 border border-[#c9a84c]/50">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="text-sm bg-neutral-600 text-white font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-[#f0d78c]/80 group-hover:text-[#f0d78c] transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setActiveNav("profile")}>
                    <User className="w-4 h-4 mr-2" />
                    Meu perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate("/auth")}
                className="gap-2 bg-transparent hover:bg-[#c9a84c]/10 text-[#f0d78c] border border-[#c9a84c]/70 rounded-full px-4"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      {activeNav === "events" ? (
        <>
          <FeaturedCarousel events={featuredEvents} onSelect={setSelectedEvent} subcategoryImages={subcategoryImages} categoryImages={categoryImages} keywordImages={keywordImages} />

          <div ref={eventsRef} className="container mx-auto px-4 py-6 text-gray-100 bg-[#151414]">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
              </div>
              {isAdmin && selectedIds.size > 0 && (
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Excluir ({selectedIds.size})
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
              totalResults={upcomingEvents.length}
              searchCity={searchCity}
              onSearchCityChange={setSearchCity}
              filterMonth={filterMonth}
              onFilterMonthChange={setFilterMonth}
              availableCities={availableCities}
              allDates={allDates}
              onAllDatesChange={setAllDates}
              searchName={searchName}
              onSearchNameChange={setSearchName}
              selectedSubcategories={selectedSubcategories}
              onToggleSubcategory={toggleFilterSubcategory}
              onScrollToResults={handleScrollToResults}
              onClearFilters={handleClearFilters}
            />

            {user && forYouEvents.length > 0 && (
              <ForYouCarousel
                events={forYouEvents.slice(0, 8)}
                onSelect={setSelectedEvent}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                isAdmin={isAdmin}
                subcategoryImages={subcategoryImages}
                categoryImages={categoryImages}
                keywordImages={keywordImages}
              />
            )}

            <div className="mt-6">
              <p className="text-sm mb-4 text-neutral-400">
                <span className="text-[#1DB954] font-bold">{upcomingEvents.length}</span> evento{upcomingEvents.length !== 1 && "s"} encontrado{upcomingEvents.length !== 1 && "s"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {upcomingEvents.map(({ event }, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelect={setSelectedEvent}
                    index={i}
                    selected={selectedIds.has(event.id)}
                    onToggleSelect={toggleSelect}
                    isFavorite={isFavorite(event.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isAdmin={isAdmin}
                    subcategoryImages={subcategoryImages}
                    categoryImages={categoryImages}
                    keywordImages={keywordImages}
                    recurrenceLabel={recurrenceMap.get(event.id)?.label || null}
                  />
                ))}
              </div>
              {upcomingEvents.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-xl font-serif text-muted-foreground">Nenhum evento encontrado</p>
                  <p className="text-sm text-muted-foreground mt-2">Tente ajustar os filtros ou adicione novos eventos.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeNav === "explore" ? (
        <ExplorePage
          events={allEvents}
          onSelectEvent={setSelectedEvent}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          isAdmin={isAdmin}
          categoryImagesMap={categoryImages}
          keywordImagesMap={keywordImages}
          resetSignal={exploreResetSignal}
        />
      
      ) : (
        <ProfilePage
          interests={interests}
          onToggleCategory={toggleInterestCategory}
          onToggleSubcategory={toggleSubcategory}
          favoriteEvents={favoriteEvents}
          onSelectEvent={setSelectedEvent}
          onToggleFavorite={handleToggleFavorite}
          isFavorite={isFavorite}
          onAddEvent={() => setAddOpen(true)}
          onImportEvents={() => setImportOpen(true)}
          onOutdoorSettings={() => setOutdoorSettingsOpen(true)}
          onDeleteAll={() => setDeleteAllOpen(true)}
          onDeleteFiltered={() => setDeleteFilteredOpen(true)}
          onDetectDuplicates={() => setDuplicateDetectorOpen(true)}
          availableCities={availableCities}
          allEventsCount={allEvents.length}
        />
      )}

      <BottomNav active={activeNav} onChange={handleNavChange} onCreate={handleCreate} />
      <LoginRequiredModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={setEditEvent}
        onDelete={setDeleteTarget}
        isAdmin={isAdmin}
        isFavorite={selectedEvent ? isFavorite(selectedEvent.id) : false}
        onToggleFavorite={handleToggleFavorite}
        subcategoryImages={subcategoryImages}
        categoryImages={categoryImages}
        keywordImages={keywordImages}
      />
      <EditEventForm event={editEvent} open={!!editEvent} onClose={() => setEditEvent(null)} onUpdated={fetchDbEvents} />
      <ImportEvents open={importOpen} onClose={() => setImportOpen(false)} onImported={fetchDbEvents} />
      <AddEventForm open={addOpen} onClose={() => setAddOpen(false)} onAdded={fetchDbEvents} />
      <OutdoorSettings open={outdoorSettingsOpen} onClose={() => setOutdoorSettingsOpen(false)} events={allEvents} onUpdated={fetchDbEvents} />
      <DuplicateDetector open={duplicateDetectorOpen} onClose={() => setDuplicateDetectorOpen(false)} events={allEvents} onUpdated={fetchDbEvents} />

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

      {/* Delete by filter (month / city) */}
      <AlertDialog open={deleteFilteredOpen} onOpenChange={setDeleteFilteredOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir eventos por filtro</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione um mês e/ou uma cidade. Apenas eventos que correspondem aos filtros serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mês</label>
              <Input
                type="month"
                value={deleteFilterMonth}
                onChange={(e) => setDeleteFilterMonth(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cidade</label>
              <select
                value={deleteFilterCity}
                onChange={(e) => setDeleteFilterCity(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Todas as cidades</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredForDeletion.length} evento(s) corresponde(m) aos filtros.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFiltered}
              disabled={filteredForDeletion.length === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir {filteredForDeletion.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
