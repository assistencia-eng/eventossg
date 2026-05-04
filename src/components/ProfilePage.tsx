import { useState, useMemo } from "react";
import { EventData, EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/EventCard";
import AdminManagement from "@/components/AdminManagement";
import CategoryManagement from "@/components/CategoryManagement";
import SubcategoryImageManager from "@/components/SubcategoryImageManager";
import KeywordImageManager from "@/components/KeywordImageManager";
import AIPromptManager from "@/components/AIPromptManager";
import VenueManagement from "@/components/VenueManagement";
import CityManagement from "@/components/CityManagement";
import AdminSection from "@/components/AdminSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Check, X, Bell, Plus, Upload, Settings, Trash2, Search } from "lucide-react";
import { useCategoriesVersion, getCustomCategoryKeys, getRemovedDefaultCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";

interface ProfilePageProps {
  interests: { categories: EventCategory[]; subcategories: string[] };
  onToggleCategory: (cat: EventCategory) => void;
  onToggleSubcategory: (sub: string) => void;
  favoriteEvents: EventData[];
  onSelectEvent: (event: EventData) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onAddEvent?: () => void;
  onImportEvents?: () => void;
  onOutdoorSettings?: () => void;
  onDeleteAll?: () => void;
  onDeleteFiltered?: () => void;
  onDetectDuplicates?: () => void;
  availableCities?: string[];
  allEventsCount?: number;
}

const baseCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const ProfilePage = ({
  interests,
  onToggleCategory,
  onToggleSubcategory,
  favoriteEvents,
  onSelectEvent,
  onToggleFavorite,
  isFavorite,
  onAddEvent,
  onImportEvents,
  onOutdoorSettings,
  onDeleteAll,
  onDeleteFiltered,
  onDetectDuplicates,
  availableCities,
  allEventsCount = 0,
}: ProfilePageProps) => {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || "");
  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();

  const allCategories = useMemo<EventCategory[]>(() => {
    const removed = new Set(getRemovedDefaultCategoryKeys());
    return [
      ...baseCategories.filter((c) => !removed.has(c)),
      ...getCustomCategoryKeys().filter((c) => !baseCategories.includes(c)),
    ];
  }, [catVersion]);

  // touch subVersion to re-render when subcategoryOptions changes
  void subVersion;

  const userInitials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  const handleSaveName = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao salvar nome");
    } else {
      toast.success("Nome atualizado!");
      await refreshProfile();
    }
    setEditing(false);
  };

  const handleToggleNotificacoes = async (checked: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ receber_notificacoes: checked })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao atualizar notificações");
    } else {
      toast.success(checked ? "Notificações ativadas" : "Notificações desativadas");
      await refreshProfile();
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24 space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="text-lg bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9"
                placeholder="Seu nome"
              />
              <Button size="icon" variant="ghost" onClick={handleSaveName}>
                <Check className="w-4 h-4 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold truncate text-neutral-400 font-sans">{profile?.full_name || "Meu Perfil"}</h1>
              <button onClick={() => { setEditName(profile?.full_name || ""); setEditing(true); }}>
                <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
              </button>
            </div>
          )}
          <p className="text-sm truncate text-neutral-400">{user?.email}</p>
          {profile?.cidade && (
            <p className="text-xs text-muted-foreground">📍 {profile.cidade}</p>
          )}
          {isAdmin && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Administrador
            </span>
          )}
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-400 font-sans">Gerenciar Eventos</h2>
          <div className="flex flex-wrap gap-2">
            {onAddEvent && (
              <Button variant="outline" size="sm" onClick={onAddEvent} className="bg-[#303030] text-white border-neutral-500 hover:bg-[#303030]/90">
                <Plus className="w-4 h-4 mr-1.5" /> Novo evento
              </Button>
            )}
            {onImportEvents && (
              <Button variant="outline" size="sm" onClick={onImportEvents} className="bg-[#303030] text-white border-neutral-500 hover:bg-[#303030]/90">
                <Upload className="w-4 h-4 mr-1.5" /> Importar
              </Button>
            )}
            {onOutdoorSettings && (
              <Button variant="outline" size="sm" onClick={onOutdoorSettings} className="bg-[#303030] text-white border-neutral-500 hover:bg-[#303030]/90">
                <Settings className="w-4 h-4 mr-1.5" /> Outdoor
              </Button>
            )}
            {onDeleteFiltered && allEventsCount > 0 && (
              <Button variant="outline" size="sm" onClick={onDeleteFiltered} className="text-destructive border-destructive/30 bg-[#303030]">
                <Trash2 className="w-4 h-4 mr-1.5" /> Excluir por filtro
              </Button>
            )}
            {onDeleteAll && allEventsCount > 0 && (
              <Button variant="outline" size="sm" onClick={onDeleteAll} className="text-destructive border-destructive/30 bg-[#303030]">
                <Trash2 className="w-4 h-4 mr-1.5" /> Excluir todos
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Interests */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-400 font-sans">Meus Interesses</h2>
        <div>
          <h3 className="text-sm font-semibold text-neutral-400 font-sans uppercase tracking-wider mb-3">Categorias</h3>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => {
              const isActive = interests.categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => onToggleCategory(cat)}
                  className="px-4 py-2 rounded-[22px] text-sm font-medium transition-all duration-200 cursor-pointer select-none inline-flex items-center gap-1.5"
                  style={{
                    backgroundColor: isActive ? categoryColors[cat].vibrant : categoryColors[cat].muted,
                    color: isActive ? "#fff" : categoryColors[cat].vibrant,
                    border: `1px solid ${isActive ? categoryColors[cat].vibrant : "transparent"}`,
                  }}
                >
                  <span>{categoryIcons[cat]}</span>
                  {categoryLabels[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {interests.categories.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Subcategorias</h3>
            <div className="space-y-3">
              {interests.categories.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    {categoryIcons[cat]} {categoryLabels[cat]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {subcategoryOptions[cat]?.map((sub) => {
                      const isActive = interests.subcategories.includes(sub);
                      return (
                        <button
                          key={sub}
                          onClick={() => onToggleSubcategory(sub)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-[#1c1c1c] text-neutral-300 border-border hover:border-primary/30"
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Notifications */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-400 font-sans flex items-center gap-2">
          <Bell className="w-5 h-5" /> Notificações
        </h2>
        <div className="flex items-center justify-between p-4 rounded-lg border-border bg-[#1c1c1c] border-0">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle" className="text-sm font-medium cursor-pointer text-neutral-300">
              Receber notificações push
            </Label>
            <p className="text-xs text-muted-foreground">
              Eventos dos meus interesses, da minha cidade e dos meus favoritos
            </p>
          </div>
          <Switch
            id="push-toggle"
            checked={profile?.receber_notificacoes ?? true}
            onCheckedChange={handleToggleNotificacoes}
          />
        </div>
      </section>

      {/* Favorites */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-400 font-sans">
          Favoritos ({favoriteEvents.length})
        </h2>
        {favoriteEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum evento favoritado ainda. Toque na ⭐ nos eventos para adicioná-los aqui.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteEvents.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={onSelectEvent}
                index={i}
                isFavorite={isFavorite(event.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>

      {/* Admin sections */}
      {isAdmin && <CityManagement />}
      {isAdmin && <VenueManagement />}
      {isAdmin && <AIPromptManager />}
      {isAdmin && <KeywordImageManager />}
      {isAdmin && <SubcategoryImageManager />}
      {isAdmin && <CategoryManagement />}
      {isAdmin && <AdminManagement />}
    </div>
  );
};

export default ProfilePage;
