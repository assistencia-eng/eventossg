import { supabase } from "@/integrations/supabase/client";
import type { VenueContact } from "@/types/contact";

/** Normaliza valor para comparação (ignorando case, espaços e símbolos). */
const normKey = (v?: string | null) => (v || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

/**
 * Mescla os contatos do evento (`custom_contacts`) na tabela `venue_contacts`
 * do venue informado, sem duplicar.
 *
 * Regras:
 * - Cada contato é considerado duplicado se compartilhar whatsapp OU instagram OU facebook
 *   (após normalização) com algum existente no venue.
 * - Contatos com mais informações que um existente são mesclados (preenche campos vazios).
 * - Contatos novos (sem match) são inseridos.
 * - Nunca remove contatos existentes do venue.
 */
export const syncContactsToVenue = async (
  venueId: string,
  eventContacts: VenueContact[]
): Promise<{ inserted: number; merged: number }> => {
  if (!venueId || !Array.isArray(eventContacts) || eventContacts.length === 0) {
    return { inserted: 0, merged: 0 };
  }

  const { data: existing, error } = await supabase
    .from("venue_contacts")
    .select("id, nome, whatsapp, instagram, facebook")
    .eq("venue_id", venueId);

  if (error) {
    console.error("syncContactsToVenue fetch:", error);
    return { inserted: 0, merged: 0 };
  }

  const existingList: VenueContact[] = (existing || []) as any;
  let inserted = 0;
  let merged = 0;

  for (const c of eventContacts) {
    const cw = normKey(c.whatsapp);
    const ci = normKey(c.instagram);
    const cf = normKey(c.facebook);
    if (!cw && !ci && !cf && !c.nome?.trim()) continue;

    // Procura match em algum dos canais.
    const match = existingList.find((e) => {
      const ew = normKey(e.whatsapp);
      const ei = normKey(e.instagram);
      const ef = normKey(e.facebook);
      return (cw && ew && cw === ew) || (ci && ei && ci === ei) || (cf && ef && cf === ef);
    });

    if (match && match.id) {
      // Mescla: preenche apenas campos vazios no existente.
      const patch: Partial<VenueContact> = {};
      if (!match.nome && c.nome?.trim()) patch.nome = c.nome.trim();
      if (!match.whatsapp && c.whatsapp?.trim()) patch.whatsapp = c.whatsapp.trim();
      if (!match.instagram && c.instagram?.trim()) patch.instagram = c.instagram.trim();
      if (!match.facebook && c.facebook?.trim()) patch.facebook = c.facebook.trim();
      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await supabase
          .from("venue_contacts")
          .update(patch)
          .eq("id", match.id);
        if (!upErr) {
          merged++;
          Object.assign(match, patch);
        } else {
          console.error("syncContactsToVenue update:", upErr);
        }
      }
    } else {
      const { data: inserted_row, error: insErr } = await supabase
        .from("venue_contacts")
        .insert({
          venue_id: venueId,
          nome: c.nome?.trim() || null,
          whatsapp: c.whatsapp?.trim() || null,
          instagram: c.instagram?.trim() || null,
          facebook: c.facebook?.trim() || null,
        })
        .select("id, nome, whatsapp, instagram, facebook")
        .single();
      if (!insErr && inserted_row) {
        inserted++;
        existingList.push(inserted_row as any);
      } else if (insErr) {
        console.error("syncContactsToVenue insert:", insErr);
      }
    }
  }

  return { inserted, merged };
};
