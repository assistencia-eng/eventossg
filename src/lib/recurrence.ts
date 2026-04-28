// Smart recurrence detection from a set of dates (YYYY-MM-DD strings).
// Detects: daily, weekly (1+ specific weekdays), monthly (same day each month).
// Does NOT detect yearly patterns — those should remain unique events.

export type RecurrencePattern =
  | { type: "daily"; label: string }
  | { type: "weekly"; days: string[]; label: string }
  | { type: "monthly"; dayOfMonth: number; label: string }
  | null;

const WEEKDAY_KEYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const WEEKDAY_LABELS_SHORT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const parseLocal = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

export const detectRecurrence = (dates: string[]): RecurrencePattern => {
  const valid = Array.from(new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))))
    .map((d) => parseLocal(d))
    .sort((a, b) => a.getTime() - b.getTime());

  if (valid.length < 2) return null;

  // Reject yearly patterns: span > 1 year and very few occurrences
  const span = dayDiff(valid[0], valid[valid.length - 1]);
  if (span >= 350 && valid.length <= span / 300 + 1) return null;

  // --- DAILY: consecutive days ---
  let consecutive = true;
  for (let i = 1; i < valid.length; i++) {
    if (dayDiff(valid[i - 1], valid[i]) !== 1) { consecutive = false; break; }
  }
  if (consecutive && valid.length >= 3) {
    return { type: "daily", label: "Todo dia" };
  }

  // --- MONTHLY: same day-of-month each month ---
  const days = valid.map((d) => d.getDate());
  const allSameDay = days.every((d) => d === days[0]);
  if (allSameDay && valid.length >= 2) {
    // Check months are spaced by ~1 month
    let monthly = true;
    for (let i = 1; i < valid.length; i++) {
      const prev = valid[i - 1], cur = valid[i];
      const diffMonths = (cur.getFullYear() - prev.getFullYear()) * 12 + (cur.getMonth() - prev.getMonth());
      if (diffMonths !== 1) { monthly = false; break; }
    }
    if (monthly) {
      return { type: "monthly", dayOfMonth: days[0], label: `Todo dia ${days[0]} do mês` };
    }
  }

  // --- WEEKLY: specific weekdays repeat over multiple weeks ---
  const weekdaysSet = new Set(valid.map((d) => d.getDay()));
  const weekdays = Array.from(weekdaysSet).sort((a, b) => a - b);
  // Need at least 2 occurrences AND spread over >= 8 days (multiple weeks)
  if (span >= 8 && valid.length >= weekdays.length * 2) {
    // Validate each detected weekday appears at least twice
    const counts = new Map<number, number>();
    for (const d of valid) counts.set(d.getDay(), (counts.get(d.getDay()) || 0) + 1);
    const allRepeat = weekdays.every((wd) => (counts.get(wd) || 0) >= 2);
    if (allRepeat) {
      const dayKeys = weekdays.map((wd) => WEEKDAY_KEYS[wd]);
      const labels = weekdays.map((wd) => WEEKDAY_LABELS_SHORT[wd]);
      let label: string;
      if (weekdays.length === 1) label = `Todo ${labels[0].toLowerCase()}`;
      else if (weekdays.length === 7) label = "Todo dia";
      else label = labels.join(" e ");
      return { type: "weekly", days: dayKeys, label };
    }
  }

  return null;
};

// Group events by normalized name and detect recurrence per group.
export interface MinimalEvent {
  id: string;
  nome: string;
  data: string;
}

const normName = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const buildRecurrenceMap = <T extends MinimalEvent>(events: T[]): Map<string, RecurrencePattern> => {
  const groups = new Map<string, T[]>();
  for (const e of events) {
    const key = normName(e.nome);
    if (!key) continue;
    const arr = groups.get(key) || [];
    arr.push(e);
    groups.set(key, arr);
  }
  const out = new Map<string, RecurrencePattern>();
  for (const [, arr] of groups) {
    if (arr.length < 2) continue;
    const pattern = detectRecurrence(arr.map((e) => e.data));
    if (!pattern) continue;
    for (const e of arr) out.set(e.id, pattern);
  }
  return out;
};
