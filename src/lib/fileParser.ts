import * as XLSX from "xlsx";

export interface ParsedICSEvent {
  summary: string;
  startDate: string;
  endDate: string | null;
  time: string | null;
  location: string;
  description: string;
}

const isValidICSDateValue = (raw: string) => /^\d{8}(?:T\d{4,6}Z?)?$/.test(raw);

const unfoldICS = (text: string) => text.replace(/\r?\n[ \t]/g, "");

const cleanICSValue = (value: string) =>
  value
    .trim()
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");

const getICSProp = (block: string, key: string): { value: string; params: string } => {
  const re = new RegExp(`^${key}(;[^:\\r\\n]*)?:(.*)$`, "m");
  const match = block.match(re);
  if (!match) return { value: "", params: "" };
  return { value: cleanICSValue(match[2]), params: match[1] || "" };
};

const parseICSDateValue = (raw: string): { date: string; time: string | null } => {
  if (!isValidICSDateValue(raw)) return { date: "", time: null };

  const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const timeMatch = raw.match(/T(\d{2})(\d{2})/);

  return {
    date,
    time: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null,
  };
};

const subtractOneUTCDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

export function parseICSEvents(text: string): ParsedICSEvent[] {
  const unfolded = unfoldICS(text);
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);

  return blocks
    .map((rawBlock) => {
      const block = rawBlock.split("END:VEVENT")[0];
      const dtStart = getICSProp(block, "DTSTART");
      const dtEnd = getICSProp(block, "DTEND");
      const start = parseICSDateValue(dtStart.value);
      const end = parseICSDateValue(dtEnd.value);

      const startIsAllDay = dtStart.params.includes("VALUE=DATE") || dtStart.value.length === 8;
      const endIsAllDay = dtEnd.params.includes("VALUE=DATE") || dtEnd.value.length === 8;
      let endDate = end.date || null;

      if (startIsAllDay && endIsAllDay && endDate && endDate !== start.date) {
        endDate = subtractOneUTCDate(endDate);
      }

      return {
        summary: getICSProp(block, "SUMMARY").value,
        startDate: start.date,
        endDate: endDate && endDate !== start.date ? endDate : null,
        time: start.time,
        location: getICSProp(block, "LOCATION").value,
        description: getICSProp(block, "DESCRIPTION").value,
      };
    })
    .filter((event) => event.summary || event.startDate || event.location || event.description);
}

