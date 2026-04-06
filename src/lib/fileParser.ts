import * as XLSX from "xlsx";

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

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
    // For PDF, we send raw text extraction attempt
    const text = await file.text();
    // PDFs are binary - we'll send a message about it
    if (text.startsWith("%PDF")) {
      // Return base64 for the AI to attempt parsing
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

  // For images and other formats, return a note
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) {
    return `[Imagem: ${file.name} - OCR não disponível no momento. Por favor, descreva os eventos manualmente.]`;
  }

  return file.text();
}

export function getSupportedExtensions(): string[] {
  return ["csv", "json", "txt", "xlsx", "xls", "pdf", "png", "jpg", "jpeg"];
}

export function isFileSupported(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return getSupportedExtensions().includes(ext || "");
}
