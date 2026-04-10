import { useState, useCallback, useEffect } from "react";
import { EventCategory } from "@/data/events";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserInterests {
  categories: EventCategory[];
  subcategories: string[];
}

export const useUserInterests = () => {
  const { user, profile } = useAuth();
  const [interests, setInterests] = useState<UserInterests>({ categories: [], subcategories: [] });

  useEffect(() => {
    if (profile?.interests && profile.interests.length > 0) {
      try {
        // interests is stored as a JSON string array: ["categories:cat1,cat2", "subcategories:sub1,sub2"]
        const parsed = parseInterests(profile.interests);
        setInterests(parsed);
      } catch {
        setInterests({ categories: [], subcategories: [] });
      }
    } else {
      setInterests({ categories: [], subcategories: [] });
    }
  }, [profile]);

  const persist = useCallback(async (newInterests: UserInterests) => {
    if (!user) return;
    const serialized = serializeInterests(newInterests);
    await supabase
      .from("profiles")
      .update({ interests: serialized })
      .eq("user_id", user.id);
  }, [user]);

  const toggleCategory = useCallback((cat: EventCategory) => {
    setInterests((prev) => {
      const updated = {
        ...prev,
        categories: prev.categories.includes(cat)
          ? prev.categories.filter((c) => c !== cat)
          : [...prev.categories, cat],
      };
      persist(updated);
      return updated;
    });
  }, [persist]);

  const toggleSubcategory = useCallback((sub: string) => {
    setInterests((prev) => {
      const updated = {
        ...prev,
        subcategories: prev.subcategories.includes(sub)
          ? prev.subcategories.filter((s) => s !== sub)
          : [...prev.subcategories, sub],
      };
      persist(updated);
      return updated;
    });
  }, [persist]);

  return { interests, toggleCategory, toggleSubcategory };
};

function serializeInterests(i: UserInterests): string[] {
  return [
    `categories:${i.categories.join(",")}`,
    `subcategories:${i.subcategories.join(",")}`,
  ];
}

function parseInterests(arr: string[]): UserInterests {
  let categories: EventCategory[] = [];
  let subcategories: string[] = [];
  for (const item of arr) {
    if (item.startsWith("categories:")) {
      const val = item.replace("categories:", "");
      categories = val ? val.split(",") as EventCategory[] : [];
    } else if (item.startsWith("subcategories:")) {
      const val = item.replace("subcategories:", "");
      subcategories = val ? val.split(",") : [];
    }
  }
  return { categories, subcategories };
}
