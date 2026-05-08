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
import { Settings, Trash2, Type, Plus } from "lucide-react";
import ImagePositioner from "./ImagePositioner";
import { resolveOutdoorImage } from "./FeaturedCarousel";
import { useSubcategoryImages } from "@/hooks/useSubcategoryImages";
import { useCategoryImages } from "@/hooks/useCategoryImages";
import { useKeywordImages } from "@/hooks/useKeywordImages";

interface OutdoorSettingsProps {
  open: boolean;
  onClose: () => void;
  events: EventData[];
  onUpdated: () => void;
}

const OutdoorSettings = ({ open, onClose, events, onUpdated }: OutdoorSettingsProps) => {
  const featuredEvents = events.filter((e) => e.is_featured);
  const otherEvents = events.filter((e) => !e.is_featured);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const { images: subImgs } = useSubcategoryImages();
  const { images: catImgs } = useCategoryImages();
  const { images: kwImgs } = useKeywordImages();

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

  const updateField = async (eventId: string, field: string, value: any) => {
    const { error } = await supabase
      .from("events")
      .update({ [field]: value } as any)
      .eq("id", eventId);
    if (error) toast.error("Erro ao atualizar.");
    else onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-sans text-lg flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurações do Outdoor
          </DialogTitle>
          <DialogDescription className="text-xs">
            Gerencie eventos em destaque, tempo de exibição e exibição de informações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Em destaque ({featuredEvents.length})
            </h3>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen((v) => !v)}>
              <Plus className="w-3 h-3 mr-1" /> Adicionar
            </Button>
          </div>

          {addOpen && (
            <div className="rounded-lg bg-muted/40 p-2 max-h-48 overflow-y-auto space-y-1">
              {otherEvents.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">Nenhum evento disponível.</p>
              )}
              {otherEvents.slice(0, 30).map((event) => (
                <button
                  key={event.id}
                  onClick={() => toggleFeatured(event)}
                  disabled={saving === event.id}
                  className="w-full text-left text-sm p-2 rounded hover:bg-muted truncate"
                >
                  {event.nome} <span className="text-xs text-muted-foreground">— {event.cidade}</span>
                </button>
              ))}
            </div>
          )}

          {featuredEvents.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">Nenhum evento em destaque.</p>
          )}

          {featuredEvents.map((event) => {
            const resolvedImg = resolveOutdoorImage(event, subImgs, catImgs, kwImgs);
            return (
              <div key={event.id} className="rounded-lg bg-muted/50 overflow-hidden">
                <div className="flex items-center gap-2 p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{event.cidade}</p>
                  </div>
                  <Input
                    type="number"
                    min={3}
                    max={30}
                    defaultValue={event.outdoor_duration || 7}
                    title="Tempo (s)"
                    className="w-12 h-7 text-xs px-1"
                    onBlur={(e) => updateField(event.id, "outdoor_duration", Math.max(3, Math.min(30, parseInt(e.target.value) || 7)))}
                  />
                  <Switch
                    checked={event.outdoor_show_info ?? true}
                    onCheckedChange={(v) => updateField(event.id, "outdoor_show_info", v)}
                    title="Exibir informações"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                    title="Formatação"
                  >
                    <Type className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleFeatured(event)}
                    disabled={saving === event.id}
                    title="Remover do outdoor"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>

                {expandedId === event.id && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Posição</Label>
                        <Select
                          defaultValue={event.outdoor_text_position || "bottom"}
                          onValueChange={(v) => updateField(event.id, "outdoor_text_position", v)}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Topo</SelectItem>
                            <SelectItem value="center">Centro</SelectItem>
                            <SelectItem value="bottom">Inferior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Alinhamento</Label>
                        <Select
                          defaultValue={event.outdoor_text_align || "left"}
                          onValueChange={(v) => updateField(event.id, "outdoor_text_align", v)}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Esquerda</SelectItem>
                            <SelectItem value="center">Centro</SelectItem>
                            <SelectItem value="right">Direita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Título: {event.outdoor_title_size || 28}px</Label>
                      <Slider
                        defaultValue={[event.outdoor_title_size || 28]}
                        min={16}
                        max={48}
                        step={1}
                        onValueCommit={(v) => updateField(event.id, "outdoor_title_size", v[0])}
                      />
                    </div>

                    <div className="pt-2 border-t border-border">
                      <Label className="text-[11px] font-semibold text-primary">Posicionamento da imagem</Label>
                      <ImagePositioner
                        imageSrc={resolvedImg}
                        value={{
                          x: event.outdoor_image_position_x ?? 50,
                          y: event.outdoor_image_position_y ?? 50,
                          zoom: event.outdoor_image_zoom ?? 1,
                        }}
                        onCommit={(v) => {
                          void updateField(event.id, "outdoor_image_position_x", v.x);
                          void updateField(event.id, "outdoor_image_position_y", v.y);
                          void updateField(event.id, "outdoor_image_zoom", v.zoom);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OutdoorSettings;
