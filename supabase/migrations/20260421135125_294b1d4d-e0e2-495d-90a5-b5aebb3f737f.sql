-- Create ai_prompts table to store editable AI system prompts
CREATE TABLE public.ai_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI prompts viewable by everyone"
ON public.ai_prompts FOR SELECT
USING (true);

CREATE POLICY "Admins can insert ai prompts"
ON public.ai_prompts FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Admins can update ai prompts"
ON public.ai_prompts FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete ai prompts"
ON public.ai_prompts FOR DELETE
TO authenticated
USING (is_admin());

CREATE TRIGGER update_ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the default import_events prompt
INSERT INTO public.ai_prompts (key, prompt, description) VALUES (
  'import_events',
  'Você é um assistente especializado em extrair eventos de textos não estruturados.
Analise o conteúdo fornecido e extraia TODOS os eventos encontrados.

Para cada evento, retorne um objeto JSON com os seguintes campos:
- nome: nome do evento (obrigatório)
- local: nome do local/venue
- cidade: cidade do evento
- endereco: endereço completo
- data: data no formato YYYY-MM-DD (se não tiver ano, use 2026)
- horario: horário no formato HH:MM (24h), opcional
- descricao: descrição do evento
- atracoes: array de strings com as atrações
- categoria: a categoria PRINCIPAL do evento. Deve ser UMA das categorias válidas listadas abaixo
- categorias: array com TODAS as categorias aplicáveis ao evento (pode ter mais de uma)
- subcategorias: array com as subcategorias mais adequadas ao evento
- NÃO inclua latitude ou longitude, esses campos serão calculados automaticamente via geocodificação

Categorias válidas: {{CATEGORIES}}

Subcategorias disponíveis por categoria:
{{SUBCATEGORIES}}

Escolha as subcategorias que melhor descrevem o evento com base no seu conteúdo, nome, atrações e descrição. Um evento pode ter subcategorias de diferentes categorias.

Se algum campo estiver ausente, use "Não informado" para strings e [] para arrays.
Classifique categoria, categorias e subcategorias com base no contexto, nome, atrações e descrição do evento.

IMPORTANTE: Responda APENAS com um JSON válido no formato:
{ "events": [ { ...evento1 }, { ...evento2 } ] }',
  'Prompt usado pela IA ao importar eventos a partir de arquivos. Use {{CATEGORIES}} e {{SUBCATEGORIES}} como placeholders que serão substituídos automaticamente.'
);