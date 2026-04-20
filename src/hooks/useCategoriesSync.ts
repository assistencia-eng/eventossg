import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  EventCategory,
  categoryLabels,
  categoryIcons,
  subcategoryOptions,
} from "@/data/events";
import { categoryColors, generateMutedColor } from "@/data/categoryColors";

const SYNC_EVENT = "categories-synced";

// Snapshot of original defaults so overrides can be reverted to base values when removed.
const defaultLabels: Record<string, string> = { ...categoryLabels };
const defaultIcons: Record<string, string> = { ...categoryIcons };
const defaultColors: Record<string, string> = Object.fromEntries(
  Object.entries(categoryColors).map(([k, v]) => [k, v.vibrant])
);

// Track custom categories we've added so we can keep state consistent
let customCategoryKeys: string[] = [];

export function getCustomCategoryKeys(): EventCategory[] {
  return customCategoryKeys as EventCategory[];
}

export function emitCategoriesSynced() {
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

async function loadAndMerge() {
  const [customRes, overridesRes] = await Promise.all([
    supabase.from("custom_categories").select("key, label, icon, color_vibrant"),
    supabase.from("category_overrides").select("key, label, icon, color_vibrant"),
  ]);

  // Reset defaults first
  Object.keys(defaultLabels).forEach((k) => {
    categoryLabels[k as EventCategory] = defaultLabels[k];
    categoryIcons[k as EventCategory] = defaultIcons[k];
    const vibrant = defaultColors[k];
    categoryColors[k as EventCategory] = { vibrant, muted: generateMutedColor(vibrant) };
  });

  // Apply overrides on defaults
  (overridesRes.data || []).forEach((row: any) => {
    const k = row.key as EventCategory;
    if (!defaultLabels[k]) return; // only override known defaults
    if (row.label) categoryLabels[k] = row.label;
    if (row.icon) categoryIcons[k] = row.icon;
    if (row.color_vibrant && /^#[0-9a-fA-F]{6}$/.test(row.color_vibrant)) {
      categoryColors[k] = { vibrant: row.color_vibrant, muted: generateMutedColor(row.color_vibrant) };
    }
  });

  // Add custom categories
  customCategoryKeys = [];
  (customRes.data || []).forEach((row: any) => {
    const k = row.key as EventCategory;
    customCategoryKeys.push(k);
    categoryLabels[k] = row.label;
    categoryIcons[k] = row.icon || "📌";
    const vibrant = /^#[0-9a-fA-F]{6}$/.test(row.color_vibrant) ? row.color_vibrant : "#6366f1";
    categoryColors[k] = { vibrant, muted: generateMutedColor(vibrant) };
    if (!subcategoryOptions[k]) subcategoryOptions[k] = [];
  });
}

export function useCategoriesSync() {
  useEffect(() => {
    loadAndMerge().then(() => emitCategoriesSynced());
  }, []);
}

export function useCategoriesVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);
  return version;
}

export async function refreshCategories() {
  await loadAndMerge();
  emitCategoriesSynced();
}
