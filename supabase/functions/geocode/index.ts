import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "Gramado": { lat: -29.3731, lng: -50.8760 },
  "Canela": { lat: -29.3645, lng: -50.8116 },
  "Bento Gonçalves": { lat: -29.1699, lng: -51.5187 },
  "Caxias do Sul": { lat: -29.1685, lng: -51.1794 },
  "Garibaldi": { lat: -29.2544, lng: -51.5336 },
  "Carlos Barbosa": { lat: -29.2970, lng: -51.5040 },
  "Flores da Cunha": { lat: -29.0289, lng: -51.1833 },
  "Nova Petrópolis": { lat: -29.3726, lng: -51.1144 },
  "São Marcos": { lat: -28.9696, lng: -51.0686 },
};

function findCityCoords(cidade: string): { lat: number; lng: number } | null {
  const normalized = cidade.trim().toLowerCase();
  for (const [name, coords] of Object.entries(cityCoordinates)) {
    if (name.toLowerCase() === normalized) return coords;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { endereco, cidade } = await req.json();

    if (!cidade && !endereco) {
      return new Response(
        JSON.stringify({ latitude: -29.3731, longitude: -50.876, hasExactLocation: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const query = endereco && endereco !== "Não informado"
      ? `${endereco}, ${cidade}, Rio Grande do Sul, Brasil`
      : `${cidade}, Rio Grande do Sul, Brasil`;

    const isExactQuery = endereco && endereco !== "Não informado";

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "SerraGauchaEventos/1.0 (lovable.dev)" },
    });

    if (!response.ok) {
      console.error("Nominatim error:", response.status);
      const fallback = findCityCoords(cidade) || { lat: -29.3731, lng: -50.876 };
      return new Response(
        JSON.stringify({ latitude: fallback.lat, longitude: fallback.lng, hasExactLocation: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await response.json();

    if (results.length > 0) {
      return new Response(
        JSON.stringify({
          latitude: parseFloat(results[0].lat),
          longitude: parseFloat(results[0].lon),
          hasExactLocation: !!isExactQuery,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback to city coordinates
    const fallback = findCityCoords(cidade) || { lat: -29.3731, lng: -50.876 };
    return new Response(
      JSON.stringify({ latitude: fallback.lat, longitude: fallback.lng, hasExactLocation: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("geocode error:", e);
    return new Response(
      JSON.stringify({ latitude: -29.3731, longitude: -50.876, hasExactLocation: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
