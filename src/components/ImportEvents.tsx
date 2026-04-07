import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2, Check, AlertCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile, isFileSupported } from "@/lib/fileParser";
import { categoryLabels, categoryIcons, type EventCategory } from "@/data/events";

interface ExtractedEvent {
  nome: string;
  local: string;
  cidade: string;
  endereco: string;
  data: string;
  descricao: string;
  atracoes: string[];
  categoria: EventCategory;
  latitude: number;
  longitude: number;
}

interface ImportEventsProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type ImportStep = "upload" | "processing" | "preview" | "saving";

const ImportEvents = ({ open, onClose, onImported }: ImportEventsProps) => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  const removeEvent = (index: number) => {
    setExtractedEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmImport = async () => {
    if (extractedEvents.length === 0) return;
    setStep("saving");

    try {
      const { error: insertError } = await supabase.from("events").insert(
        extractedEvents.map((ev) => ({
          nome: ev.nome,
          local: ev.local,
          cidade: ev.cidade,
          endereco: ev.endereco,
          data: ev.data,
          descricao: ev.descricao,
          atracoes: ev.atracoes,
          categoria: ev.categoria,
          latitude: ev.latitude,
          longitude: ev.longitude,
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
            {step === "saving" && "Salvando..."}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Envie arquivos para extrair eventos automaticamente com IA."}
            {step === "processing" && "Analisando seus arquivos com inteligência artificial..."}
            {step === "preview" && "Revise e edite os eventos antes de confirmar a importação."}
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
            {extractedEvents.map((ev, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  {editingIndex === i ? (
                    <div className="space-y-3">
                      <Input
                        value={ev.nome}
                        onChange={(e) => updateEvent(i, "nome", e.target.value)}
                        placeholder="Nome do evento"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={ev.cidade}
                          onChange={(e) => updateEvent(i, "cidade", e.target.value)}
                          placeholder="Cidade"
                        />
                        <Input
                          type="date"
                          value={ev.data}
                          onChange={(e) => updateEvent(i, "data", e.target.value)}
                        />
                      </div>
                      <Input
                        value={ev.local}
                        onChange={(e) => updateEvent(i, "local", e.target.value)}
                        placeholder="Local"
                      />
                      <Input
                        value={ev.endereco}
                        onChange={(e) => updateEvent(i, "endereco", e.target.value)}
                        placeholder="Endereço"
                      />
                      <Textarea
                        value={ev.descricao}
                        onChange={(e) => updateEvent(i, "descricao", e.target.value)}
                        placeholder="Descrição"
                        rows={2}
                      />
                      <Input
                        value={ev.atracoes.join(", ")}
                        onChange={(e) =>
                          updateEvent(i, "atracoes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                        }
                        placeholder="Atrações (separadas por vírgula)"
                      />
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={ev.categoria}
                        onChange={(e) => updateEvent(i, "categoria", e.target.value)}
                      >
                        {(Object.keys(categoryLabels) as EventCategory[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryIcons[cat]} {categoryLabels[cat]}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          step="0.0001"
                          value={ev.latitude}
                          onChange={(e) => updateEvent(i, "latitude", parseFloat(e.target.value) || 0)}
                          placeholder="Latitude"
                        />
                        <Input
                          type="number"
                          step="0.0001"
                          value={ev.longitude}
                          onChange={(e) => updateEvent(i, "longitude", parseFloat(e.target.value) || 0)}
                          placeholder="Longitude"
                        />
                      </div>
                      <Button size="sm" onClick={() => setEditingIndex(null)}>
                        <Check className="w-4 h-4 mr-1" /> Concluído
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm truncate">{ev.nome}</h4>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {categoryIcons[ev.categoria]} {categoryLabels[ev.categoria]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ev.cidade} • {ev.data} • {ev.local}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {ev.descricao}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => setEditingIndex(i)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeEvent(i)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

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
