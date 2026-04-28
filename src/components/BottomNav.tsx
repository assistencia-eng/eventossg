import { Calendar, User, Search } from "lucide-react";

interface BottomNavProps {
  active: "events" | "profile" | "search";
  onChange: (tab: "events" | "profile" | "search") => void;
}

const BottomNav = ({ active, onChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#151414] safe-area-bottom">
      <div className="flex items-center justify-around h-16 w-full mx-auto text-wine-dark bg-[#151414]">
        <button
          onClick={() => onChange("events")}
          className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
            active === "events" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs font-medium">Eventos</span>
        </button>
        <button
          onClick={() => onChange("search")}
          className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
            active === "search" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Buscar</span>
        </button>
        <button
          onClick={() => onChange("profile")}
          className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
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
