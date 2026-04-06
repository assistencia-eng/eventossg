export type EventCategory = "musica" | "esporte" | "teatro" | "alimentacao";

export interface EventData {
  id: string;
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
  imagem?: string;
}

export const categoryLabels: Record<EventCategory, string> = {
  musica: "Música",
  esporte: "Esporte",
  teatro: "Teatro",
  alimentacao: "Alimentação",
};

export const categoryIcons: Record<EventCategory, string> = {
  musica: "🎵",
  esporte: "⚽",
  teatro: "🎭",
  alimentacao: "🍷",
};

export const mockEvents: EventData[] = [
  {
    id: "1",
    nome: "Festival de Inverno de Gramado",
    local: "Palácio dos Festivais",
    cidade: "Gramado",
    endereco: "Av. Borges de Medeiros, 2500",
    data: "2026-07-15",
    descricao: "O maior festival de cinema da América Latina com exibições, shows e premiações em uma atmosfera mágica de inverno.",
    atracoes: ["Exibições de filmes", "Shows musicais", "Premiações", "Meet & greet com artistas"],
    categoria: "teatro",
    latitude: -29.3731,
    longitude: -50.8760,
  },
  {
    id: "2",
    nome: "Festa da Uva",
    local: "Parque de Eventos",
    cidade: "Caxias do Sul",
    endereco: "Rua Ludovico Cavinato, 1431",
    data: "2026-06-20",
    descricao: "Celebração da cultura italiana e da colheita da uva, com degustações, danças folclóricas e gastronomia típica.",
    atracoes: ["Degustação de vinhos", "Danças folclóricas", "Desfile de carros alegóricos", "Gastronomia italiana"],
    categoria: "alimentacao",
    latitude: -29.1685,
    longitude: -51.1794,
  },
  {
    id: "3",
    nome: "Natal Luz",
    local: "Centro de Gramado",
    cidade: "Gramado",
    endereco: "Praça Major Nicoletti",
    data: "2026-12-01",
    descricao: "O espetáculo natalino mais famoso do Brasil, com shows de luzes, desfiles e apresentações encantadoras.",
    atracoes: ["Show de luzes no lago", "Desfile de Natal", "Grande Parada de Natal", "Tannenbaumfest"],
    categoria: "teatro",
    latitude: -29.3750,
    longitude: -50.8755,
  },
  {
    id: "4",
    nome: "Maratona das Hortênsias",
    local: "Largada no Centro",
    cidade: "Gramado",
    endereco: "Av. das Hortênsias, 1",
    data: "2026-05-10",
    descricao: "Corrida de rua pelos cenários deslumbrantes da Serra Gaúcha, passando por vinhedos e paisagens naturais.",
    atracoes: ["Maratona 42km", "Meia maratona 21km", "Corrida 10km", "Corrida kids"],
    categoria: "esporte",
    latitude: -29.3800,
    longitude: -50.8700,
  },
  {
    id: "5",
    nome: "Jazz & Blues Festival",
    local: "Vinícola Miolo",
    cidade: "Bento Gonçalves",
    endereco: "Vale dos Vinhedos, RS 444 km 21",
    data: "2026-08-22",
    descricao: "Festival de jazz e blues em uma das mais belas vinícolas do Brasil, com degustação harmonizada.",
    atracoes: ["Banda Nova Orleans Jazz", "Duo Blues Brothers", "Jam session aberta", "Degustação de vinhos premium"],
    categoria: "musica",
    latitude: -29.1699,
    longitude: -51.5187,
  },
  {
    id: "6",
    nome: "Festival Gastronômico da Serra",
    local: "Roteiro Gastronômico",
    cidade: "Bento Gonçalves",
    endereco: "Vale dos Vinhedos",
    data: "2026-09-05",
    descricao: "Experiência culinária com chefs renomados, harmonizações exclusivas e o melhor da gastronomia serrana.",
    atracoes: ["Jantares temáticos", "Aulas de culinária", "Harmonização vinho e queijos", "Food trucks artesanais"],
    categoria: "alimentacao",
    latitude: -29.1700,
    longitude: -51.5190,
  },
  {
    id: "7",
    nome: "Sonho de Natal em Canela",
    local: "Catedral de Pedra",
    cidade: "Canela",
    endereco: "Praça da Matriz",
    data: "2026-11-15",
    descricao: "Espetáculo de projeção mapeada na Catedral de Pedra, criando uma experiência visual e sonora inesquecível.",
    atracoes: ["Projeção mapeada 3D", "Coral natalino", "Orquestra de câmara", "Queima de fogos"],
    categoria: "teatro",
    latitude: -29.3645,
    longitude: -50.8116,
  },
  {
    id: "8",
    nome: "Mountain Bike Serra Challenge",
    local: "Parque do Caracol",
    cidade: "Canela",
    endereco: "Estrada do Caracol, km 0",
    data: "2026-04-18",
    descricao: "Competição de mountain bike por trilhas naturais com vistas espetaculares da Serra Gaúcha.",
    atracoes: ["Competição cross-country", "Trilha downhill", "Passeio ciclístico familiar", "Feira de equipamentos"],
    categoria: "esporte",
    latitude: -29.3100,
    longitude: -50.8500,
  },
  {
    id: "9",
    nome: "Vindima - Colheita da Uva",
    local: "Vinícola Aurora",
    cidade: "Bento Gonçalves",
    endereco: "Rua Olavo Bilac, 500",
    data: "2026-02-14",
    descricao: "Participe da colheita da uva e pise as uvas como antigamente. Experiência autêntica da cultura vinícola gaúcha.",
    atracoes: ["Colheita manual de uvas", "Pisa da uva tradicional", "Almoço típico colonial", "Tour pelas caves"],
    categoria: "alimentacao",
    latitude: -29.1715,
    longitude: -51.5150,
  },
  {
    id: "10",
    nome: "Festival de Música Clássica",
    local: "Igreja Matriz",
    cidade: "Garibaldi",
    endereco: "Praça Ernesto Travi, Centro",
    data: "2026-10-10",
    descricao: "Concertos de música clássica em igrejas históricas da Serra, com orquestras e solistas de renome internacional.",
    atracoes: ["Orquestra Sinfônica de Porto Alegre", "Recital de piano solo", "Quarteto de cordas", "Concerto de encerramento"],
    categoria: "musica",
    latitude: -29.2544,
    longitude: -51.5336,
  },
  {
    id: "11",
    nome: "Chocofest",
    local: "Centro de Convenções",
    cidade: "Gramado",
    endereco: "Av. Borges de Medeiros, 3100",
    data: "2026-04-05",
    descricao: "Festival do chocolate com oficinas, esculturas gigantes de chocolate e muito sabor. Diversão para toda a família!",
    atracoes: ["Oficina de chocolates", "Caça aos ovos de Páscoa", "Esculturas de chocolate", "Desfile temático"],
    categoria: "alimentacao",
    latitude: -29.3780,
    longitude: -50.8730,
  },
  {
    id: "12",
    nome: "Sertanejo na Serra",
    local: "Arena Gramado",
    cidade: "Gramado",
    endereco: "Rodovia RS 115, km 35",
    data: "2026-06-28",
    descricao: "Grande show sertanejo com artistas nacionais em uma noite inesquecível na Serra Gaúcha.",
    atracoes: ["Dupla sertaneja principal", "Show de abertura", "Praça de alimentação", "Área VIP"],
    categoria: "musica",
    latitude: -29.3850,
    longitude: -50.8680,
  },
];
