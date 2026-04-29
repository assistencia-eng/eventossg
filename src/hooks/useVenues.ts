import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VenueContact } from "@/types/contact";

export interface Venue {
  id: string;
  nome: string;
  cidade: string | null;
  contacts: VenueContact[];
}

/**
 * Busca todos os locais com seus contatos agregados.
 * Usado no admin e também para resolução em tempo real de contatos por venue_id.
 */
export const useVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: vs }, { data: cs }] = await Promise.all([
      supabase.from("venues").select("id, nome, cidade").order("nome"),
      supabase.from("venue_contacts").select("id, venue_id, nome, whatsapp, instagram, facebook"),
    ]);
    const byVenue: Record<string, VenueContact[]> = {};
    (cs || []).forEach((c: any) => {
      if (!byVenue[c.venue_id]) byVenue[c.venue_id] = [];
      byVenue[c.venue_id].push({
        id: c.id,
        nome: c.nome,
        whatsapp: c.whatsapp,
        instagram: c.instagram,
        facebook: c.facebook,
      });
    });
    setVenues((vs || []).map((v: any) => ({ ...v, contacts: byVenue[v.id] || [] })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("venues-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "venues" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "venue_contacts" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  return { venues, loading, refresh: fetchAll };
};

/** Busca ou cria um venue pelo nome (case-insensitive). Retorna o id. */
export const getOrCreateVenue = async (nome: string, cidade?: string): Promise<string | null> => {
  const trimmed = nome.trim();
  if (!trimmed || trimmed === "Não informado") return null;
  const { data: existing } = await supabase
    .from("venues")
    .select("id")
    .ilike("nome", trimmed)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase
    .from("venues")
    .insert({ nome: trimmed, cidade: cidade || null })
    .select("id")
    .single();
  if (error) {
    console.error("getOrCreateVenue error:", error);
    return null;
  }
  return created?.id ?? null;
};
