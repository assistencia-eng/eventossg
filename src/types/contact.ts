export interface VenueContact {
  id?: string;
  nome?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
}

/** Normaliza número WhatsApp para formato wa.me (apenas dígitos) */
export const normalizeWhatsapp = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  // Adiciona DDI 55 se número brasileiro sem DDI (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

export const whatsappLink = (raw: string | null | undefined): string | null => {
  const n = normalizeWhatsapp(raw);
  return n ? `https://wa.me/${n}` : null;
};

/** Garante URL completa para Instagram (perfil ou link). */
export const instagramLink = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "").replace(/^instagram\.com\//i, "");
  return `https://instagram.com/${handle}`;
};

export const facebookLink = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "").replace(/^facebook\.com\//i, "").replace(/^fb\.com\//i, "");
  return `https://facebook.com/${handle}`;
};

/**
 * Detecta automaticamente contatos em texto livre.
 * Retorna no máximo 1 contato consolidado a partir do que for encontrado.
 */
export const detectContactsInText = (text: string): VenueContact[] => {
  if (!text) return [];
  const result: VenueContact = {};

  // WhatsApp / telefone (BR): (xx) xxxxx-xxxx, xx xxxxx-xxxx, +55..., wa.me/...
  const waMatch = text.match(/wa\.me\/(\d{10,15})/i);
  const phoneMatch = text.match(/(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/);
  if (waMatch) result.whatsapp = waMatch[1];
  else if (phoneMatch) result.whatsapp = phoneMatch[0];

  // Instagram
  const igUrl = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i);
  const igHandle = text.match(/(?:^|\s)@([a-zA-Z0-9._]{3,30})/);
  if (igUrl) result.instagram = igUrl[1];
  else if (igHandle && /instagram|insta|@/i.test(text)) result.instagram = igHandle[1];

  // Facebook
  const fbUrl = text.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/([a-zA-Z0-9.\-_]+)/i);
  if (fbUrl) result.facebook = fbUrl[1];

  if (result.whatsapp || result.instagram || result.facebook) {
    return [result];
  }
  return [];
};