function parseICS(text: string): string {
  const events = parseICSEvents(text);

  return events.length > 0
    ? `[Arquivo ICS — ${events.length} evento(s) encontrado(s). IMPORTANTE: cada evento abaixo tem sua própria Data de início. Use EXATAMENTE a Data de início e Data de término indicada em cada bloco, na mesma ordem dos eventos. NUNCA substitua pela data de hoje nem copie a data de um evento para outro.]\n\n${events
        .map((event, index) => {
          const lines = [
            `#${index + 1}`,
            `Evento: ${event.summary}`,
            `Data de início (YYYY-MM-DD): ${event.startDate}`,
          ];
          if (event.endDate) lines.push(`Data de término (YYYY-MM-DD): ${event.endDate}`);
          if (event.time) lines.push(`Horário: ${event.time}`);
          if (event.location) lines.push(`Local: ${event.location}`);
          if (event.description) lines.push(`Descrição: ${event.description}`);
          return lines.join("\n");
        })
        .join("\n---\n\n")}`
    : text;
}

export interface ParsedJSONEvent {
  startDate: string | null;
  endDate: string | null;
  time: string | null;
}

const DATE_START_KEYS = ["data", "data_inicio", "data_de_inicio", "datainicio", "dt_inicio", "dtstart", "start", "start_date", "startdate", "starts_at", "starts", "begin", "begin_date", "inicio", "date"];
const DATE_END_KEYS = ["data_fim", "data_final", "data_de_termino", "data_termino", "datafim", "dt_fim", "dtend", "end", "end_date", "enddate", "ends_at", "ends", "fim", "termino"];
const TIME_KEYS = ["horario", "hora", "hour", "time", "start_time", "starttime"];

const findKeyValue = (obj: Record<string, unknown>, keys: string[]): unknown => {
  const lowerMap = new Map<string, string>();
  for (const k of Object.keys(obj)) lowerMap.set(k.toLowerCase().replace(/[\s\-]/g, "_"), k);
  for (const k of keys) {
    const real = lowerMap.get(k);
    if (real !== undefined) return obj[real];
  }
  return undefined;
};

const normalizeDateValue = (val: unknown): { date: string | null; time: string | null } => {
  if (val == null) return { date: null, time: null };
  const s = String(val).trim();
  if (!s) return { date: null, time: null };

  // ISO with optional time: 2026-03-15 or 2026-03-15T20:00...
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (iso) {
    const date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    const time = iso[4] && iso[5] ? `${iso[4]}:${iso[5]}` : null;
    return { date, time };
  }

  // DD/MM/YYYY or DD-MM-YYYY (pt-BR)
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{2}):(\d{2}))?/);
  if (dmy) {
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    const month = parseInt(dmy[2], 10);
    const day = parseInt(dmy[1], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const time = dmy[4] && dmy[5] ? `${dmy[4]}:${dmy[5]}` : null;
      return { date, time };
    }
  }

  return { date: null, time: null };
};

const collectEventObjects = (data: unknown): Record<string, unknown>[] => {
  if (Array.isArray(data)) {
    return data.flatMap((item) => collectEventObjects(item));
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Common containers
    for (const key of ["events", "eventos", "items", "data", "results"]) {
      const v = obj[key];
      if (Array.isArray(v)) {
        const arr = v.flatMap((item) => collectEventObjects(item));
        if (arr.length > 0) return arr;
      }
    }
    // Single event object
    return [obj];
  }
  return [];
};

export function parseJSONEvents(text: string): ParsedJSONEvent[] {
  try {
    const data = JSON.parse(text);
    const objs = collectEventObjects(data);
    return objs.map((obj) => {
      const startRaw = findKeyValue(obj, DATE_START_KEYS);
      const endRaw = findKeyValue(obj, DATE_END_KEYS);
      const timeRaw = findKeyValue(obj, TIME_KEYS);
      const start = normalizeDateValue(startRaw);
      const end = normalizeDateValue(endRaw);
      let time: string | null = start.time || end.time || null;
      if (!time && typeof timeRaw === "string") {
        const m = timeRaw.match(/(\d{1,2}):(\d{2})/);
        if (m) time = `${m[1].padStart(2, "0")}:${m[2]}`;
      }
      return {
        startDate: start.date,
        endDate: end.date && end.date !== start.date ? end.date : null,
        time,
      };
    });
  } catch {
    return [];
  }
}

function annotateJSON(text: string): string {
  const events = parseJSONEvents(text);
  if (events.length === 0) return text;
  const hints = events
    .map((e, i) => {
      const lines = [`#${i + 1}`];
      if (e.startDate) lines.push(`Data de início (YYYY-MM-DD): ${e.startDate}`);
      if (e.endDate) lines.push(`Data de término (YYYY-MM-DD): ${e.endDate}`);
      if (e.time) lines.push(`Horário: ${e.time}`);
      return lines.join("\n");
    })
    .join("\n---\n");
  return `[Arquivo JSON — ${events.length} evento(s). IMPORTANTE: use EXATAMENTE as datas indicadas abaixo para cada evento, na mesma ordem. NUNCA substitua pela data de hoje.]\n\n${hints}\n\n[Conteúdo original]\n${text}`;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "ics") {
    const text = await file.text();
    return parseICS(text);
  }

  if (ext === "csv" || ext === "txt") {
    return file.text();
  }

  if (ext === "json") {
    const text = await file.text();
    return annotateJSON(text);
  }

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    let result = "";
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      result += `--- Planilha: ${sheetName} ---\n`;
      result += XLSX.utils.sheet_to_csv(sheet) + "\n\n";
    }
    return result;
  }

  if (ext === "pdf") {
    const text = await file.text();
    if (text.startsWith("%PDF")) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < Math.min(bytes.length, 50000); i++) {
        const char = bytes[i];
        if (char >= 32 && char < 127) binary += String.fromCharCode(char);
        else if (char === 10 || char === 13) binary += "\n";
      }
      return `[Arquivo PDF - texto extraído parcialmente]\n${binary}`;
    }
    return text;
  }

  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) {
    return `[Imagem: ${file.name} - OCR não disponível no momento. Por favor, descreva os eventos manualmente.]`;
  }

  return file.text();
}

export function getSupportedExtensions(): string[] {
  return ["csv", "json", "txt", "xlsx", "xls", "pdf", "png", "jpg", "jpeg", "ics"];
}

export function isFileSupported(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return getSupportedExtensions().includes(ext || "");
}
