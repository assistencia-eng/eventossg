import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EventData } from "@/data/events";
import { toast } from "sonner";
import { Loader2, Search, Trash2, Check, X, Calendar, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  events: EventData[];
  onUpdated: () => void;
}

// ---- Similarity helpers ----
const norm = (s: string | null | undefined) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOPWORDS = new Set([
  "show", "festa", "evento", "festival", "feira", "edicao", "edition",
  "de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "no", "na",
  "em", "para", "com", "ao", "the", "of", "and", "para", "por", "ano",
  "sertanejo", "musica", "ao vivo", "vivo",
]);

const tokenize = (s: string) =>
  new Set(
    norm(s)
      .split(" ")
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((t) => b.has(t) && inter++);
  return inter / (a.size + b.size - inter);
};

// Levenshtein-based ratio for short strings
const editRatio = (a: string, b: string) => {
  a = norm(a); b = norm(b);
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp: number[] = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
};

interface DupGroup {
  id: string;
  events: EventData[];
  reason: string;
  differentDates: boolean;
}

const buildGroups = (events: EventData[]): DupGroup[] => {
  const groups: DupGroup[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    const a = events[i];
    if (assigned.has(a.id)) continue;
    const matches: { ev: EventData; reason: string; diffDate: boolean }[] = [];

    const aTokens = tokenize(a.nome);
    const aDescTokens = tokenize(a.descricao || "");
    const aAttrTokens = tokenize((a.atracoes || []).join(" "));

    for (let j = i + 1; j < events.length; j++) {
      const b = events[j];
      if (assigned.has(b.id)) continue;

      const sameDate = a.data === b.data && (a.data_fim || null) === (b.data_fim || null);
      const sameLocal = norm(a.local) && norm(a.local) === norm(b.local);
      const sameCity = norm(a.cidade) && norm(a.cidade) === norm(b.cidade);

      const nameSim = editRatio(a.nome, b.nome);
      const nameTokenSim = jaccard(aTokens, tokenize(b.nome));
      const descSim = jaccard(aDescTokens, tokenize(b.descricao || ""));
      const attrSim = jaccard(aAttrTokens, tokenize((b.atracoes || []).join(" ")));

      let isDup = false;
      let reason = "";

      if (sameDate && sameLocal && (nameSim >= 0.5 || nameTokenSim >= 0.4)) {
        isDup = true; reason = "Mesma data e local com nome similar";
      } else if (sameDate && sameCity && (nameSim >= 0.7 || nameTokenSim >= 0.6)) {
        isDup = true; reason = "Mesma data e cidade com nome muito similar";
      } else if (sameDate && sameCity && attrSim >= 0.5 && (nameSim >= 0.4 || nameTokenSim >= 0.3)) {
        isDup = true; reason = "Mesma data, cidade e atrações coincidem";
      } else if (nameSim >= 0.85) {
        isDup = true; reason = "Nome quase idêntico";
      } else if (sameLocal && sameCity && (nameSim >= 0.6 || nameTokenSim >= 0.5) && descSim >= 0.4) {
        isDup = true; reason = "Mesmo local com nome e descrição similares — datas diferentes";
      }

      if (isDup) {
        matches.push({ ev: b, reason, diffDate: !sameDate });
      }
    }

    if (matches.length > 0) {
      const all = [a, ...matches.map((m) => m.ev)];
      all.forEach((e) => assigned.add(e.id));
      groups.push({
        id: a.id,
        events: all,
        reason: matches[0].reason,
        differentDates: matches.some((m) => m.diffDate),
      });
    }
  }
  return groups;
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export default function DuplicateDetector({ open, onClose, events, onUpdated }: Props) {
  const [scanning, setScanning] = useState(false);
  const [groups, setGroups] = useState<DupGroup[] | null>(null);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  const visibleGroups = useMemo(
    () => (groups || []).filter((g) => !ignored.has(g.id)),
    [groups, ignored]
  );

  const handleScan = async () => {
    setScanning(true);
    setIgnored(new Set());
    await new Promise((r) => setTimeout(r, 50));
    try {
      const found = buildGroups(events);
      setGroups(found);
      if (found.length === 0) toast.success("Nenhuma duplicata encontrada!");
      else toast.info(`${found.length} grupo(s) de possíveis duplicatas encontrado(s)`);
    } finally {
      setScanning(false);
    }
  };

  const removeFromGroup = (groupId: string, eventId: string) => {
    setGroups((prev) =>
      prev
        ? prev
            .map((g) =>
              g.id === groupId ? { ...g, events: g.events.filter((e) => e.id !== eventId) } : g
            )
            .filter((g) => g.events.length > 1)
        : prev
    );
  };

  const handleDelete = async (groupId: string, eventId: string) => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) return toast.error("Erro ao excluir.");
    toast.success("Evento excluído");
    removeFromGroup(groupId, eventId);
    onUpdated();
  };

  const handleKeepOnly = async (groupId: string, keepId: string) => {
    const group = groups?.find((g) => g.id === groupId);
    if (!group) return;
    const toDelete = group.events.filter((e) => e.id !== keepId).map((e) => e.id);
    if (toDelete.length === 0) return;
    const { error } = await supabase.from("events").delete().in("id", toDelete);
    if (error) return toast.error("Erro ao excluir.");
    toast.success(`${toDelete.length} duplicata(s) excluída(s)`);
    setGroups((prev) => prev?.filter((g) => g.id !== groupId) || prev);
    onUpdated();
  };

  const handleSyncDate = async (groupId: string, sourceId: string) => {
    const group = groups?.find((g) => g.id === groupId);
    if (!group) return;
    const source = group.events.find((e) => e.id === sourceId);
    if (!source) return;
    const others = group.events.filter((e) => e.id !== sourceId);
    let ok = 0;
    for (const ev of others) {
      const { error } = await supabase
        .from("events")
        .update({ data: source.data, data_fim: source.data_fim || null })
        .eq("id", ev.id);
      if (!error) ok++;
    }
    toast.success(`Data sincronizada em ${ok} evento(s)`);
    onUpdated();
    setIgnored((prev) => new Set(prev).add(groupId));
  };

  const handleIgnore = (groupId: string) => {
    setIgnored((prev) => new Set(prev).add(groupId));
    toast.info("Grupo marcado como não duplicata");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#1c1c1c] text-white border-neutral-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" /> Detector de Duplicatas
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Verifica todos os eventos do banco e identifica possíveis duplicatas usando similaridade de nome, data, local e atrações.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleScan} disabled={scanning} className="bg-primary hover:bg-primary/90">
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {groups ? "Varrer novamente" : "🔍 Verificar Duplicatas"}
          </Button>
          {groups && (
            <span className="text-sm text-neutral-400">
              {visibleGroups.length} duplicata(s) | {events.length} eventos revisados
            </span>
          )}
        </div>

        {groups && visibleGroups.length === 0 && !scanning && (
          <div className="py-10 text-center text-neutral-400">
            <Check className="w-10 h-10 mx-auto mb-2 text-green-500" />
            Nenhuma duplicata pendente.
          </div>
        )}

        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.id} className="border border-neutral-700 rounded-lg p-4 bg-[#252525]">
              <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {group.reason}
                  </div>
                  {group.differentDates && (
                    <div className="text-xs text-orange-400 mt-1">
                      ⚠️ Mesmo evento com datas diferentes. Pode ser uma nova edição ou erro.
                    </div>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleIgnore(group.id)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4 mr-1" /> Não é duplicata
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.events.map((ev) => (
                  <div key={ev.id} className="border border-neutral-600 rounded-md p-3 bg-[#1c1c1c] space-y-2">
                    {ev.imagem && (
                      <img src={ev.imagem} alt="" className="w-full h-24 object-cover rounded" />
                    )}
                    <div className="font-semibold text-sm">{ev.nome}</div>
                    <div className="text-xs text-neutral-400 space-y-0.5">
                      <div>📅 {formatDate(ev.data)}{ev.data_fim ? ` → ${formatDate(ev.data_fim)}` : ""}</div>
                      <div>📍 {ev.local} — {ev.cidade}</div>
                      {ev.atracoes?.length > 0 && <div>🎤 {ev.atracoes.join(", ")}</div>}
                      {ev.descricao && <div className="line-clamp-2">{ev.descricao}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(group.id, ev.id)} className="h-8">
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleKeepOnly(group.id, ev.id)} className="h-8 bg-[#303030] border-neutral-600 text-white hover:bg-[#404040]">
                        <Check className="w-3.5 h-3.5 mr-1" /> Manter só este
                      </Button>
                      {group.differentDates && (
                        <Button size="sm" variant="outline" onClick={() => handleSyncDate(group.id, ev.id)} className="h-8 bg-[#303030] border-neutral-600 text-white hover:bg-[#404040]">
                          <Calendar className="w-3.5 h-3.5 mr-1" /> Usar esta data nos demais
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
