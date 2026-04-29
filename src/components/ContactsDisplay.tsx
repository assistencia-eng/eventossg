import { whatsappLink, instagramLink, facebookLink, type VenueContact } from "@/types/contact";
import { MessageCircle, Instagram, Facebook } from "lucide-react";

interface ContactsDisplayProps {
  contacts: VenueContact[];
}

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
          return (
            <div key={c.id || idx} className="p-3 rounded-lg bg-[#1c1c1c] border border-border space-y-2">
              {c.nome && <p className="text-sm font-medium text-neutral-200">{c.nome}</p>}
              <div className="flex flex-wrap gap-2">
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                {ig && (
                  <a
                    href={ig}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#E4405F]/10 text-[#E4405F] border border-[#E4405F]/30 hover:bg-[#E4405F]/20 transition-colors"
                  >
                    <Instagram className="w-3.5 h-3.5" /> Instagram
                  </a>
                )}
                {fb && (
                  <a
                    href={fb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30 hover:bg-[#1877F2]/20 transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5" /> Facebook
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
