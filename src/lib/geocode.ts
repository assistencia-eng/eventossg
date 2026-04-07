import { supabase } from "@/integrations/supabase/client";
import { cityCoordinates } from "@/data/events";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  hasExactLocation: boolean;
}

export async function geocodeAddress(endereco: string, cidade: string): Promise<GeocodeResult> {
  try {
    const { data, error } = await supabase.functions.invoke("geocode", {
      body: { endereco, cidade },
    });

    if (error || !data) {
      console.warn("Geocode fallback:", error);
      return getFallback(cidade);
    }

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      hasExactLocation: data.hasExactLocation,
    };
  } catch {
    return getFallback(cidade);
  }
}

function getFallback(cidade: string): GeocodeResult {
  const coords = cityCoordinates[cidade];
  return {
    latitude: coords?.lat ?? -29.3731,
    longitude: coords?.lng ?? -50.876,
    hasExactLocation: false,
  };
}

export async function geocodeBatch(
  events: Array<{ endereco: string; cidade: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<GeocodeResult[]> {
  const results: GeocodeResult[] = [];

  for (let i = 0; i < events.length; i++) {
    onProgress?.(i + 1, events.length);
    const result = await geocodeAddress(events[i].endereco, events[i].cidade);
    results.push(result);
    // Rate limit: 1 req/s for Nominatim
    if (i < events.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return results;
}
