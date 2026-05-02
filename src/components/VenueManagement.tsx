import { useState } from "react";
import { useVenues, type Venue } from "@/hooks/useVenues";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ContactsEditor from "./ContactsEditor";
import type { VenueContact } from "@/types/contact";
import AdminSection from "@/components/AdminSection";

interface VenueManagementProps {
  expanded?: boolean;
  onToggle?: () => void;
}

const VenueManagement = ({ expanded: expandedProp, onToggle }: VenueManagementProps) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = expandedProp ?? internalExpanded;
  const handleToggle = onToggle ?? (() => setInternalExpanded((v) => !v));
  const { venues, loading, refresh } = useVenues();
  const [editing, setEditing] = useState<Venue | null>(null);
  const [editName, setEditName] = useState("");
  const [editContacts, setEditContacts] = useState<VenueContact[]>([]);
  const [saving, setSaving] = useState(false);

  const openEdit = (v: Venue) => {
    setEditing(v);
    setEditName(v.nome);
    setEditContacts(v.contacts.map((c) => ({ ...c })));
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editName.trim()) {
      toast.error("Nome do local é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      if (editName.trim() !== editing.nome) {
        const { error } = await supabase
          .from("venues")
          .update({ nome: editName.trim() })
          .eq("id", editing.id);
        if (error) throw error;
      }

      const { error: delErr } = await supabase
        .from("venue_contacts")
        .delete()
        .eq("venue_id", editing.id);
      if (delErr) throw delErr;

      const toInsert = editContacts
        .filter((c) => c.nome || c.whatsapp || c.instagram || c.facebook)
        .map((c) => ({
          venue_id: editing.id,
          nome: c.nome?.trim() || null,
          whatsapp: c.whatsapp?.trim() || null,
          instagram: c.instagram?.trim() || null,
          facebook: c.facebook?.trim() || null,
        }));

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("venue_contacts").insert(toInsert);
        if (insErr) throw insErr;
      }

      toast.success("Local atualizado!");
      setEditing(null);
      refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: Venue) => {
    if (!confirm(`Excluir o local "${v.nome}"? Os eventos vinculados perderão a referência mas não serão excluídos.`)) return;
    const { error } = await supabase.from("venues").delete().eq("id", v.id);
    if (error) {
      toast.error("Erro ao excluir.");
      return;
    }
    toast.success("Local excluído.");
    refresh();
  };

  return (
    <>
      <AdminSection
        title="Locais"
        icon={<MapPin className="w-5 h-5" />}
        expanded={expanded}
        onToggle={handleToggle}
        count={venues.length}
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : venues.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum local cadastrado ainda. Locais são criados automaticamente ao importar eventos.</p>
        ) : (
          <div className="space-y-2">
            {venues.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1c1c1c] border border-border">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-200 truncate">{v.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.contacts.length} contato{v.contacts.length === 1 ? "" : "s"}
                    {v.cidade ? ` • ${v.cidade}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(v)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Local</DialogTitle>
            <DialogDescription>
              As alterações nos contatos refletem automaticamente nos eventos vinculados (exceto contatos personalizados manualmente nos eventos).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do local</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={200} />
            </div>
            <ContactsEditor
              contacts={editContacts}
              onChange={setEditContacts}
              title="Contatos do local"
              description="Estes contatos serão exibidos automaticamente em todos os eventos vinculados a este local."
            />
            <Button onClick={handleSave} disabled={saving} className="w-full h-11">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VenueManagement;
