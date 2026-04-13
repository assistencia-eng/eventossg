import { useState } from "react";
import { EventData } from "@/data/events";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Trash2, Type } from "lucide-react";

interface OutdoorSettingsProps {
  open: boolean;
  onClose: () => void;
  events: EventData[];
  onUpdated: () => void;
}

const OutdoorSettings = ({ open, onClose, events, onUpdated }: OutdoorSettingsProps) => {
  const featuredEvents = events.filter((e) => e.is_featured);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const updateTextSettings = async (eventId: string, field: string, value: any) => {
    const updateData: Record<string, any> = {};
    updateData[field] = value;
    const { error } = await supabase
      .from("events")
      .update(updateData as any)
      .eq("id", eventId);
    if (error) toast.error("Erro ao atualizar.");
    else onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-sans text-xl flex items-center gap-2">
            <Settings className="w-5 h-5" /> Configurações do Outdoor
          </DialogTitle>
          <DialogDescription>
            Gerencie quais eventos aparecem no destaque, tempo de exibição e formatação dos textos.
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
            <div key={event.id} className="rounded-lg bg-muted/50 overflow-hidden">
              <div className="flex items-center gap-3 p-3">
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
                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                    title="Formatação do texto"
                  >
                    <Type className="w-4 h-4 text-primary" />
                  </Button>
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

              {/* Text formatting panel */}
              {expandedId === event.id && (
                <div className="px-3 pb-3 space-y-4 border-t border-border pt-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Posição vertical do texto</Label>
                    <Select
                      defaultValue={event.outdoor_text_position || "bottom"}
                      onValueChange={(v) => updateTextSettings(event.id, "outdoor_text_position", v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Topo</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="bottom">Inferior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Alinhamento horizontal</Label>
                    <Select
                      defaultValue={event.outdoor_text_align || "left"}
                      onValueChange={(v) => updateTextSettings(event.id, "outdoor_text_align", v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Tamanho do título: {event.outdoor_title_size || 28}px</Label>
                    <Slider
                      defaultValue={[event.outdoor_title_size || 28]}
                      min={16}
                      max={48}
                      step={1}
                      onValueCommit={(v) => updateTextSettings(event.id, "outdoor_title_size", v[0])}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Exibir descrição</Label>
                    <Switch
                      checked={event.outdoor_show_description ?? true}
                      onCheckedChange={(v) => updateTextSettings(event.id, "outdoor_show_description", v)}
                    />
                  </div>
                </div>
              )}
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
