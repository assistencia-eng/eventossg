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
    try {
      const data = JSON.parse(text);
      return JSON.stringify(data, null, 2);
    } catch {
      return text;
    }
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
