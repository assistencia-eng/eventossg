import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subcategoryOptions, EventCategory } from "@/data/events";

// Snapshot of the original defaults so we can recompute after removals.
const defaultSubcategories: Record<EventCategory, string[]> = JSON.parse(
  JSON.stringify(subcategoryOptions)
);

const SYNC_EVENT = "subcategories-synced";

export function emitSubcategoriesSynced() {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

async function loadAndMerge() {
  const [customRes, removedRes] = await Promise.all([
    supabase.from("custom_subcategories").select("categoria, subcategoria"),
    supabase.from("removed_default_subcategories").select("categoria, subcategoria"),
  ]);

  const removed = new Map<string, Set<string>>();
  (removedRes.data || []).forEach((r: { categoria: string; subcategoria: string }) => {
    if (!removed.has(r.categoria)) removed.set(r.categoria, new Set());
    removed.get(r.categoria)!.add(r.subcategoria);
  });

  // Reset to defaults minus removed
  (Object.keys(defaultSubcategories) as EventCategory[]).forEach((cat) => {
    const removedForCat = removed.get(cat) || new Set<string>();
    subcategoryOptions[cat] = defaultSubcategories[cat].filter((s) => !removedForCat.has(s));
  });

  // Add custom ones
  (customRes.data || []).forEach((r: { categoria: string; subcategoria: string }) => {
    const cat = r.categoria as EventCategory;
    if (!subcategoryOptions[cat]) subcategoryOptions[cat] = [];
    if (!subcategoryOptions[cat].includes(r.subcategoria)) {
      subcategoryOptions[cat].push(r.subcategoria);
    }
  });
}

/**
 * Top-level sync hook. Mount once (e.g. in App). Loads custom subcategories
 * from DB and merges them into the in-memory `subcategoryOptions` map.
 */
export function useSubcategoriesSync() {
  useEffect(() => {
    loadAndMerge().then(() => emitSubcategoriesSynced());
  }, []);
}

/**
 * Re-render hook for components that read `subcategoryOptions`.
 * Returns a version counter that bumps whenever subcategories change.
 */
export function useSubcategoriesVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);
  return version;
}

export async function refreshSubcategories() {
  await loadAndMerge();
  emitSubcategoriesSynced();
}
