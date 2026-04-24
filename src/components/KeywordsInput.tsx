import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeywordsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  available: string[];
  max?: number;
  placeholder?: string;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const KeywordsInput = ({
  value,
  onChange,
  available,
  max = 5,
  placeholder = "Digite uma palavra-chave…",
}: KeywordsInputProps) => {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const reachedMax = value.length >= max;

  const suggestions = input.trim()
    ? available.filter((k) => {
        const nk = normalize(k);
        const nq = normalize(input);
        return nk.includes(nq) && !value.some((v) => normalize(v) === nk);
      }).slice(0, 8)
    : available.filter((k) => !value.some((v) => normalize(v) === normalize(k))).slice(0, 8);

  useEffect(() => {
    setHighlight(0);
  }, [input, focused]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed || reachedMax) return;
    if (value.some((v) => normalize(v) === normalize(trimmed))) {
      setInput("");
      return;
    }
    // Only allow keywords that exist in the library (case-insensitive match)
    const match = available.find((k) => normalize(k) === normalize(trimmed));
    if (!match) return;
    onChange([...value, match]);
    setInput("");
  };

  const removeKeyword = (kw: string) => {
    onChange(value.filter((k) => k !== kw));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlight]) addKeyword(suggestions[highlight]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeKeyword(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex flex-wrap gap-1.5 p-2 rounded-md border border-input bg-background min-h-10",
          focused && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
        onClick={() => {
          setFocused(true);
          containerRef.current?.querySelector("input")?.focus();
        }}
      >
        {value.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
          >
            {kw}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeKeyword(kw);
              }}
              className="hover:bg-primary-foreground/20 rounded-full p-0.5"
              aria-label={`Remover ${kw}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!reachedMax && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
          />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{value.length}/{max} palavras-chave</span>
        {reachedMax && <span className="text-destructive">Limite atingido</span>}
      </div>

      {focused && suggestions.length > 0 && !reachedMax && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addKeyword(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm transition-colors",
                i === highlight
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {focused && input.trim() && suggestions.length === 0 && !reachedMax && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-xs text-muted-foreground">
          Nenhuma palavra-chave encontrada. Apenas palavras-chave cadastradas pelo administrador podem ser usadas.
        </div>
      )}
    </div>
  );
};

export default KeywordsInput;
