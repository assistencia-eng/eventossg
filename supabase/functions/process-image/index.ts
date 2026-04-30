import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente que extrai dados de eventos a partir de imagens (flyers/cartazes).
Analise a imagem e retorne UM ÚNICO evento detectado em formato JSON com os campos:
- nome: nome do evento (string)
- data: data inicial no formato YYYY-MM-DD. Se a imagem não mostrar o ano, assuma o ano atual ou o próximo plausível. Se nenhuma data estiver visível, retorne "".
- data_fim: data final no formato YYYY-MM-DD se houver período, senão null.
- horario: horário no formato HH:MM (24h) se visível, senão null.
- local: nome do local/venue se visível, senão "".
- cidade: cidade se visível, senão "".
- endereco: endereço completo se visível, senão "".
- descricao: breve descrição extraída do flyer (1-2 frases), senão "".
- atracoes: array de strings com artistas, atrações ou destaques visíveis, senão [].
- whatsapp: número de telefone/WhatsApp visível (apenas dígitos com DDD), senão null.
- instagram: handle ou URL do Instagram visível (sem @), senão null.
- facebook: handle ou URL do Facebook visível, senão null.

Responda APENAS com JSON válido, sem markdown, sem comentários.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'imageBase64' é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os dados do evento desta imagem." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
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
    if (!rawContent) throw new Error("Resposta vazia da IA");

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const m = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) parsed = JSON.parse(m[1]);
      else throw new Error("Não foi possível interpretar a resposta da IA");
    }

    const event = {
      nome: typeof parsed.nome === "string" ? parsed.nome : "",
      data: typeof parsed.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data) ? parsed.data : "",
      data_fim: typeof parsed.data_fim === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data_fim) ? parsed.data_fim : null,
      horario: typeof parsed.horario === "string" ? parsed.horario : null,
      local: typeof parsed.local === "string" ? parsed.local : "",
      cidade: typeof parsed.cidade === "string" ? parsed.cidade : "",
      endereco: typeof parsed.endereco === "string" ? parsed.endereco : "",
      descricao: typeof parsed.descricao === "string" ? parsed.descricao : "",
      atracoes: Array.isArray(parsed.atracoes) ? parsed.atracoes.filter((a: any) => typeof a === "string") : [],
      whatsapp: parsed.whatsapp || null,
      instagram: parsed.instagram || null,
      facebook: parsed.facebook || null,
    };

    return new Response(JSON.stringify({ event }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
