import { useState, useMemo, useRef, useEffect } from "react";
import { EventCategory, categoryLabels, categoryIcons } from "@/data/events";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, ChevronDown } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";

interface FilterBarProps {
  selectedCategories: EventCategory[];
  onToggleCategory: (cat: EventCategory) => void;
  distanceKm: number;
  onDistanceChange: (km: number) => void;
  hasLocation: boolean;
  totalResults: number;
  searchCity: string;
  onSearchCityChange: (val: string) => void;
  filterMonth: Date;
  onFilterMonthChange: (d: Date) => void;
  availableCities: string[];
  allDates: boolean;
  onAllDatesChange: (val: boolean) => void;
  searchName: string;
  onSearchNameChange: (val: string) => void;
}

const categories: EventCategory[] = [
  "musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"
];

const FilterBar = ({
  selectedCategories,
  onToggleCategory,
  distanceKm,
  onDistanceChange,
  hasLocation,
  totalResults,
  searchCity,
  onSearchCityChange,
  filterMonth,
  onFilterMonthChange,
  availableCities,
  allDates,
  onAllDatesChange,
  searchName,
  onSearchNameChange,
}: FilterBarProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const distanceLabel = distanceKm >= 150 ? "150+ km" : `${distanceKm} km`;

  const citySuggestions = useMemo(() => {
    if (!searchCity.trim()) return [];
    const q = searchCity.trim().toLowerCase();
    return availableCities.filter((c) => c.toLowerCase().includes(q)).slice(0, 6);
  }, [searchCity, availableCities]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeFilterCount = selectedCategories.length + (distanceKm < 155 ? 1 : 0) + (searchCity.trim() ? 1 : 0) + (!allDates ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search bar always visible */}
      <div ref={searchRef} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          placeholder="Buscar por cidade..."
          value={searchCity}
          onChange={(e) => {
            onSearchCityChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="pl-9"
        />
        {showSuggestions && citySuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {citySuggestions.map((city) => (
              <button
                key={city}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
                onClick={() => {
                  onSearchCityChange(city);
                  setShowSuggestions(false);
                }}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium w-full justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="glass-card rounded-2xl p-5 md:p-6 space-y-5 mt-2 bg-wine-dark">
            {/* Categories */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-amber-50">
                Interesses
              </h3>
              <div className="flex flex-wrap gap-2 bg-wine-dark">
                {categories.map((cat) => {
                  const isActive = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => onToggleCategory(cat)}
                      className={`category-chip category-chip-${cat} ${isActive ? "active" : ""} ${cat === 'esporte' ? 'text-amber-100' : ''} ${['musica', 'entretenimento', 'feiras'].includes(cat) ? 'text-amber-50' : ''}`}
                    >
                      <span className="mr-1.5">{categoryIcons[cat]}</span>
                      {categoryLabels[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Distance slider */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-amber-100">
                Distância: <span className="text-amber-50">{distanceLabel}</span>
                {!hasLocation && <span className="text-xs font-normal normal-case ml-1">(ative a localização)</span>}
              </h3>
              <Slider
                value={[distanceKm]}
                onValueChange={([v]) => onDistanceChange(v)}
                min={1}
                max={155}
                step={1}
                disabled={!hasLocation}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span className="text-amber-50">1 km</span>
                <span className="text-amber-50">150+ km</span>
              </div>
            </div>

            {/* Month filter with "all dates" toggle */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-amber-50">
                Período
              </h3>
              <div className="flex items-center justify-between mb-3 text-amber-50">
                <span className="text-sm font-medium">Todas as datas</span>
                <Switch checked={allDates} onCheckedChange={(checked) => onAllDatesChange(checked)} />
              </div>
              {!allDates && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => onFilterMonthChange(subMonths(filterMonth, 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium min-w-[140px] text-center capitalize">
                    {format(filterMonth, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <button
                    onClick={() => onFilterMonthChange(addMonths(filterMonth, 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results count */}
      <div className="px-1">
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{totalResults}</strong> evento{totalResults !== 1 && "s"} encontrado{totalResults !== 1 && "s"}
        </span>
      </div>
    </div>
  );
};

export default FilterBar;
