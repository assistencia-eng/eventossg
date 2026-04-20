import { useState, useMemo, useRef, useEffect } from "react";
import { EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, ChevronDown } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { useCategoriesVersion, getCustomCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";

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
  selectedSubcategories: string[];
  onToggleSubcategory: (sub: string) => void;
}

const defaultCategories: EventCategory[] = [
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
  selectedSubcategories,
  onToggleSubcategory,
}: FilterBarProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const distanceLabel = distanceKm >= 150 ? "150+ km" : `${distanceKm} km`;

  // Re-render when categories or subcategories sync from DB
  const catsVersion = useCategoriesVersion();
  const subsVersion = useSubcategoriesVersion();

  const categories = useMemo<EventCategory[]>(() => {
    const customs = getCustomCategoryKeys();
    return [...defaultCategories, ...customs.filter((c) => !defaultCategories.includes(c))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catsVersion]);

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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 text-neutral-400" />
        <Input
          placeholder="Buscar por cidade..."
          value={searchCity}
          onChange={(e) => {
            onSearchCityChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="pl-9 bg-[#1c1c1c] text-neutral-400 opacity-80 border-0"
        />
        {showSuggestions && citySuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {citySuggestions.map((city) => (
              <button
                key={city}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors border-0 font-sans font-medium bg-[#242424]"
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
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium w-full justify-between bg-[#1c1c1c] hover:bg-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-400">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-xl overflow-hidden" style={{ backgroundColor: "#1c1c1c" }}>
            <div className="p-5 md:p-6 space-y-6">
              {/* Categories - Interests */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 text-neutral-400">
                  Interesses
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const isActive = selectedCategories.includes(cat);
                    const colors = categoryColors[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => onToggleCategory(cat)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-[22px] text-sm font-medium transition-all duration-200 cursor-pointer select-none"
                        style={{
                          backgroundColor: isActive ? colors.vibrant : colors.muted,
                          color: isActive ? "#fff" : colors.vibrant,
                          border: `1px solid ${isActive ? colors.vibrant : "transparent"}`,
                        }}
                      >
                        <span className="text-base">{categoryIcons[cat]}</span>
                        <span>{categoryLabels[cat]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Subcategories for selected categories */}
                {selectedCategories.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedCategories.map((cat) => {
                      const subs = subcategoryOptions[cat];
                      if (!subs || subs.length === 0) return null;
                      const colors = categoryColors[cat];
                      return (
                        <div key={cat}>
                          <p className="text-xs text-neutral-500 mb-1.5">
                            {categoryIcons[cat]} {categoryLabels[cat]}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {subs.map((sub) => {
                              const isActive = selectedSubcategories.includes(sub);
                              return (
                                <button
                                  key={sub}
                                  onClick={() => onToggleSubcategory(sub)}
                                  className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer select-none"
                                  style={{
                                    backgroundColor: isActive ? colors.vibrant : "rgba(255,255,255,0.06)",
                                    color: isActive ? "#fff" : colors.vibrant,
                                    border: `1px solid ${isActive ? colors.vibrant : "rgba(255,255,255,0.1)"}`,
                                  }}
                                >
                                  {sub}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Distance slider */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-neutral-400">
                  Distância: <span className="text-white">{distanceLabel}</span>
                  {!hasLocation && <span className="text-xs font-normal normal-case ml-1 text-neutral-500">(ative a localização)</span>}
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
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-neutral-500">1 km</span>
                  <span className="text-neutral-500">150+ km</span>
                </div>
              </div>

              {/* Month filter with "all dates" toggle */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-neutral-400">
                  Período
                </h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-neutral-300">Todas as datas</span>
                  <Switch checked={allDates} onCheckedChange={(checked) => onAllDatesChange(checked)} />
                </div>
                {!allDates && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => onFilterMonthChange(subMonths(filterMonth, 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 transition-colors text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium min-w-[140px] text-center capitalize text-white">
                      {format(filterMonth, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <button
                      onClick={() => onFilterMonthChange(addMonths(filterMonth, 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 transition-colors text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

    </div>
  );
};

export default FilterBar;
