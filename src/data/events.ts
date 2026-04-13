export type EventCategory = "musica" | "esporte" | "alimentacao" | "entretenimento" | "palestras" | "feiras" | "festas";

export interface EventData {
  id: string;
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
  categorias: EventCategory[];
  subcategorias: string[];
  latitude: number;
  longitude: number;
  imagem?: string;
  hasExactLocation?: boolean;
  is_featured?: boolean;
  outdoor_duration?: number;
  outdoor_text_align?: string;
  outdoor_text_position?: string;
  outdoor_title_size?: number;
  outdoor_show_description?: boolean;
  is_recurring?: boolean;
  recurring_days?: string[];
}

export const categoryLabels: Record<EventCategory, string> = {
  musica: "Música",
  esporte: "Esporte",
  alimentacao: "Alimentação",
  entretenimento: "Entretenimento",
  palestras: "Palestras",
  feiras: "Feiras",
  festas: "Festas",
};

export const categoryIcons: Record<EventCategory, string> = {
  musica: "🎵",
  esporte: "⚽",
  alimentacao: "🍷",
  entretenimento: "🎭",
  palestras: "🎤",
  feiras: "🏪",
  festas: "🎉",
};

export const subcategoryOptions: Record<EventCategory, string[]> = {
  musica: ["rock", "sertanejo", "pagode", "eletrônica", "funk", "hip-hop", "reggae", "jazz", "tradicionalista", "gaúcha", "MPB"],
  esporte: ["futebol", "corrida", "vôlei", "basquete", "padel", "tênis", "beach tennis", "futevôlei", "arte marcial", "natação", "fitness", "academia"],
  alimentacao: ["bebidas", "vinho", "fast food", "churrasco", "vegano", "sushi", "doces", "naturais"],
  entretenimento: ["teatro", "musical", "drama", "comédia", "apresentação cultural", "premiações", "encontros"],
  palestras: ["empreendedorismo", "tecnologia", "saúde", "gestão", "cultural", "esporte"],
  feiras: ["empreendedorismo", "tecnologia", "automação", "alimentação"],
  festas: ["ar livre", "festa de comunidade", "festa temática", "balada"],
};

export const weekDayLabels: Record<string, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
};

export const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "Gramado": { lat: -29.3731, lng: -50.8760 },
  "Canela": { lat: -29.3645, lng: -50.8116 },
  "Bento Gonçalves": { lat: -29.1699, lng: -51.5187 },
  "Caxias do Sul": { lat: -29.1685, lng: -51.1794 },
  "Garibaldi": { lat: -29.2544, lng: -51.5336 },
  "Carlos Barbosa": { lat: -29.2970, lng: -51.5040 },
  "Flores da Cunha": { lat: -29.0289, lng: -51.1833 },
  "Nova Petrópolis": { lat: -29.3726, lng: -51.1144 },
  "São Marcos": { lat: -28.9696, lng: -51.0686 },
};
