import { EventCategory, categoryLabels, categoryIcons } from "@/data/events";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}: FilterBarProps) => {
  const distanceLabel = distanceKm >= 150 ? "150+ km" : `${distanceKm} km`;

  return (
    <div className="glass-card rounded-2xl p-5 md:p-6 space-y-5">
      {/* City search */}
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cidade..."
            value={searchCity}
            onChange={(e) => onSearchCityChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Interesses
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isActive = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => onToggleCategory(cat)}
                className={`category-chip category-chip-${cat} ${isActive ? "active" : ""}`}
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
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Distância: <span className="text-foreground">{distanceLabel}</span>
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
          <span>1 km</span>
          <span>150+ km</span>
        </div>
      </div>

      {/* Month filter */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Período
        </h3>
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
      </div>

      {/* Results count */}
      <div className="pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{totalResults}</strong> evento{totalResults !== 1 && "s"} encontrado{totalResults !== 1 && "s"}
        </span>
      </div>
    </div>
  );
};

export default FilterBar;
