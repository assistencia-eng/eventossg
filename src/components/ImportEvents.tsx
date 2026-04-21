import { useState, useCallback, useMemo } from "react";
import { Upload, FileText, X, Loader2, Check, AlertCircle, Pencil, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile, isFileSupported } from "@/lib/fileParser";
import { categoryLabels, categoryIcons, subcategoryOptions, type EventCategory } from "@/data/events";
import { categoryColors, generateMutedColor } from "@/data/categoryColors";
import { geocodeBatch } from "@/lib/geocode";
import { useCategoriesVersion, getCustomCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";

interface ExtractedEvent {
  nome: string;
  local: string;
  cidade: string;
  endereco: string;
  data: string;
  horario?: string | null;
  descricao: string;
  atracoes: string[];
  categoria: EventCategory;
  categorias: string[];
  subcategorias: string[];
  latitude: number;
  longitude: number;
}

interface ImportEventsProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type ImportStep = "upload" | "processing" | "preview" | "geocoding" | "saving";

const baseCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const ImportEvents = ({ open, onClose, onImported }: ImportEventsProps) => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState({ current: 0, total: 0 });

  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  void subVersion;

  const allCategories = useMemo<EventCategory[]>(
    () => [...baseCategories, ...getCustomCategoryKeys().filter((c) => !baseCategories.includes(c))],
    [catVersion]
  );

  const reset = () => {
    setStep("upload");
    setFiles([]);
    setExtractedEvents([]);
    setEditingIndex(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(isFileSupported);
    if (dropped.length === 0) {
      toast.error("Nenhum arquivo suportado. Use CSV, JSON, TXT, XLSX, PDF ou ICS.");
      return;
    }
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(isFileSupported);
    if (selected.length === 0) {
      toast.error("Nenhum arquivo suportado selecionado.");
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setStep("processing");
    setError(null);

    try {
      const allEvents: ExtractedEvent[] = [];

      for (const file of files) {
        const content = await extractTextFromFile(file);

        const { data, error: fnError } = await supabase.functions.invoke("process-file", {
          body: { content, fileName: file.name },
        });

        if (fnError) throw new Error(fnError.message || "Erro ao processar arquivo");
        if (data?.error) throw new Error(data.error);

        if (data?.events) {
          allEvents.push(...data.events);
        }
      }

      if (allEvents.length === 0) {
        setError("Nenhum evento encontrado nos arquivos enviados.");
        setStep("upload");
        return;
      }

      setExtractedEvents(allEvents);
      setStep("preview");
    } catch (err) {
      console.error("Processing error:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar arquivos");
      setStep("upload");
    }
  };

  const updateEvent = (index: number, field: keyof ExtractedEvent, value: unknown) => {
    setExtractedEvents((prev) =>
      prev.map((ev, i) => (i === index ? { ...ev, [field]: value } : ev))
    );
  };

  const toggleEventCategory = (index: number, cat: EventCategory) => {
    setExtractedEvents((prev) =>
      prev.map((ev, i) => {
        if (i !== index) return ev;
        const has = ev.categorias.includes(cat);
        const nextCategorias = has ? ev.categorias.filter((c) => c !== cat) : [...ev.categorias, cat];
        // Keep main `categoria` valid: first selected, fallback to current
        const nextMain = (nextCategorias.includes(ev.categoria) ? ev.categoria : nextCategorias[0]) || ev.categoria;
        return { ...ev, categorias: nextCategorias, categoria: nextMain as EventCategory };
      })
    );
  };

  const toggleEventSubcategory = (index: number, sub: string) => {
    setExtractedEvents((prev) =>
      prev.map((ev, i) => {
        if (i !== index) return ev;
        const has = ev.subcategorias.includes(sub);
        return {
          ...ev,
          subcategorias: has ? ev.subcategorias.filter((s) => s !== sub) : [...ev.subcategorias, sub],
        };
      })
    );
  };

  const removeEvent = (index: number) => {
    setExtractedEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmImport = async () => {
    if (extractedEvents.length === 0) return;
    setStep("geocoding");

    try {
      const geoResults = await geocodeBatch(
        extractedEvents.map((ev) => ({ endereco: ev.endereco, cidade: ev.cidade })),
        (current, total) => setGeocodeProgress({ current, total })
      );

      setStep("saving");

      const { error: insertError } = await supabase.from("events").insert(
        extractedEvents.map((ev, i) => ({
          nome: ev.nome,
          local: ev.local,
          cidade: ev.cidade,
          endereco: ev.endereco,
          data: ev.data,
          horario: ev.horario || null,
          descricao: ev.descricao,
          atracoes: ev.atracoes,
          categoria: ev.categoria,
          categorias: (ev.categorias && ev.categorias.length > 0 ? ev.categorias : [ev.categoria]),
          subcategorias: ev.subcategorias || [],
          latitude: geoResults[i].latitude,
          longitude: geoResults[i].longitude,
        }))
      );

      if (insertError) throw insertError;

      toast.success(`${extractedEvents.length} evento(s) importado(s) com sucesso!`);
      onImported();
      handleClose();
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Erro ao salvar eventos. Tente novamente.");
      setStep("preview");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {step === "upload" && "Importar Eventos"}
            {step === "processing" && "Processando..."}
            {step === "preview" && `Pré-visualização (${extractedEvents.length} eventos)`}
            {step === "geocoding" && "Localizando endereços..."}
            {step === "saving" && "Salvando..."}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Envie arquivos para extrair eventos automaticamente com IA."}
            {step === "processing" && "Analisando seus arquivos com inteligência artificial..."}
            {step === "preview" && "Revise e edite os eventos antes de confirmar a importação."}
            {step === "geocoding" && `Buscando coordenadas... (${geocodeProgress.current}/${geocodeProgress.total})`}
            {step === "saving" && "Salvando eventos no banco de dados..."}
          </DialogDescription>
        </DialogHeader>

        {/* UPLOAD STEP */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste arquivos aqui</p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV, JSON, TXT, XLSX, PDF, ICS
              </p>
              <label className="mt-3 inline-block">
                <input
                  type="file"
                  multiple
                  accept=".csv,.json,.txt,.xlsx,.xls,.pdf,.ics"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" size="sm" className="cursor-pointer" asChild>
                  <span>Selecionar arquivos</span>
                </Button>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={processFiles}
              disabled={files.length === 0}
              className="w-full"
            >
              Processar com IA
            </Button>
          </div>
        )}

        {/* PROCESSING STEP */}
        {step === "processing" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Extraindo eventos dos arquivos...
            </p>
          </div>
        )}

        {/* PREVIEW STEP */}
        {step === "preview" && (
          <div className="space-y-3">
            {extractedEvents.map((ev, i) => {
              const editing = editingIndex === i;
              const availableSubs = (ev.categorias.length > 0 ? ev.categorias : [ev.categoria])
                .flatMap((c) => subcategoryOptions[c as EventCategory] || []);
              const uniqueSubs = [...new Set(availableSubs)];

              return (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4">
                    {editing ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Título</Label>
                          <Input
                            value={ev.nome}
                            onChange={(e) => updateEvent(i, "nome", e.target.value)}
                            placeholder="Nome do evento"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Cidade</Label>
                            <Input
                              value={ev.cidade}
                              onChange={(e) => updateEvent(i, "cidade", e.target.value)}
                              placeholder="Cidade"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Data</Label>
                            <Input
                              type="date"
                              value={ev.data}
                              onChange={(e) => updateEvent(i, "data", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Local</Label>
                            <Input
                              value={ev.local}
                              onChange={(e) => updateEvent(i, "local", e.target.value)}
                              placeholder="Local / venue"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Horário</Label>
                            <Input
                              type="time"
                              value={ev.horario || ""}
                              onChange={(e) => updateEvent(i, "horario", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Endereço</Label>
                          <Input
                            value={ev.endereco}
                            onChange={(e) => updateEvent(i, "endereco", e.target.value)}
                            placeholder="Endereço"
                          />
                        </div>

                        {/* Categorias multi-select */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Categorias</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {allCategories.map((cat) => {
                              const isActive = ev.categorias.includes(cat);
                              const colors = categoryColors[cat] || { vibrant: "#6366f1", muted: generateMutedColor("#6366f1") };
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => toggleEventCategory(i, cat)}
                                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all inline-flex items-center gap-1"
                                  style={{
                                    backgroundColor: isActive ? colors.vibrant : colors.muted,
                                    color: isActive ? "#fff" : colors.vibrant,
                                    border: `1px solid ${isActive ? colors.vibrant : "transparent"}`,
                                  }}
                                >
                                  <span>{categoryIcons[cat] || "📌"}</span>
                                  {categoryLabels[cat] || cat}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Subcategorias */}
                        {uniqueSubs.length > 0 && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Subcategorias</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {uniqueSubs.map((sub) => (
                                <button
                                  key={sub}
                                  type="button"
                                  onClick={() => toggleEventSubcategory(i, sub)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                    ev.subcategorias.includes(sub)
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                                  }`}
                                >
                                  {sub}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs">Descrição</Label>
                          <Textarea
                            value={ev.descricao}
                            onChange={(e) => updateEvent(i, "descricao", e.target.value)}
                            placeholder="Descrição"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Atrações (separadas por vírgula)</Label>
                          <Input
                            value={ev.atracoes.join(", ")}
                            onChange={(e) =>
                              updateEvent(i, "atracoes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                            }
                            placeholder="Ex: Show ao vivo, Degustação"
                          />
                        </div>

                        <Button size="sm" onClick={() => setEditingIndex(null)}>
                          <Check className="w-4 h-4 mr-1" /> Concluído
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-semibold text-sm truncate">{ev.nome}</h4>
                            {(ev.categorias.length > 0 ? ev.categorias : [ev.categoria]).map((c) => {
                              const cat = c as EventCategory;
                              const colors = categoryColors[cat] || { vibrant: "#6366f1", muted: generateMutedColor("#6366f1") };
                              return (
                                <Badge
                                  key={c}
                                  className="text-xs shrink-0 border-0"
                                  style={{ backgroundColor: colors.vibrant, color: "#fff" }}
                                >
                                  {categoryIcons[cat] || "📌"} {categoryLabels[cat] || cat}
                                </Badge>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {ev.cidade} • {ev.data}{ev.horario ? ` • ${ev.horario}` : ""} • {ev.local}
                          </p>
                          {ev.subcategorias?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ev.subcategorias.map((sub) => (
                                <Badge key={sub} variant="outline" className="text-[10px] py-0 capitalize">
                                  {sub}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {ev.descricao}
                          </p>
                          {ev.atracoes.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-1 italic line-clamp-1">
                              Atrações: {ev.atracoes.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setEditingIndex(i)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label="Editar evento"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeEvent(i)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            aria-label="Remover evento"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep("upload"); setExtractedEvents([]); }} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={confirmImport}
                disabled={extractedEvents.length === 0}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Confirmar importação ({extractedEvents.length})
              </Button>
            </div>
          </div>
        )}

        {/* GEOCODING STEP */}
        {step === "geocoding" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <MapPin className="w-10 h-10 animate-pulse text-primary" />
            <p className="text-sm text-muted-foreground">
              Localizando endereços... ({geocodeProgress.current}/{geocodeProgress.total})
            </p>
          </div>
        )}

        {/* SAVING STEP */}
        {step === "saving" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Salvando eventos...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportEvents;
