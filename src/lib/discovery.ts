import { EventData } from "@/data/events";

export interface UserInterests {
  categories: string[];
  subcategories: string[];
}

export const getRecommendedEvents = (
  allEvents: EventData[],
  interests: UserInterests,
  favoriteIds: Set<string>
): EventData[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter out past events
  const upcomingEvents = allEvents.filter((event) => {
    const end = event.data_fim ? new Date(event.data_fim) : new Date(event.data);
    return end >= today;
  });

  // Calculate scores for each event
  const scoredEvents = upcomingEvents.map((event) => {
    let score = 0;

    // 1. Matches user interests (Categories)
    const matchesCat = event.categorias?.some((c) => interests.categories.includes(c)) ||
      interests.categories.includes(event.categoria);
    if (matchesCat) score += 10;

    // 2. Matches user interests (Subcategories)
    const matchesSub = event.subcategorias?.some((s) => interests.subcategories.includes(s));
    if (matchesSub) score += 20;

    // 3. Favorited events keywords/categories (affinity)
    const favorites = upcomingEvents.filter(e => favoriteIds.has(e.id));
    const favoriteCats = new Set(favorites.flatMap(f => f.categorias || [f.categoria]));
    const favoriteSubs = new Set(favorites.flatMap(f => f.subcategorias || []));

    if (event.categorias?.some(c => favoriteCats.has(c)) || favoriteCats.has(event.categoria)) {
      score += 5;
    }
    if (event.subcategorias?.some(s => favoriteSubs.has(s))) {
      score += 10;
    }

    // 4. Boost featured events
    if (event.is_featured) score += 5;

    return { event, score };
  });

  // Sort by score descending, then by date ascending
  const sorted = scoredEvents.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.event.data).getTime() - new Date(b.event.data).getTime();
  });

  // If no interests/favorites, return featured and trending
  if (interests.categories.length === 0 && interests.subcategories.length === 0 && favoriteIds.size === 0) {
    return upcomingEvents
      .sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
        return new Date(a.data).getTime() - new Date(b.data).getTime();
      })
      .slice(0, 20);
  }

  return sorted.map((s) => s.event).slice(0, 20);
};
