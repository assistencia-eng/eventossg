import { EventData, EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import EventCard from "@/components/EventCard";

interface ProfilePageProps {
  interests: { categories: EventCategory[]; subcategories: string[] };
  onToggleCategory: (cat: EventCategory) => void;
  onToggleSubcategory: (sub: string) => void;
  favoriteEvents: EventData[];
  onSelectEvent: (event: EventData) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const allCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const ProfilePage = ({
  interests,
  onToggleCategory,
  onToggleSubcategory,
  favoriteEvents,
  onSelectEvent,
  onToggleFavorite,
  isFavorite,
}: ProfilePageProps) => {
  return (
    <div className="container mx-auto px-4 py-6 pb-24 space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold mb-1">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Personalize sua experiência de eventos</p>
      </div>

      {/* Interests - Categories */}
      <section className="space-y-4">
        <h2 className="text-lg font-serif font-semibold">Meus Interesses</h2>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categorias</h3>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => {
              const isActive = interests.categories.includes(cat);
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

        {/* Subcategories for selected categories */}
        {interests.categories.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Subcategorias</h3>
            <div className="space-y-3">
              {interests.categories.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {categoryIcons[cat]} {categoryLabels[cat]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {subcategoryOptions[cat]?.map((sub) => {
                      const isActive = interests.subcategories.includes(sub);
                      return (
                        <button
                          key={sub}
                          onClick={() => onToggleSubcategory(sub)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-secondary-foreground border-border hover:border-primary/30"
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Favorites */}
      <section className="space-y-4">
        <h2 className="text-lg font-serif font-semibold">
          Favoritos ({favoriteEvents.length})
        </h2>
        {favoriteEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum evento favoritado ainda. Toque na ⭐ nos eventos para adicioná-los aqui.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {favoriteEvents.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={onSelectEvent}
                index={i}
                isFavorite={isFavorite(event.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProfilePage;
