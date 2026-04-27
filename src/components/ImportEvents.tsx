import { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, FileText, X, Loader2, Check, AlertCircle, Pencil, MapPin, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile, isFileSupported, parseICSEvents } from "@/lib/fileParser";
import { categoryLabels, categoryIcons, subcategoryOptions, type EventCategory } from "@/data/events";
import { categoryColors, generateMutedColor } from "@/data/categoryColors";
import { geocodeBatch } from "@/lib/geocode";
import { useCategoriesVersion, getCustomCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import { useKeywordImages } from "@/hooks/useKeywordImages";

interface ExtractedEvent {
  nome: string;
  local: string;
  cidade: string;
  endereco: string;
  data: string;
  data_fim?: string | null;
  horario?: string | null;
  descricao: string;
  atracoes: string[];
  categoria: EventCategory;
  categorias: string[];
  subcategorias: string[];
  keywords: string[];
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

interface ExistingEventLite {
  id: string;
  nome: string;
  cidade: string;
  data: string;
  data_fim: string | null;
  local: string;
}

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Levenshtein-based similarity ratio (0..1)
const similarity = (a: string, b: string): number => {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) / Math.max(m, n) > 0.5) return 0;
  const dp: number[] = Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev + 1, dp[j] + 1, dp[j - 1] + 1);
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
};

const findDuplicate = (ev: ExtractedEvent, existing: ExistingEventLite[]): ExistingEventLite | null => {
  const evName = norm(ev.nome);
  const evCity = norm(ev.cidade);
  const evLocal = norm(ev.local);
  for (const ex of existing) {
    const exName = norm(ex.nome);
    const sim = similarity(evName, exName);
    const sameDate = ex.data === ev.data;
    const sameCity = norm(ex.cidade) === evCity && evCity.length > 0;
    const sameLocal = norm(ex.local) === evLocal && evLocal.length > 0;
    // Strong duplicate: identical/very similar name AND (same date OR same city/local)
    if (sim >= 0.85 && (sameDate || sameCity || sameLocal)) return ex;
    // Exact name match alone is also flagged
    if (sim === 1 && (sameDate || sameCity)) return ex;
  }
  return null;
};

