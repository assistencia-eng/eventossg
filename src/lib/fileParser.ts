import * as XLSX from "xlsx";

function parseICS(text: string): string {
  // Unfold ICS lines (RFC 5545: continuation lines start with space/tab)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const events: string[] = [];
  const blocks = unfolded.split("BEGIN:VEVENT");

  // Extracts a property value, supporting parameters like DTSTART;TZID=...:value or DTSTART;VALUE=DATE:value
  const getProp = (block: string, key: string): { value: string; params: string } => {
    // Match start of line: KEY (optionally followed by ;params) then : then value (until end of line)
    const re = new RegExp(`^${key}(;[^:\\r\\n]*)?:(.*)$`, "m");
    const match = block.match(re);
    if (!match) return { value: "", params: "" };
    return {
      value: match[2].trim().replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";"),
      params: match[1] || "",
    };
  };

  // Convert ICS date/datetime (YYYYMMDD or YYYYMMDDTHHMMSSZ) to { date: YYYY-MM-DD, time: HH:MM | "" }
  const parseICSDate = (raw: string): { date: string; time: string } => {
    if (!raw || raw.length < 8) return { date: "", time: "" };
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    let time = "";
    // Datetime form: 20260315T193000Z or 20260315T193000
    const tMatch = raw.match(/T(\d{2})(\d{2})/);
    if (tMatch) time = `${tMatch[1]}:${tMatch[2]}`;
    return { date, time };
  };

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];

    const summary = getProp(block, "SUMMARY").value;
    const location = getProp(block, "LOCATION").value;
    const description = getProp(block, "DESCRIPTION").value;
    const dtStartRaw = getProp(block, "DTSTART").value;
    const dtEndRaw = getProp(block, "DTEND").value;

    const start = parseICSDate(dtStartRaw);
    const end = parseICSDate(dtEndRaw);

    // For all-day events, DTEND in ICS is exclusive (next day). Subtract 1 day to get the real last day.
    let endDate = end.date;
    const isAllDay = dtStartRaw.length === 8 && dtEndRaw.length === 8;
    if (isAllDay && endDate && endDate !== start.date) {
      const d = new Date(`${endDate}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      endDate = d.toISOString().slice(0, 10);
    }

    const lines = [
      `Evento: ${summary}`,
      `Data de início (YYYY-MM-DD): ${start.date}`,
    ];
    if (endDate && endDate !== start.date) {
      lines.push(`Data de término (YYYY-MM-DD): ${endDate}`);
    }
    if (start.time) lines.push(`Horário: ${start.time}`);
    if (location) lines.push(`Local: ${location}`);
    if (description) lines.push(`Descrição: ${description}`);

    events.push(lines.join("\n"));
  }

  return events.length > 0
    ? `[Arquivo ICS — ${events.length} evento(s) encontrado(s). IMPORTANTE: use EXATAMENTE as datas indicadas em cada evento abaixo. NUNCA substitua pela data de hoje.]\n\n${events.join("\n---\n\n")}`
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
