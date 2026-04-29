import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VenueContact } from "@/types/contact";

/**
 * Resolve os contatos efetivos de um evento:
 * - Se o evento tem `custom_contacts` não-vazio (admin editou manualmente), usa esses.
 * - Senão, busca os contatos do venue vinculado em tempo real.
 */
export const useEventContacts = (
  eventId: string | null | undefined,
  venueId: string | null | undefined,
  customContacts: VenueContact[] | null | undefined
) => {
  const [contacts, setContacts] = useState<VenueContact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hasCustom = Array.isArray(customContacts) && customContacts.length > 0;

    if (hasCustom) {
      setContacts(customContacts as VenueContact[]);
      return;
    }

    if (!venueId) {
      setContacts([]);
      return;
    }

    setLoading(true);
    supabase
      .from("venue_contacts")
      .select("id, nome, whatsapp, instagram, facebook")
      .eq("venue_id", venueId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("useEventContacts:", error);
          setContacts([]);
        } else {
          setContacts((data || []) as VenueContact[]);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, venueId, JSON.stringify(customContacts || [])]);

  return { contacts, loading };
};