const ImportEvents = ({ open, onClose, onImported }: ImportEventsProps) => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState({ current: 0, total: 0 });
  const [existingEvents, setExistingEvents] = useState<ExistingEventLite[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState<Set<number>>(new Set());
  const [showDupConfirm, setShowDupConfirm] = useState(false);

  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  void subVersion;
  const { images: keywordImages } = useKeywordImages();
  const availableKeywords = useMemo(() => Object.keys(keywordImages).sort(), [keywordImages]);

  // Load existing events when dialog opens (lightweight fields only)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("events")
        .select("id, nome, cidade, data, local");
      if (!cancelled && !err && data) setExistingEvents(data as ExistingEventLite[]);
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Compute duplicates map for current preview
  const duplicateMap = useMemo(() => {
    const map = new Map<number, ExistingEventLite>();
    extractedEvents.forEach((ev, i) => {
      const dup = findDuplicate(ev, existingEvents);
      if (dup) map.set(i, dup);
    });
    return map;
  }, [extractedEvents, existingEvents]);

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
    setSkipDuplicates(new Set());
    setShowDupConfirm(false);
  };

  const toggleSkipDuplicate = (index: number) => {
    setSkipDuplicates((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
        const isICSFile = file.name.split(".").pop()?.toLowerCase() === "ics";
        const rawICS = isICSFile ? await file.text() : "";
        const icsEvents = isICSFile ? parseICSEvents(rawICS) : [];
        const content = isICSFile ? await extractTextFromFile(file) : await extractTextFromFile(file);

        const { data, error: fnError } = await supabase.functions.invoke("process-file", {
          body: { content, fileName: file.name, availableKeywords },
        });

        if (fnError) throw new Error(fnError.message || "Erro ao processar arquivo");
        if (data?.error) throw new Error(data.error);

        if (data?.events) {
          // Normalize: ensure keywords is always an array of strings from the library.
          // For ICS files, force the dates extracted by the deterministic parser so the AI cannot duplicate today's date.
          const normalized = (data.events as ExtractedEvent[]).map((ev, index) => {
            const icsEvent = icsEvents[index];
            return {
              ...ev,
              data: icsEvent?.startDate || ev.data,
              data_fim: icsEvent?.endDate ?? ev.data_fim ?? null,
              horario: icsEvent?.time ?? ev.horario ?? null,
              keywords: Array.isArray(ev.keywords)
                ? ev.keywords.filter((k) => availableKeywords.some((ak) => ak.toLowerCase() === String(k).toLowerCase()))
                : [],
            };
          });
          allEvents.push(...normalized);
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

  const toggleEventKeyword = (index: number, kw: string) => {
    setExtractedEvents((prev) =>
      prev.map((ev, i) => {
        if (i !== index) return ev;
        const list = ev.keywords || [];
        const has = list.includes(kw);
        return {
          ...ev,
          keywords: has ? list.filter((k) => k !== kw) : [...list, kw],
        };
      })
    );
  };

  const removeEvent = (index: number) => {
    setExtractedEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmClick = () => {
    if (extractedEvents.length === 0) return;
    // Pending duplicates that aren't yet marked to skip => warn
    const pendingDups = Array.from(duplicateMap.keys()).filter((i) => !skipDuplicates.has(i));
    if (pendingDups.length > 0) {
      setShowDupConfirm(true);
      return;
    }
    void confirmImport();
  };

  const confirmImport = async () => {
    // Filter out duplicates the admin chose to skip
    const toImport = extractedEvents.filter((_, i) => !skipDuplicates.has(i));
    if (toImport.length === 0) {
      toast.info("Nenhum evento para importar (todos foram marcados como duplicados).");
      return;
    }
    setStep("geocoding");

    try {
      const geoResults = await geocodeBatch(
        toImport.map((ev) => ({ endereco: ev.endereco, cidade: ev.cidade })),
        (current, total) => setGeocodeProgress({ current, total })
      );

      setStep("saving");

      const { error: insertError } = await supabase.from("events").insert(
        toImport.map((ev, i) => ({
          nome: ev.nome,
          local: ev.local,
          cidade: ev.cidade,
          endereco: ev.endereco,
          data: ev.data,
          data_fim: ev.data_fim || null,
          horario: ev.horario || null,
          descricao: ev.descricao,
          atracoes: ev.atracoes,
          categoria: ev.categoria,
          categorias: (ev.categorias && ev.categorias.length > 0 ? ev.categorias : [ev.categoria]),
          subcategorias: ev.subcategorias || [],
          keywords: ev.keywords || [],
          latitude: geoResults[i].latitude,
          longitude: geoResults[i].longitude,
        }))
      );

      if (insertError) throw insertError;

      const skippedCount = extractedEvents.length - toImport.length;
      toast.success(
        `${toImport.length} evento(s) importado(s)${skippedCount > 0 ? ` • ${skippedCount} duplicado(s) ignorado(s)` : ""}.`
      );
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

              const dup = duplicateMap.get(i);
              const skipped = skipDuplicates.has(i);

              return (
                <Card
                  key={i}
                  className={`overflow-hidden ${dup ? (skipped ? "border-muted opacity-60" : "border-amber-500/60 ring-1 ring-amber-500/30") : ""}`}
                >
                  <CardContent className="p-4 space-y-2">
                    {dup && (
                      <div className="flex items-start gap-2 p-2 rounded-md border border-amber-500/30 text-xs text-[#ffe500] bg-[#1c1c1c]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">Possível evento duplicado</p>
                          <p className="opacity-90 truncate">
                            Já existe: <span className="font-medium">{dup.nome}</span> — {dup.cidade} • {dup.data}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleSkipDuplicate(i)}
                            className="mt-1 underline underline-offset-2 hover:text-amber-100"
                          >
                            {skipped ? "Importar mesmo assim" : "Não importar este evento"}
                          </button>
                        </div>
                      </div>
                    )}
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
                            <Label className="text-xs">Data início</Label>
                            <Input
                              type="date"
                              value={ev.data}
                              onChange={(e) => updateEvent(i, "data", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Data fim (opcional)</Label>
                            <Input
                              type="date"
                              value={ev.data_fim || ""}
                              onChange={(e) => updateEvent(i, "data_fim", e.target.value || null)}
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
                          <Label className="text-xs">Local</Label>
                          <Input
                            value={ev.local}
                            onChange={(e) => updateEvent(i, "local", e.target.value)}
                            placeholder="Local / venue"
                          />
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

                        {/* Keywords (from library) */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Palavras-chave</Label>
                          {availableKeywords.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">Nenhuma palavra-chave cadastrada.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {availableKeywords.map((kw) => {
                                const active = (ev.keywords || []).includes(kw);
                                return (
                                  <button
                                    key={kw}
                                    type="button"
                                    onClick={() => toggleEventKeyword(i, kw)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                      active
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                                    }`}
                                  >
                                    {kw}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

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
                            {ev.cidade} • {ev.data}{ev.data_fim ? ` → ${ev.data_fim}` : ""}{ev.horario ? ` • ${ev.horario}` : ""} • {ev.local}
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
                          {ev.keywords && ev.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ev.keywords.map((kw) => (
                                <Badge key={kw} className="text-[10px] py-0 bg-primary/20 text-primary border-primary/30">
                                  #{kw}
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

            {duplicateMap.size > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-md border border-amber-500/30 text-xs text-[#ffe500] bg-[#1c1c1c]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  {duplicateMap.size} possível(is) duplicado(s) detectado(s).
                  {skipDuplicates.size > 0 && ` ${skipDuplicates.size} marcado(s) para ignorar.`}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { setStep("upload"); setExtractedEvents([]); setSkipDuplicates(new Set()); }} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleConfirmClick}
                disabled={extractedEvents.length === 0 || (extractedEvents.length - skipDuplicates.size) === 0}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Confirmar importação ({extractedEvents.length - skipDuplicates.size})
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

      <AlertDialog open={showDupConfirm} onOpenChange={setShowDupConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Eventos duplicados detectados
            </AlertDialogTitle>
            <AlertDialogDescription>
              {Array.from(duplicateMap.keys()).filter((i) => !skipDuplicates.has(i)).length} evento(s) na importação parecem
              já existir no banco. Tem certeza que deseja criá-los mesmo assim? Você pode voltar e marcar individualmente
              quais ignorar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDupConfirm(false);
                void confirmImport();
              }}
            >
              Importar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ImportEvents;
