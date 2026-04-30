import { whatsappLink, instagramLink, facebookLink, type VenueContact } from "@/types/contact";
import { MessageCircle, Instagram, Facebook } from "lucide-react";

interface ContactsDisplayProps {
  contacts: VenueContact[];
}

const formatPhone = (raw: string | null | undefined): string => {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw as string;
};

const openExternal = (e: React.MouseEvent, url: string) => {
  e.preventDefault();
  e.stopPropagation();
  window.open(url, "_blank", "noopener,noreferrer");
};

const ContactsDisplay = ({ contacts }: ContactsDisplayProps) => {
  const valid = contacts.filter((c) => c.whatsapp || c.instagram || c.facebook || c.nome);
  if (valid.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">Contatos</h3>
      <div className="space-y-2">
        {valid.map((c, idx) => {
          const wa = whatsappLink(c.whatsapp);
          const ig = instagramLink(c.instagram);
          const fb = facebookLink(c.facebook);
          const phoneLabel = formatPhone(c.whatsapp);
          const igLabel = c.instagram ? String(c.instagram).replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "") : "";
          const fbLabel = c.facebook ? String(c.facebook).replace(/^https?:\/\/(www\.)?(facebook|fb)\.com\//i, "").replace(/^@/, "") : "";
          return (
            <div key={c.id || idx} className="p-3 rounded-lg bg-[#1c1c1c] border border-border space-y-2">
              {c.nome && <p className="text-sm font-medium text-neutral-200">{c.nome}</p>}
              <div className="flex flex-wrap gap-2">
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openExternal(e, wa)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> {phoneLabel || "WhatsApp"}
                  </a>
                )}
                {ig && (
                  <a
                    href={ig}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openExternal(e, ig)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#E4405F]/10 text-[#E4405F] border border-[#E4405F]/30 hover:bg-[#E4405F]/20 transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" /> @{igLabel || "instagram"}
                  </a>
                )}
                {fb && (
                  <a
                    href={fb}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openExternal(e, fb)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30 hover:bg-[#1877F2]/20 transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5" /> {fbLabel || "Facebook"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContactsDisplay;
