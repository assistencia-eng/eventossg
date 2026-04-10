import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFavorites = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile?.favorite_event_ids) {
      setFavoriteIds(new Set(profile.favorite_event_ids));
    } else {
      setFavoriteIds(new Set());
    }
  }, [profile]);

  const toggleFavorite = useCallback(async (id: string) => {
    if (!user) return false; // signal not logged in
    
    const next = new Set(favoriteIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavoriteIds(next);

    await supabase
      .from("profiles")
      .update({ favorite_event_ids: [...next] })
      .eq("user_id", user.id);
    
    return true;
  }, [user, favoriteIds]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return { favoriteIds, toggleFavorite, isFavorite };
};
