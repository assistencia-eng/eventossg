import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const defaultCategories = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const defaultSubcategories: Record<string, string[]> = {
  musica: ["rock", "sertanejo", "pagode", "eletrônica", "funk", "hip-hop", "reggae", "jazz", "tradicionalista", "gaúcha", "MPB"],
  esporte: ["futebol", "corrida", "vôlei", "basquete", "padel", "tênis", "beach tennis", "futevôlei", "arte marcial", "natação", "fitness", "academia"],
  alimentacao: ["bebidas", "vinho", "fast food", "churrasco", "vegano", "sushi", "doces", "naturais"],
  entretenimento: ["teatro", "musical", "drama", "comédia", "apresentação cultural", "premiações", "encontros"],
  palestras: ["empreendedorismo", "tecnologia", "saúde", "gestão", "cultural", "esporte"],
  feiras: ["empreendedorismo", "tecnologia", "automação", "alimentação"],
  festas: ["ar livre", "festa de comunidade", "festa temática", "balada"],
};

const DEFAULT_PROMPT = `Você é um assistente especializado em extrair eventos de textos não estruturados.
Analise o conteúdo fornecido e extraia TODOS os eventos encontrados.

Para cada evento, retorne um objeto JSON com os seguintes campos:
- nome: nome do evento (obrigatório)
- local: nome do local/venue
- cidade: cidade do evento
- endereco: endereço completo
- data: data de INÍCIO no formato YYYY-MM-DD (se não tiver ano, use 2026)
- data_fim: data de TÉRMINO no formato YYYY-MM-DD. **OBRIGATÓRIO** verificar se o evento dura mais de um dia (ex.: festivais, feiras, exposições com período "de X a Y", "entre X e Y", "X até Y"). Se durar mais de um dia, preencha com a data final. Se for um evento de um único dia, retorne null.
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

IMPORTANTE: Responda APENAS com um JSON válido no formato:
{ "events": [ { ...evento1 }, { ...evento2 } ] }`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, fileName, availableKeywords } = await req.json();

    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'content' é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build dynamic taxonomy: defaults + customs from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [customCatsRes, customSubsRes, removedSubsRes, promptRes] = await Promise.all([
      supabase.from("custom_categories").select("key, label"),
      supabase.from("custom_subcategories").select("categoria, subcategoria"),
      supabase.from("removed_default_subcategories").select("categoria, subcategoria"),
      supabase.from("ai_prompts").select("prompt").eq("key", "import_events").maybeSingle(),
    ]);

    const allCategories = [
      ...defaultCategories,
      ...((customCatsRes.data || []).map((r: { key: string }) => r.key).filter((k: string) => !defaultCategories.includes(k))),
    ];

    // Compose subcategory map
    const subMap: Record<string, string[]> = {};
    for (const c of allCategories) {
      subMap[c] = [...(defaultSubcategories[c] || [])];
    }
    // Remove defaults that admins removed
    for (const r of (removedSubsRes.data || []) as Array<{ categoria: string; subcategoria: string }>) {
      if (subMap[r.categoria]) {
        subMap[r.categoria] = subMap[r.categoria].filter((s) => s !== r.subcategoria);
      }
    }
    // Add custom subs
    for (const r of (customSubsRes.data || []) as Array<{ categoria: string; subcategoria: string }>) {
      if (!subMap[r.categoria]) subMap[r.categoria] = [];
      if (!subMap[r.categoria].includes(r.subcategoria)) subMap[r.categoria].push(r.subcategoria);
    }

    const subcatList = Object.entries(subMap)
      .map(([cat, subs]) => `  ${cat}: ${subs.join(", ")}`)
      .join("\n");

    const kwList = Array.isArray(availableKeywords) && availableKeywords.length > 0
      ? availableKeywords.join(", ")
      : "(nenhuma palavra-chave cadastrada — sempre retorne keywords: [])";

    const promptTemplate = promptRes.data?.prompt || DEFAULT_PROMPT;
    const systemPrompt = promptTemplate
      .replaceAll("{{CATEGORIES}}", allCategories.join(", "))
      .replaceAll("{{SUBCATEGORIES}}", subcatList)
      .replaceAll("{{KEYWORDS}}", kwList);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Arquivo: ${fileName || "desconhecido"}\n\nConteúdo:\n${content}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Configurações > Workspace > Uso." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Resposta vazia da IA");
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        throw new Error("Não foi possível interpretar a resposta da IA");
      }
    }

    const allValidSubs = Object.values(subMap).flat();
    const validKeywordsLower = (Array.isArray(availableKeywords) ? availableKeywords : []).map((k: string) => String(k).toLowerCase());
    const validKeywordsByLower = new Map<string, string>();
    for (const k of (Array.isArray(availableKeywords) ? availableKeywords : [])) {
      validKeywordsByLower.set(String(k).toLowerCase(), String(k));
    }

    const events = (parsed.events || []).map((e: Record<string, unknown>) => {
      const mainCat = allCategories.includes(e.categoria as string) ? (e.categoria as string) : "entretenimento";
      const cats = Array.isArray(e.categorias)
        ? (e.categorias as string[]).filter((c) => allCategories.includes(c))
        : [mainCat];
      const subs = Array.isArray(e.subcategorias)
        ? (e.subcategorias as string[]).filter((s) => allValidSubs.includes(s))
        : [];
      const kws = Array.isArray(e.keywords)
        ? (e.keywords as string[])
            .map((k) => validKeywordsByLower.get(String(k).toLowerCase()))
            .filter((k): k is string => !!k)
        : [];
      // Dedupe
      const uniqueKws = Array.from(new Set(kws));

      return {
        nome: e.nome || "Não informado",
        local: e.local || "Não informado",
        cidade: e.cidade || "Não informado",
        endereco: e.endereco || "Não informado",
        data: e.data || new Date().toISOString().split("T")[0],
        horario: typeof e.horario === "string" ? e.horario : null,
        descricao: e.descricao || "Não informado",
        atracoes: Array.isArray(e.atracoes) ? e.atracoes : [],
        categoria: mainCat,
        categorias: cats.length > 0 ? cats : [mainCat],
        subcategorias: subs,
        keywords: uniqueKws,
        latitude: -29.3731,
        longitude: -50.876,
      };
    });
    void validKeywordsLower;

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-file error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
