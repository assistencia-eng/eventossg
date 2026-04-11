import { EventCategory } from "./events";

export interface CategoryColor {
  vibrant: string; // hex color for text
  muted: string;   // hex color for chip background (auto-generated darker version)
}

// Default vibrant colors for each category
export const categoryColors: Record<EventCategory, CategoryColor> = {
  alimentacao: { vibrant: "#e05555", muted: "#3d1a1a" },
  entretenimento: { vibrant: "#e0a030", muted: "#3d2e14" },
  esporte: { vibrant: "#4eca6a", muted: "#1a3322" },
  feiras: { vibrant: "#d4a843", muted: "#332c14" },
  festas: { vibrant: "#e060a0", muted: "#3d1a2e" },
  musica: { vibrant: "#a855f7", muted: "#2a1640" },
  palestras: { vibrant: "#5ea0e6", muted: "#1a2a3d" },
};

/**
 * Generate a muted/desaturated background color from a vibrant hex color.
 * Returns a dark, low-saturation version suitable for dark theme chip backgrounds.
 */
export function generateMutedColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Convert to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max - min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  // Create muted version: keep hue, reduce saturation, darken significantly
  const mutedS = s * 0.4;
  const mutedL = 0.14;

  // HSL to RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = mutedL < 0.5 ? mutedL * (1 + mutedS) : mutedL + mutedS - mutedL * mutedS;
  const p = 2 * mutedL - q;

  const mr = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const mg = Math.round(hue2rgb(p, q, h) * 255);
  const mb = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return `#${mr.toString(16).padStart(2, "0")}${mg.toString(16).padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
}
