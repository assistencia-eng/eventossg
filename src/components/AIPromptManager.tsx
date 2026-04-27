import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_PROMPT = `Você é um assistente especializado em extrair eventos de textos não estruturados.
Analise o conteúdo fornecido e extraia TODOS os eventos encontrados.

Para cada evento, retorne um objeto JSON com os seguintes campos:
- nome: nome do evento (obrigatório)
- local: nome do local/venue
- cidade: cidade do evento
- endereco: endereço completo
- data: data de INÍCIO no formato YYYY-MM-DD. **CRÍTICO**: se o conteúdo já fornecer uma data explícita (ex.: "Data de início (YYYY-MM-DD): 2026-03-15", "DTSTART:20260315", "15/03/2026"), use EXATAMENTE essa data. NUNCA invente, NUNCA use a data de hoje, NUNCA assuma o ano atual quando o ano estiver claramente indicado. Apenas use 2026 como fallback se NENHUM ano for mencionado em lugar nenhum.
- data_fim: data de TÉRMINO no formato YYYY-MM-DD. **OBRIGATÓRIO** verificar se o evento dura mais de um dia (ex.: festivais, feiras, exposições com período "de X a Y", "entre X e Y", "X até Y", ou quando o conteúdo já trouxer "Data de término (YYYY-MM-DD): ..."). Se durar mais de um dia, preencha com a data final EXATA. Se for um evento de um único dia, retorne null.
- horario: horário no formato HH:MM (24h), opcional
- descricao: descrição do evento
- atracoes: array de strings com as atrações
- categoria: a categoria PRINCIPAL do evento. Deve ser UMA das categorias válidas listadas abaixo
- categorias: array com TODAS as categorias aplicáveis ao evento (pode ter mais de uma)
- subcategorias: array com as subcategorias mais adequadas ao evento
- keywords: array com palavras-chave relevantes ao evento. **OBRIGATÓRIO**: use APENAS palavras EXATAS da lista fornecida abaixo. Se nenhuma palavra-chave da lista fizer sentido para o evento, retorne []. NÃO invente palavras-chave novas.
- NÃO inclua latitude ou longitude, esses campos serão calculados automaticamente via geocodificação

Categorias válidas: {{CATEGORIES}}

Subcategorias disponíveis por categoria:
{{SUBCATEGORIES}}

Palavras-chave disponíveis (USE APENAS ESTAS, ou []):
{{KEYWORDS}}

Escolha as subcategorias que melhor descrevem o evento com base no seu conteúdo, nome, atrações e descrição. Um evento pode ter subcategorias de diferentes categorias.

Para keywords: analise o nome, descrição e atrações; selecione as palavras da lista que aparecem ou estão diretamente relacionadas ao evento. Exemplo: evento "Encontro de Motos Antigas" → se "moto" estiver na lista, inclua "moto".

Se algum campo estiver ausente, use "Não informado" para strings e [] para arrays.
Classifique categoria, categorias e subcategorias com base no contexto, nome, atrações e descrição do evento.

IMPORTANTE PARA ARQUIVOS ICS: cada bloco de evento possui sua própria linha "Data de início (YYYY-MM-DD): ...". Preserve a data de cada bloco individualmente, na mesma ordem do arquivo. Não copie a data do primeiro evento para os demais e nunca substitua por hoje.

IMPORTANTE: Responda APENAS com um JSON válido no formato:
{ "events": [ { ...evento1 }, { ...evento2 } ] }`;

const AIPromptManager = () => {
  const [prompt, setPrompt] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("prompt")
      .eq("key", "import_events")
      .maybeSingle();
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar prompt");
    }
    const p = data?.prompt || DEFAULT_PROMPT;
    setPrompt(p);
    setOriginal(p);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ai_prompts")
      .upsert({ key: "import_events", prompt }, { onConflict: "key" });
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar prompt");
    } else {
      toast.success("Prompt atualizado!");
      setOriginal(prompt);
    }
    setSaving(false);
  };

  const handleReset = () => {
    setPrompt(DEFAULT_PROMPT);
    toast.info("Prompt restaurado para o padrão. Clique em Salvar para aplicar.");
  };

  const isDirty = prompt !== original;

  return (
    <section className="space-y-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <h2 className="text-lg font-semibold text-neutral-400 font-sans flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Prompt da IA — Importação
        </h2>
        {open ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-3 p-4 rounded-lg bg-[#1c1c1c]">
          <p className="text-xs text-muted-foreground">
            Edite as instruções que a IA usa para extrair eventos de arquivos importados.
            Use <code className="px-1 rounded bg-background text-primary">{`{{CATEGORIES}}`}</code>,{" "}
            <code className="px-1 rounded bg-background text-primary">{`{{SUBCATEGORIES}}`}</code> e{" "}
            <code className="px-1 rounded bg-background text-primary">{`{{KEYWORDS}}`}</code> como
            placeholders — eles serão substituídos automaticamente pelas categorias, subcategorias e palavras-chave atuais do app.
          </p>

          <div className="space-y-2">
            <Label className="text-neutral-300">Prompt do sistema</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={18}
                className="flex min-h-[80px] w-full rounded-md border px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs border-border bg-[#1c1c1c] text-neutral-50"
                placeholder="Instruções para a IA..."
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving || !isDirty} size="sm">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-4 h-4 mr-1.5" /> Salvar prompt</>
              )}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm" disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Restaurar padrão
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AIPromptManager;
