import { useState } from "react";
import { EventData } from "@/data/events";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Trash2 } from "lucide-react";

interface OutdoorSettingsProps {
  open: boolean;
  onClose: () => void;
  events: EventData[];
  onUpdated: () => void;
}

const OutdoorSettings = ({ open, onClose, events, onUpdated }: OutdoorSettingsProps) => {
  const featuredEvents = events.filter((e) => e.is_featured);
  const [saving, setSaving] = useState<string | null>(null);

  const toggleFeatured = async (event: EventData) => {
    setSaving(event.id);
    const { error } = await supabase
      .from("events")
      .update({ is_featured: !event.is_featured })
      .eq("id", event.id);
    if (error) toast.error("Erro ao atualizar.");
    else onUpdated();
    setSaving(null);
  };

  const updateDuration = async (eventId: string, duration: number) => {
    const { error } = await supabase
      .from("events")
      .update({ outdoor_duration: Math.max(3, Math.min(30, duration)) })
      .eq("id", eventId);
    if (error) toast.error("Erro ao atualizar.");
    else onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Settings className="w-5 h-5" /> Configurações do Outdoor
          </DialogTitle>
          <DialogDescription>
            Gerencie quais eventos aparecem no destaque e o tempo de exibição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Eventos em destaque ({featuredEvents.length})
          </h3>

          {featuredEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum evento em destaque. Edite um evento e marque "Evento principal".</p>
          )}

          {featuredEvents.map((event) => (
            <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.nome}</p>
                <p className="text-xs text-muted-foreground">{event.cidade}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Label className="text-xs text-muted-foreground">Tempo (s):</Label>
                <Input
                  type="number"
                  min={3}
                  max={30}
                  defaultValue={event.outdoor_duration || 7}
                  className="w-16 h-8 text-sm"
                  onBlur={(e) => updateDuration(event.id, parseInt(e.target.value) || 7)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFeatured(event)}
                  disabled={saving === event.id}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Outros eventos
            </h3>
            {events.filter((e) => !e.is_featured).slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2">
                <span className="text-sm truncate flex-1">{event.nome}</span>
                <Switch
                  checked={false}
                  onCheckedChange={() => toggleFeatured(event)}
                  disabled={saving === event.id}
                />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OutdoorSettings;
