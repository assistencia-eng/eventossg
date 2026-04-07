import * as XLSX from "xlsx";

function parseICS(text: string): string {
  const events: string[] = [];
  const blocks = text.split("BEGIN:VEVENT");
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}[^:]*:(.+)`, "m"));
      return match ? match[1].trim().replace(/\\n/g, " ").replace(/\\,/g, ",") : "";
    };
    
    const dtStart = get("DTSTART");
    let date = "";
    if (dtStart.length >= 8) {
      date = `${dtStart.slice(0, 4)}-${dtStart.slice(4, 6)}-${dtStart.slice(6, 8)}`;
    }
    
    events.push(
      `Evento: ${get("SUMMARY")}\n` +
      `Data: ${date}\n` +
      `Local: ${get("LOCATION")}\n` +
      `Descrição: ${get("DESCRIPTION")}\n`
    );
  }
  
  return events.length > 0
    ? `[Arquivo ICS - ${events.length} evento(s) encontrado(s)]\n\n${events.join("\n---\n\n")}`
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
