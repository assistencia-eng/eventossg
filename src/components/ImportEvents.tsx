import { useState, useCallback, useMemo, useEffect } from "react";
import { Upload, FileText, X, Loader2, Check, AlertCircle, Pencil, MapPin, AlertTriangle, Sparkles, ImagePlus, Star } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile, isFileSupported, parseICSEvents, parseJSONEvents } from "@/lib/fileParser";
import { categoryLabels, categoryIcons, subcategoryOptions, type EventCategory } from "@/data/events";
import { categoryColors, generateMutedColor } from "@/data/categoryColors";
import { geocodeBatch } from "@/lib/geocode";
import { useCategoriesVersion, getCustomCategoryKeys, getRemovedDefaultCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import { useKeywordImages } from "@/hooks/useKeywordImages";
import { useSubcategoryImages, subImgKey } from "@/hooks/useSubcategoryImages";
import { detectContactsInText, type VenueContact } from "@/types/contact";
import { getOrCreateVenue } from "@/hooks/useVenues";
import ContactsEditor from "@/components/ContactsEditor";

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
  detected_contacts?: VenueContact[];
  custom_contacts?: VenueContact[];
  is_featured?: boolean;
  image_source?: "auto" | "subcategory" | "keyword";
  image_keyword?: string | null;
  keyword_image_index?: number | null;
  subcategory_image_index?: number | null;
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

// Stop-words irrelevantes para comparação de nomes de eventos
const NAME_STOPWORDS = new Set([
  "show","shows","de","da","do","das","dos","e","em","no","na","nos","nas","a","o","as","os",
  "com","para","por","the","feat","ft","apresenta","apresentacao","evento","festa","festival",
  "live","tour","sertanejo","rock","pop","pagode","funk","mpb","gauchesco","gauchesca","serra",
  "noite","matine","especial","unico","ao","vivo"
]);

const tokenize = (s: string): Set<string> => {
  const tokens = norm(s).split(" ").filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
  return new Set(tokens);
};

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  a.forEach((t) => { if (b.has(t)) inter++; });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
};

const findDuplicate = (ev: ExtractedEvent, existing: ExistingEventLite[]): ExistingEventLite | null => {
  const evName = norm(ev.nome);
  const evCity = norm(ev.cidade);
  const evLocal = norm(ev.local);
  const evTokens = tokenize(`${ev.nome} ${(ev.atracoes || []).join(" ")}`);

  let bestMatch: ExistingEventLite | null = null;
  let bestScore = 0;

  for (const ex of existing) {
    const exName = norm(ex.nome);
    const sim = similarity(evName, exName);
    const sameDate = ex.data === ev.data;
    const sameCity = norm(ex.cidade) === evCity && evCity.length > 0;
    const sameLocal = norm(ex.local) === evLocal && evLocal.length > 0;
    const exTokens = tokenize(ex.nome);
    const tokenOverlap = jaccard(evTokens, exTokens);

    // Heurísticas de duplicação (qualquer uma marca como possível duplicado):
    // 1) Nome quase idêntico + (mesma data OU mesma cidade OU mesmo local)
    // 2) Nome idêntico + (mesma data OU mesma cidade)
    // 3) Mesma data + mesmo local (forte sinal espaço-temporal)
    // 4) Mesma data + mesma cidade + (similaridade moderada de nome OU tokens significativos em comum — ex.: nome do artista)
    let score = 0;
    if (sim >= 0.85 && (sameDate || sameCity || sameLocal)) score = Math.max(score, 0.9);
    if (sim === 1 && (sameDate || sameCity)) score = Math.max(score, 1);
    if (sameDate && sameLocal) score = Math.max(score, 0.85);
    if (sameDate && sameCity && (sim >= 0.55 || tokenOverlap >= 0.4)) score = Math.max(score, 0.75);
    if (sameDate && sameCity && tokenOverlap >= 0.5) score = Math.max(score, 0.8);

    if (score > 0 && score > bestScore) {
      bestScore = score;
      bestMatch = ex;
    }
  }
  return bestMatch;
};

