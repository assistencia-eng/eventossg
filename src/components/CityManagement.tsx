import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminSection from "@/components/AdminSection";

interface CityRow {
  cidade: string;
  count: number;
}

interface CityManagementProps {
  expanded?: boolean;
  onToggle?: () => void;
}

const CityManagement = ({ expanded = false, onToggle }: CityManagementProps) => {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCities = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("events").select("cidade");
    if (error) {
      toast.error("Erro ao carregar cidades.");
      setLoading(false);
      return;
    }
    const counts: Record<string, number> = {};
    (data || []).forEach((r: { cidade: string }) => {
      const c = (r.cidade || "").trim();
      if (!c || c === "Não informado") return;
      counts[c] = (counts[c] || 0) + 1;
    });
    setCities(
      Object.entries(counts)
        .map(([cidade, count]) => ({ cidade, count }))
        .sort((a, b) => a.cidade.localeCompare(b.cidade))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const openEdit = (cidade: string) => {
    setEditing(cidade);
    setNewName(cidade);
  };

  const handleSave = async () => {
    if (!editing || !newName.trim()) return;
    if (newName.trim() === editing) {
      setEditing(null);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("events")
      .update({ cidade: newName.trim() })
      .eq("cidade", editing);
    setSaving(false);
    if (error) {
      toast.error("Erro ao renomear cidade.");
      return;
    }
    toast.success(`Cidade renomeada para "${newName.trim()}"`);
    // Atualiza venues que tinham essa cidade
    await supabase.from("venues").update({ cidade: newName.trim() }).eq("cidade", editing);
    setEditing(null);
    fetchCities();
  };

  return (
    <>
      <AdminSection
        title="Cidades cadastradas"
        icon={<MapPin className="w-5 h-5" />}
        expanded={expanded}
        onToggle={onToggle ?? (() => {})}
        count={cities.length}
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : cities.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma cidade com eventos.</p>
        ) : (
          <div className="space-y-2">
            {cities.map((c) => (
              <div key={c.cidade} className="flex items-center justify-between p-3 rounded-lg bg-[#1c1c1c] border border-border">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-200 truncate">{c.cidade}</p>
                  <p className="text-xs text-muted-foreground">{c.count} evento{c.count === 1 ? "" : "s"}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c.cidade)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear cidade</DialogTitle>
            <DialogDescription>
              Todos os eventos da cidade "{editing}" serão atualizados automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              placeholder="Novo nome"
            />
            <Button onClick={handleSave} disabled={saving || !newName.trim()} className="w-full h-11">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CityManagement;
