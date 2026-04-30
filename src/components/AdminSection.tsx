import { ReactNode, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface AdminSectionProps {
  title: string;
  icon?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  count?: number | null;
}

/**
 * Reusable accordion section for the admin profile page.
 * - Header with title, optional icon, optional count and chevron
 * - Smooth expand/collapse animation
 * - Controlled (parent decides expanded state) so the parent can enforce
 *   "only one open at a time"
 */
const AdminSection = ({ title, icon, expanded, onToggle, children, count }: AdminSectionProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Smooth height animation
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (expanded) {
      el.style.height = "auto";
      const h = el.scrollHeight;
      el.style.height = "0px";
      // force reflow
      void el.offsetHeight;
      el.style.height = h + "px";
      const t = setTimeout(() => {
        if (contentRef.current) contentRef.current.style.height = "auto";
      }, 250);
      return () => clearTimeout(t);
    } else {
      const h = el.scrollHeight;
      el.style.height = h + "px";
      void el.offsetHeight;
      el.style.height = "0px";
    }
  }, [expanded]);

  return (
    <section className="rounded-xl border border-border bg-[#141414] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-primary shrink-0">{icon}</span>}
          <h2 className="text-base sm:text-lg font-semibold font-sans text-neutral-300 truncate">
            {title}
          </h2>
          {typeof count === "number" && (
            <span className="text-xs text-muted-foreground">({count})</span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        ref={contentRef}
        style={{ height: expanded ? "auto" : 0 }}
        className="overflow-hidden transition-[height] duration-200 ease-out"
      >
        <div className="p-4 pt-0">{children}</div>
      </div>
    </section>
  );
};

export default AdminSection;