const datesDiffer = (ev: ExtractedEvent, ex: ExistingEventLite): boolean => {
  const evFim = ev.data_fim || null;
  const exFim = ex.data_fim || null;
  return ex.data !== ev.data || exFim !== evFim;
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
  const [updateDateDuplicates, setUpdateDateDuplicates] = useState<Set<number>>(new Set());
  const [showDupConfirm, setShowDupConfirm] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>("Extraindo eventos dos arquivos...");
  // Per-event uploaded cover images (index -> File). Previews use object URLs.
  const [imageFiles, setImageFiles] = useState<Record<number, File>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<number, string>>({});

  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  void subVersion;
  const { images: keywordImages } = useKeywordImages();
  const { images: subcategoryImages } = useSubcategoryImages();
  const availableKeywords = useMemo(() => Object.keys(keywordImages).sort(), [keywordImages]);

  // Load existing events when dialog opens (lightweight fields only)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("events")
        .select("id, nome, cidade, data, data_fim, local");
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
    () => {
      const removed = new Set(getRemovedDefaultCategoryKeys());
      return [
        ...baseCategories.filter((c) => !removed.has(c)),
        ...getCustomCategoryKeys().filter((c) => !baseCategories.includes(c)),
      ];
    },
    [catVersion]
  );

  const reset = () => {
    setStep("upload");
    setFiles([]);
    setExtractedEvents([]);
    setEditingIndex(null);
    setError(null);
    setSkipDuplicates(new Set());
    setUpdateDateDuplicates(new Set());
    setShowDupConfirm(false);
    // Revoke any preview object URLs
    Object.values(imagePreviews).forEach((u) => {
      try { URL.revokeObjectURL(u); } catch { /* ignore */ }
    });
    setImageFiles({});
    setImagePreviews({});
  };

  const toggleSkipDuplicate = (index: number) => {
    setSkipDuplicates((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    // If marking to skip, can't also be updating date
    setUpdateDateDuplicates((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const toggleUpdateDateDuplicate = (index: number) => {
    setUpdateDateDuplicates((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    // If marking to update date, can't also be skipping
    setSkipDuplicates((prev) => {
      const next = new Set(prev);
      next.delete(index);
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

  const fetchFromN8n = async () => {
    setStep("processing");
    setProcessingMessage(
      "Buscando eventos novos nos sites da região... Isso pode levar entre 30 e 240 segundos. Aguarde."
    );
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240_000);

    try {
      const response = await fetch(
        "https://lufati-n8n.l2zlkg.easypanel.host/webhook/f6456203-1f11-47e6-9731-3229f6e77a58",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "scrape_eventos_serra",
            source: "n8n_automation",
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erro do servidor n8n (${response.status})`);
      }

      const payload = await response.json();
      const jsonString = JSON.stringify(payload);
      const syntheticFile = new File([jsonString], "n8n-events.json", {
        type: "application/json",
      });

      setProcessingMessage("Processando eventos recebidos com IA...");
      await processFiles([syntheticFile]);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("n8n fetch error:", err);
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const message = isAbort
        ? "Tempo limite excedido (240s). Tente novamente."
        : err instanceof Error
        ? err.message
        : "Erro ao buscar eventos automaticamente.";
      setError(message);
      toast.error(message);
      setStep("upload");
    }
  };

  const processFiles = async (filesArg?: File[]) => {
    const filesToProcess = filesArg ?? files;
    if (filesToProcess.length === 0) return;
    setStep("processing");
    setProcessingMessage("Extraindo eventos dos arquivos...");
    setError(null);

    try {
      const allEvents: ExtractedEvent[] = [];

      for (const file of filesToProcess) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const isICSFile = ext === "ics";
        const isJSONFile = ext === "json";
        const rawICS = isICSFile ? await file.text() : "";
        const icsEvents = isICSFile ? parseICSEvents(rawICS) : [];
        const rawJSON = isJSONFile ? await file.text() : "";
        const jsonEvents = isJSONFile ? parseJSONEvents(rawJSON) : [];
        const content = await extractTextFromFile(file);

        const { data, error: fnError } = await supabase.functions.invoke("process-file", {
          body: { content, fileName: file.name, availableKeywords },
        });

        if (fnError) throw new Error(fnError.message || "Erro ao processar arquivo");
        if (data?.error) throw new Error(data.error);

        if (data?.events) {
          // Normalize: ensure keywords is always an array of strings from the library.
          // For ICS/JSON files, force the dates extracted by the deterministic parser so the AI cannot duplicate today's date.
          // Detecta contatos do conteúdo do arquivo (fallback global)
          const fileContacts = detectContactsInText(content);

          const normalized = (data.events as ExtractedEvent[]).map((ev, index) => {
            const icsEvent = icsEvents[index];
            const jsonEvent = jsonEvents[index];
            const hasDeterministicDates = Boolean(icsEvent || jsonEvent);
            const startDate = icsEvent?.startDate || jsonEvent?.startDate || ev.data;
            const endDate = hasDeterministicDates
              ? (icsEvent ? icsEvent.endDate : jsonEvent?.endDate ?? null)
              : ev.data_fim ?? null;
            // Tenta detectar nos campos textuais do próprio evento
            const evText = [ev.descricao, ev.local, ev.endereco, (ev.atracoes || []).join(" ")].join(" ");
            const evContacts = detectContactsInText(evText);
            const detected = evContacts.length > 0 ? evContacts : fileContacts;
            return {
              ...ev,
              data: startDate,
              data_fim: endDate && endDate !== startDate ? endDate : null,
              horario: icsEvent?.time ?? jsonEvent?.time ?? ev.horario ?? null,
              keywords: Array.isArray(ev.keywords)
                ? ev.keywords.filter((k) => availableKeywords.some((ak) => ak.toLowerCase() === String(k).toLowerCase()))
                : [],
              detected_contacts: detected,
            };
          });
          allEvents.push(...normalized);
        }
      }

      // Filtra eventos passados: descarta apenas se data_fim (ou data, se não houver fim) já passou.
      // Eventos multi-dia em andamento permanecem.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString().slice(0, 10);
      const totalBefore = allEvents.length;
      const futureEvents = allEvents.filter((ev) => {
        const endRef = ev.data_fim || ev.data;
        if (!endRef) return true; // sem data — mantém para o admin decidir
        return endRef >= todayISO;
      });
      const droppedPast = totalBefore - futureEvents.length;

      if (futureEvents.length === 0) {
        setError(
          totalBefore > 0
            ? `Nenhum evento futuro encontrado (${totalBefore} evento(s) descartado(s) por já terem ocorrido).`
            : "Nenhum evento encontrado nos arquivos enviados."
        );
        setStep("upload");
        return;
      }

      if (droppedPast > 0) {
        toast.info(`${droppedPast} evento(s) passado(s) descartado(s) automaticamente.`);
      }

      setExtractedEvents(futureEvents);
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
    // Pending duplicates that aren't yet decided (skip OR update-date) => warn
    const pendingDups = Array.from(duplicateMap.keys()).filter(
      (i) => !skipDuplicates.has(i) && !updateDateDuplicates.has(i)
    );
    if (pendingDups.length > 0) {
      setShowDupConfirm(true);
      return;
    }
    void confirmImport();
  };

  const confirmImport = async () => {
    // Indices to UPDATE (only date) instead of inserting as new event
    const updateIndices = Array.from(updateDateDuplicates).filter((i) => duplicateMap.has(i));
    // Indices to insert as brand new events (not skipped, not date-update)
    const insertIndices = extractedEvents
      .map((_, i) => i)
      .filter((i) => !skipDuplicates.has(i) && !updateDateDuplicates.has(i));

    const toInsert = insertIndices.map((i) => extractedEvents[i]);
    const totalActions = toInsert.length + updateIndices.length;

    if (totalActions === 0) {
      toast.info("Nenhum evento para importar (todos foram marcados como duplicados).");
      return;
    }

    setStep("geocoding");

    try {
      const geoResults = toInsert.length > 0
        ? await geocodeBatch(
            toInsert.map((ev) => ({ endereco: ev.endereco, cidade: ev.cidade })),
            (current, total) => setGeocodeProgress({ current, total })
          )
        : [];

      setStep("saving");

      // 1) UPDATE date-only for duplicates the admin chose to refresh
      let updatedCount = 0;
      for (const idx of updateIndices) {
        const ev = extractedEvents[idx];
        const dup = duplicateMap.get(idx);
        if (!dup) continue;
        const { error: updateError } = await supabase
          .from("events")
          .update({ data: ev.data, data_fim: ev.data_fim || null })
          .eq("id", dup.id);
        if (updateError) throw updateError;
        updatedCount += 1;
      }

      // 2) INSERT new events — com vínculo de venue e contatos
      if (toInsert.length > 0) {
        // Resolve (ou cria) venues para cada evento e popula contatos detectados nos novos venues
        const venueIds: (string | null)[] = [];
        for (let i = 0; i < toInsert.length; i++) {
          const ev = toInsert[i];
          if (!ev.local || ev.local === "Não informado") {
            venueIds.push(null);
            continue;
          }
          const venueId = await getOrCreateVenue(ev.local, ev.cidade);
          venueIds.push(venueId);

          // Se há contatos detectados e o venue ainda não tem nenhum, popula
          if (venueId && ev.detected_contacts && ev.detected_contacts.length > 0) {
            const { count } = await supabase
              .from("venue_contacts")
              .select("id", { count: "exact", head: true })
              .eq("venue_id", venueId);
            if (!count) {
              const rows = ev.detected_contacts.map((c) => ({
                venue_id: venueId,
                nome: c.nome?.trim() || null,
                whatsapp: c.whatsapp?.trim() || null,
                instagram: c.instagram?.trim() || null,
                facebook: c.facebook?.trim() || null,
              }));
              await supabase.from("venue_contacts").insert(rows);
            }
          }
        }

        const { error: insertError } = await supabase.from("events").insert(
          toInsert.map((ev, i) => ({
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
            venue_id: venueIds[i],
            custom_contacts: [],
          }))
        );
        if (insertError) throw insertError;
      }

      const skippedCount = skipDuplicates.size;
      const parts: string[] = [];
      if (toInsert.length > 0) parts.push(`${toInsert.length} importado(s)`);
      if (updatedCount > 0) parts.push(`${updatedCount} atualizado(s)`);
      if (skippedCount > 0) parts.push(`${skippedCount} ignorado(s)`);
      toast.success(parts.join(" • ") || "Importação concluída.");
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
              onClick={() => void processFiles()}
              disabled={files.length === 0}
              className="w-full"
            >
              Processar com IA
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => void fetchFromN8n()}
              className="w-full gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Buscar Eventos Automaticamente
            </Button>
          </div>
        )}

        {/* PROCESSING STEP */}
        {step === "processing" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {processingMessage}
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
              const willUpdateDate = updateDateDuplicates.has(i);
              const dateChanged = dup ? datesDiffer(ev, dup) : false;

              return (
                <Card
                  key={i}
                  className={`overflow-hidden ${dup ? (skipped ? "border-muted opacity-60" : willUpdateDate ? "border-primary/60 ring-1 ring-primary/30" : "border-amber-500/60 ring-1 ring-amber-500/30") : ""}`}
                >
                  <CardContent className="p-4 space-y-2">
                    {dup && (
                      <div className="flex items-start gap-2 p-2 rounded-md border border-amber-500/30 text-xs text-[#ffe500] bg-[#1c1c1c]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">Possível evento duplicado</p>
                          <p className="opacity-90 truncate">
                            Já existe: <span className="font-medium">{dup.nome}</span> — {dup.cidade} • {dup.data}
                            {dup.data_fim ? ` → ${dup.data_fim}` : ""}
                          </p>
                          {dateChanged && (
                            <p className="mt-1 opacity-90">
                              Nova data detectada: <span className="font-medium">{ev.data}{ev.data_fim ? ` → ${ev.data_fim}` : ""}</span>
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                            {dateChanged && (
                              <button
                                type="button"
                                onClick={() => toggleUpdateDateDuplicate(i)}
                                className="underline underline-offset-2 hover:text-amber-100"
                              >
                                {willUpdateDate ? "Cancelar atualização de data" : "Atualizar apenas a data do evento existente"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleSkipDuplicate(i)}
                              className="underline underline-offset-2 hover:text-amber-100"
                            >
                              {skipped ? "Importar mesmo assim" : "Não importar este evento"}
                            </button>
                          </div>
                          {willUpdateDate && (
                            <p className="mt-1 text-primary font-medium">
                              ✓ A data do evento existente será atualizada (nenhum evento novo será criado).
                            </p>
                          )}
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
              <div className="flex flex-col gap-2 p-3 rounded-md border border-amber-500/30 text-xs text-[#ffe500] bg-[#1c1c1c]">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="flex-1">
                    <span className="font-medium">{duplicateMap.size}</span> possível(is) duplicado(s) detectado(s).
                    {skipDuplicates.size > 0 && ` ${skipDuplicates.size} marcado(s) para ignorar.`}
                    {updateDateDuplicates.size > 0 && ` ${updateDateDuplicates.size} marcado(s) para atualizar a data.`}
                  </p>
                </div>
                {Array.from(duplicateMap.keys()).some((i) => !skipDuplicates.has(i)) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      const allDupIdx = Array.from(duplicateMap.keys());
                      setSkipDuplicates(new Set(allDupIdx));
                      setUpdateDateDuplicates(new Set());
                      toast.success(`${allDupIdx.length} duplicado(s) marcados para exclusão da importação.`);
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Excluir duplicados ({Array.from(duplicateMap.keys()).filter((i) => !skipDuplicates.has(i)).length})
                  </Button>
                )}
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
