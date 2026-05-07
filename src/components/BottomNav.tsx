import { Calendar, User, Compass, Plus } from "lucide-react";

interface BottomNavProps {
  active: "events" | "profile" | "explore";
  onChange: (tab: "events" | "profile" | "explore") => void;
  onCreate?: () => void;
}

const BottomNav = ({ active, onChange, onCreate }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#151414] safe-area-bottom border-t border-white/5">
      <div className="flex items-center justify-around h-16 w-full mx-auto">
        <button
          onClick={() => onChange("events")}
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
            active === "events" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs font-medium">Eventos</span>
        </button>
        <button
          onClick={() => onChange("explore")}
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
            active === "explore" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-xs font-medium">Explorar</span>
        </button>
        <button
          onClick={() => onCreate?.()}
          aria-label="Criar evento"
          className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-medium">Criar</span>
        </button>
        <button
          onClick={() => onChange("profile")}
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
            active === "profile" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Meu Perfil</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
