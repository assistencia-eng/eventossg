import { useState, useCallback, useEffect } from "react";
import { EventCategory } from "@/data/events";

const STORAGE_KEY = "user-interests";

interface UserInterests {
  categories: EventCategory[];
  subcategories: string[];
}

export const useUserInterests = () => {
  const [interests, setInterests] = useState<UserInterests>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { categories: [], subcategories: [] };
    } catch {
      return { categories: [], subcategories: [] };
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(interests));
  }, [interests]);

  const toggleCategory = useCallback((cat: EventCategory) => {
    setInterests((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }, []);

  const toggleSubcategory = useCallback((sub: string) => {
    setInterests((prev) => ({
      ...prev,
      subcategories: prev.subcategories.includes(sub)
        ? prev.subcategories.filter((s) => s !== sub)
        : [...prev.subcategories, sub],
    }));
  }, []);

  return { interests, toggleCategory, toggleSubcategory };
};
