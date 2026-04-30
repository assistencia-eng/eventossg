import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import type { VenueContact } from "@/types/contact";

interface ContactsEditorProps {
  contacts: VenueContact[];
  onChange: (next: VenueContact[]) => void;
  title?: string;
  description?: string;
  syncToVenue?: boolean;
  onSyncToVenueChange?: (next: boolean) => void;
  showSyncToggle?: boolean;
}

const empty = (): VenueContact => ({ nome: "", whatsapp: "", instagram: "", facebook: "" });

const ContactsEditor = ({
  contacts,
  onChange,
  title = "Contatos",
  description,
  syncToVenue,
  onSyncToVenueChange,
  showSyncToggle = false,
}: ContactsEditorProps) => {
  const update = (idx: number, patch: Partial<VenueContact>) => {
    onChange(contacts.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };
  const remove = (idx: number) => onChange(contacts.filter((_, i) => i !== idx));
  const add = () => onChange([...contacts, empty()]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">{title}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {showSyncToggle && contacts.length > 0 && (
        <label className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/20 cursor-pointer">
          <Checkbox
            checked={!!syncToVenue}
            onCheckedChange={(checked) => onSyncToVenueChange?.(!!checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <span className="text-xs font-medium">Sincronizar com o local</span>
            <p className="text-[11px] text-muted-foreground">
              Ao salvar, adiciona estes contatos à biblioteca do local (sem sobrescrever os existentes), para reaproveitar em outros eventos. Os contatos personalizados continuam valendo como exceção apenas para este evento.
            </p>
          </div>
        </label>
      )}

      {contacts.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Nenhum contato cadastrado.</p>
      )}

      {contacts.map((c, idx) => (
        <div key={idx} className="space-y-2 p-3 rounded-lg border border-border bg-secondary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Contato {idx + 1}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(idx)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Input
            placeholder="Nome do responsável"
            value={c.nome || ""}
            onChange={(e) => update(idx, { nome: e.target.value })}
            maxLength={100}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              placeholder="WhatsApp (ex: 54999999999)"
              value={c.whatsapp || ""}
              onChange={(e) => update(idx, { whatsapp: e.target.value })}
              maxLength={50}
            />
            <Input
              placeholder="Instagram (@usuário ou link)"
              value={c.instagram || ""}
              onChange={(e) => update(idx, { instagram: e.target.value })}
              maxLength={200}
            />
            <Input
              placeholder="Facebook (usuário ou link)"
              value={c.facebook || ""}
              onChange={(e) => update(idx, { facebook: e.target.value })}
              maxLength={200}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactsEditor;
