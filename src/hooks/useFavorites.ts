import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "event-favorites";

export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favoriteIds]));
  }, [favoriteIds]);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return { favoriteIds, toggleFavorite, isFavorite };
};
