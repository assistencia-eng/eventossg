import { EventCategory, categoryLabels, categoryIcons } from "@/data/events";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface FilterBarProps {
  selectedCategories: EventCategory[];
  onToggleCategory: (cat: EventCategory) => void;
  distanceKm: number | null;
  onDistanceChange: (km: number | null) => void;
  sortBy: "date" | "distance";
  onSortChange: (sort: "date" | "distance") => void;
  hasLocation: boolean;
  totalResults: number;
  cities: string[];
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
}

const distanceOptions = [
  { value: null, label: "Todas" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
];

const categories: EventCategory[] = [
  "musica", "esporte", "teatro", "alimentacao", "palestras", "feiras", "empreendedorismo"
];

const FilterBar = ({
  selectedCategories,
  onToggleCategory,
  distanceKm,
  onDistanceChange,
  sortBy,
  onSortChange,
  hasLocation,
  totalResults,
  cities,
  selectedCity,
  onCityChange,
}: FilterBarProps) => {
  return (
    <div className="glass-card rounded-2xl p-5 md:p-6 space-y-5">
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

      {/* City filter */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Cidade
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCityChange(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
              ${selectedCity === null
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
          >
            Todas
          </button>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => onCityChange(city)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
                ${selectedCity === city
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Distance */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Distância {!hasLocation && <span className="text-xs font-normal normal-case">(ative a localização)</span>}
        </h3>
        <div className="flex flex-wrap gap-2">
          {distanceOptions.map((opt) => (
            <button
              key={opt.label}
              disabled={!hasLocation && opt.value !== null}
              onClick={() => onDistanceChange(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                ${distanceKm === opt.value
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }
                ${!hasLocation && opt.value !== null ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort + Results count */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{totalResults}</strong> evento{totalResults !== 1 && "s"} encontrado{totalResults !== 1 && "s"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onSortChange("date")}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              sortBy === "date" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Por data
          </button>
          <button
            onClick={() => onSortChange("distance")}
            disabled={!hasLocation}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              sortBy === "distance" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
            } ${!hasLocation ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Por proximidade
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
