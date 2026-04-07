

# Geocodificação Automática de Endereços

## Objetivo
Implementar geocodificação automática usando a API gratuita do OpenStreetMap (Nominatim) para converter endereços em coordenadas reais de latitude/longitude, tanto no cadastro manual quanto na importação de eventos.

## Abordagem

### 1. Edge Function `geocode` (novo)
Criar `supabase/functions/geocode/index.ts` que:
- Recebe `endereco` e `cidade` como parâmetros
- Chama a API Nominatim (`https://nominatim.openstreetmap.org/search`) com o endereço completo
- Retorna `{ latitude, longitude, hasExactLocation }` 
- Se não encontrar resultado, retorna coordenadas padrão da cidade (do dicionário `cityCoordinates`) com `hasExactLocation = false`
- Inclui `User-Agent` adequado (requisito da Nominatim) e tratamento de rate limit (1 req/s)

### 2. Atualizar `AddEventForm.tsx`
- Após preencher cidade + endereço, chamar a edge function `geocode` antes de salvar
- Se houver endereço completo e a geocodificação retornar coordenadas válidas, salvar com `hasExactLocation` implícito (endereço real)
- Mostrar feedback visual durante a geocodificação (spinner)

### 3. Atualizar `process-file/index.ts`
- No prompt da IA, instruir para retornar o endereço textual sem inventar coordenadas
- Após receber os eventos da IA, fazer geocodificação em lote (com delay de 1s entre chamadas para respeitar rate limit da Nominatim)
- Alternativa: chamar geocode do front-end ao salvar cada evento importado

### 4. Atualizar `ImportEvents.tsx`
- Na etapa de confirmação/salvamento, geocodificar cada evento antes de inserir no banco
- Exibir progresso da geocodificação

## Detalhes Técnicos

- **API**: Nominatim (OpenStreetMap) — gratuita, sem API key, limite de 1 req/s
- **Fallback**: Se geocodificação falhar, usar coordenadas genéricas da cidade do dicionário `cityCoordinates`
- **Rate limit**: Aguardar 1 segundo entre chamadas consecutivas à Nominatim
- **Sem custo adicional**: Não requer chaves de API ou pagamentos

## Arquivos Modificados
- `supabase/functions/geocode/index.ts` (novo)
- `src/components/AddEventForm.tsx` — chamar geocode ao salvar
- `src/components/ImportEvents.tsx` — geocodificar antes de inserir
- `supabase/functions/process-file/index.ts` — remover coordenadas inventadas do prompt da IA

