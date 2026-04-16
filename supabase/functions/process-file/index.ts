import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const validCategories = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const validSubcategories: Record<string, string[]> = {
  musica: ["rock", "sertanejo", "pagode", "eletrônica", "funk", "hip-hop", "reggae", "jazz", "tradicionalista", "gaúcha", "MPB"],
  esporte: ["futebol", "corrida", "vôlei", "basquete", "padel", "tênis", "beach tennis", "futevôlei", "arte marcial", "natação", "fitness", "academia"],
  alimentacao: ["bebidas", "vinho", "fast food", "churrasco", "vegano", "sushi", "doces", "naturais"],
  entretenimento: ["teatro", "musical", "drama", "comédia", "apresentação cultural", "premiações", "encontros"],
  palestras: ["empreendedorismo", "tecnologia", "saúde", "gestão", "cultural", "esporte"],
  feiras: ["empreendedorismo", "tecnologia", "automação", "alimentação"],
  festas: ["ar livre", "festa de comunidade", "festa temática", "balada"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, fileName } = await req.json();

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

    const subcatList = Object.entries(validSubcategories)
      .map(([cat, subs]) => `  ${cat}: ${subs.join(", ")}`)
      .join("\n");

    const systemPrompt = `Você é um assistente especializado em extrair eventos de textos não estruturados.
Analise o conteúdo fornecido e extraia TODOS os eventos encontrados.

Para cada evento, retorne um objeto JSON com os seguintes campos:
- nome: nome do evento (obrigatório)
- local: nome do local/venue
- cidade: cidade do evento
- endereco: endereço completo
- data: data no formato YYYY-MM-DD (se não tiver ano, use 2026)
- descricao: descrição do evento
- atracoes: array de strings com as atrações
- categoria: a categoria PRINCIPAL do evento. Deve ser UMA das seguintes: ${validCategories.join(", ")}
- categorias: array com TODAS as categorias aplicáveis ao evento (pode ter mais de uma). Valores possíveis: ${validCategories.join(", ")}
- subcategorias: array com as subcategorias mais adequadas ao evento. As subcategorias disponíveis por categoria são:
${subcatList}
  Escolha as subcategorias que melhor descrevem o evento com base no seu conteúdo, nome, atrações e descrição. Um evento pode ter subcategorias de diferentes categorias.
- NÃO inclua latitude ou longitude, esses campos serão calculados automaticamente via geocodificação

Se algum campo estiver ausente, use "Não informado" para strings e [] para arrays.
Classifique categoria, categorias e subcategorias com base no contexto, nome, atrações e descrição do evento.

IMPORTANTE: Responda APENAS com um JSON válido no formato:
{ "events": [ { ...evento1 }, { ...evento2 } ] }`;

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

    // All valid subcategories flattened
    const allValidSubs = Object.values(validSubcategories).flat();

    const events = (parsed.events || []).map((e: Record<string, unknown>) => {
      const mainCat = validCategories.includes(e.categoria as string) ? e.categoria as string : "entretenimento";
      const cats = Array.isArray(e.categorias)
        ? (e.categorias as string[]).filter((c) => validCategories.includes(c))
        : [mainCat];
      const subs = Array.isArray(e.subcategorias)
        ? (e.subcategorias as string[]).filter((s) => allValidSubs.includes(s))
        : [];

      return {
        nome: e.nome || "Não informado",
        local: e.local || "Não informado",
        cidade: e.cidade || "Não informado",
        endereco: e.endereco || "Não informado",
        data: e.data || new Date().toISOString().split("T")[0],
        descricao: e.descricao || "Não informado",
        atracoes: Array.isArray(e.atracoes) ? e.atracoes : [],
        categoria: mainCat,
        categorias: cats.length > 0 ? cats : [mainCat],
        subcategorias: subs,
        latitude: -29.3731,
        longitude: -50.876,
      };
    });

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
