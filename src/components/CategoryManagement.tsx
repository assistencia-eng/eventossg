import { useState } from "react";
import { EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { categoryColors, generateMutedColor } from "@/data/categoryColors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { refreshSubcategories, useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import {
  refreshCategories,
  useCategoriesVersion,
  getCustomCategoryKeys,
  getRemovedDefaultCategoryKeys,
} from "@/hooks/useCategoriesSync";
import { Tags, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp, Palette } from "lucide-react";

const allCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

// Snapshot of the original built-in subcategories. Used to decide whether a removal
// must be persisted as a "removed default" entry in the database.
const defaultSubcategoriesSnapshot: Record<string, string[]> = {
  musica: ["rock", "sertanejo", "pagode", "eletrônica", "funk", "hip-hop", "reggae", "jazz", "tradicionalista", "gaúcha", "MPB"],
  esporte: ["futebol", "corrida", "vôlei", "basquete", "padel", "tênis", "beach tennis", "futevôlei", "arte marcial", "natação", "fitness", "academia"],
  alimentacao: ["bebidas", "vinho", "fast food", "churrasco", "vegano", "sushi", "doces", "naturais"],
  entretenimento: ["teatro", "musical", "drama", "comédia", "apresentação cultural", "premiações", "encontros"],
  palestras: ["empreendedorismo", "tecnologia", "saúde", "gestão", "cultural", "esporte"],
  feiras: ["empreendedorismo", "tecnologia", "automação", "alimentação"],
  festas: ["ar livre", "festa de comunidade", "festa temática", "balada"],
};

import AdminSection from "@/components/AdminSection";

const CategoryManagement = () => {
  const [sectionOpen, setSectionOpen] = useState(false);
  useSubcategoriesVersion(); // re-render when subcategories sync
  useCategoriesVersion(); // re-render when categories sync
  const [expandedCat, setExpandedCat] = useState<EventCategory | null>(null);
  const [editingCat, setEditingCat] = useState<EventCategory | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatKey, setNewCatKey] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");
  const [savingSub, setSavingSub] = useState(false);
  const [savingCat, setSavingCat] = useState(false);

  const customCategories = getCustomCategoryKeys();
  const removedDefaults = new Set(getRemovedDefaultCategoryKeys());
  const displayCategories = [
    ...allCategories.filter((c) => !removedDefaults.has(c)),
    ...customCategories,
  ];
  const isCustomCategory = (cat: EventCategory) => customCategories.includes(cat);

  /**
   * Excluir qualquer categoria (default ou custom).
   * - Verifica se há eventos vinculados; se sim, exige confirmação extra.
   * - Default: insere em `removed_default_categories` para esconder.
   * - Custom: deleta de `custom_categories` + suas subcategorias.
   */
  const handleDeleteCategory = async (cat: EventCategory) => {
    // Quantos eventos referenciam essa categoria?
    const { count: linkedCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .or(`categoria.eq.${cat},categorias.cs.{${cat}}`);

    const linked = linkedCount || 0;
    const baseMsg = `Excluir a categoria "${categoryLabels[cat]}"?`;
    const linkMsg = linked > 0
      ? `\n\n⚠️ Existem ${linked} evento(s) vinculados a esta categoria. Eles continuarão existindo, mas perderão a associação com ela. Deseja continuar?`
      : "\n\nAs subcategorias dela também serão removidas.";
    if (!confirm(baseMsg + linkMsg)) return;

    if (isCustomCategory(cat)) {
      const { error } = await supabase.from("custom_categories").delete().eq("key", cat);
      if (error) {
        toast.error("Erro ao excluir: " + error.message);
        return;
      }
      await supabase.from("custom_subcategories").delete().eq("categoria", cat);
    } else {
      // Default: marca como removida (soft hide)
      const { error } = await supabase
        .from("removed_default_categories")
        .insert({ categoria: cat });
      if (error && error.code !== "23505") {
        toast.error("Erro ao excluir: " + error.message);
        return;
      }
    }
    await refreshCategories();
    await refreshSubcategories();
    toast.success("Categoria excluída.");
  };

  const handleCreateCategory = async () => {
    const key = newCatKey.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!key || !newCatLabel.trim()) {
      toast.error("Preencha o identificador e o nome da categoria.");
      return;
    }
    if (displayCategories.includes(key as EventCategory) || categoryLabels[key as EventCategory]) {
      toast.error("Essa categoria já existe.");
      return;
    }
    const vibrant = /^#[0-9a-fA-F]{6}$/.test(newCatColor) ? newCatColor : "#6366f1";
    setSavingCat(true);
    const { error } = await supabase.from("custom_categories").insert({
      key,
      label: newCatLabel.trim(),
      icon: newCatIcon.trim() || "📌",
      color_vibrant: vibrant,
    });
    if (error) {
      setSavingCat(false);
      toast.error("Erro ao salvar categoria: " + error.message);
      return;
    }
    await refreshCategories();
    setSavingCat(false);
    toast.success(`Categoria "${newCatLabel.trim()}" criada!`);
    setNewCatKey("");
    setNewCatLabel("");
    setNewCatIcon("");
    setNewCatColor("#6366f1");
    setShowNewCatForm(false);
  };

  const handleDeleteCustomCategory = handleDeleteCategory; // backward-compat alias

  const handleEditCategory = (cat: EventCategory) => {
    setEditingCat(cat);
    setEditLabel(categoryLabels[cat]);
    setEditIcon(categoryIcons[cat]);
    setEditColor(categoryColors[cat].vibrant);
  };

  const handleSaveCategory = async () => {
    if (!editingCat || !editLabel.trim()) return;
    const vibrant =
      editColor.trim() && /^#[0-9a-fA-F]{6}$/.test(editColor.trim())
        ? editColor.trim()
        : categoryColors[editingCat].vibrant;
    const payload = {
      key: editingCat,
      label: editLabel.trim(),
      icon: editIcon.trim() || categoryIcons[editingCat],
      color_vibrant: vibrant,
    };
    let error;
    if (isCustomCategory(editingCat)) {
      ({ error } = await supabase
        .from("custom_categories")
        .update({ label: payload.label, icon: payload.icon, color_vibrant: payload.color_vibrant })
        .eq("key", editingCat));
    } else {
      ({ error } = await supabase
        .from("category_overrides")
        .upsert(payload, { onConflict: "key" }));
    }
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    await refreshCategories();
    toast.success(`Categoria "${editLabel.trim()}" atualizada!`);
    setEditingCat(null);
    setEditLabel("");
    setEditIcon("");
    setEditColor("");
  };

  const handleAddSubcategory = async (cat: EventCategory) => {
    if (!newSubcategory.trim()) return;
    const sub = newSubcategory.trim();
    if (subcategoryOptions[cat]?.includes(sub)) {
      toast.error("Essa subcategoria já existe.");
      return;
    }
    setSavingSub(true);
    // If this exact sub was previously removed (default), drop the removal record so it comes back.
    const wasDefault = (defaultSubcategoriesSnapshot[cat] || []).includes(sub);
    if (wasDefault) {
      await supabase
        .from("removed_default_subcategories")
        .delete()
        .eq("categoria", cat)
        .eq("subcategoria", sub);
    } else {
      const { error } = await supabase
        .from("custom_subcategories")
        .insert({ categoria: cat, subcategoria: sub });
      if (error) {
        setSavingSub(false);
        toast.error("Erro ao salvar subcategoria: " + error.message);
        return;
      }
    }
    await refreshSubcategories();
    toast.success(`Subcategoria "${sub}" adicionada!`);
    setNewSubcategory("");
    setSavingSub(false);
  };

  const handleRenameSubcategory = async (cat: EventCategory, oldSub: string) => {
    const input = prompt(`Renomear subcategoria "${oldSub}":`, oldSub);
    if (!input) return;
    const newSub = input.trim();
    if (!newSub || newSub === oldSub) return;
    if ((subcategoryOptions[cat] || []).includes(newSub)) {
      toast.error("Já existe uma subcategoria com esse nome.");
      return;
    }
    const { error } = await (supabase as any).rpc("rename_subcategory", {
      p_categoria: cat,
      p_old: oldSub,
      p_new: newSub,
    });
    if (error) {
      toast.error("Erro ao renomear: " + error.message);
      return;
    }
    await refreshSubcategories();
    toast.success(`Renomeada para "${newSub}". Eventos atualizados.`);
  };

  const handleRemoveSubcategory = async (cat: EventCategory, sub: string) => {
    const wasDefault = (defaultSubcategoriesSnapshot[cat] || []).includes(sub);
    if (wasDefault) {
      const { error } = await supabase
        .from("removed_default_subcategories")
        .insert({ categoria: cat, subcategoria: sub });
      if (error) {
        toast.error("Erro ao remover: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("custom_subcategories")
        .delete()
        .eq("categoria", cat)
        .eq("subcategoria", sub);
      if (error) {
        toast.error("Erro ao remover: " + error.message);
        return;
      }
    }
    await refreshSubcategories();
    toast.success(`Subcategoria "${sub}" removida.`);
  };

  return (
    <AdminSection
      title="Gerenciar Categorias"
      icon={<Tags className="w-5 h-5" />}
      expanded={sectionOpen}
      onToggle={() => setSectionOpen((v) => !v)}
      count={displayCategories.length}
    >
      <div className="space-y-4">
        {/* Create new category */}
        {!showNewCatForm ? (
        <Button
          variant="outline"
          className="w-full gap-2 border-[#7d7d7d]"
          onClick={() => setShowNewCatForm(true)}
        >
          <Plus className="w-4 h-4" />
          Criar nova categoria
        </Button>
      ) : (
        <div className="rounded-xl border border-border p-4 space-y-3 bg-secondary/30">
          <h3 className="text-sm font-semibold text-neutral-300">Nova categoria</h3>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Identificador (ex: teatro)"
              value={newCatKey}
              onChange={(e) => setNewCatKey(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Nome (ex: Teatro)"
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ícone (emoji)"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="h-8 text-sm w-20"
            />
            <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="h-8 w-12 p-0.5 cursor-pointer"
            />
            <Input
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="h-8 text-sm flex-1"
              placeholder="#hex"
            />
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Preview:</span>
            <span
              className="px-3 py-1.5 rounded-[22px] text-sm font-medium inline-flex items-center gap-1.5"
              style={{
                backgroundColor: /^#[0-9a-fA-F]{6}$/.test(newCatColor) ? generateMutedColor(newCatColor) : "#2a2a2a",
                color: /^#[0-9a-fA-F]{6}$/.test(newCatColor) ? newCatColor : "#999",
              }}
            >
              <span>{newCatIcon || "📌"}</span>
              {newCatLabel || "Nova categoria"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1" onClick={handleCreateCategory} disabled={savingCat}>
              <Check className="w-3.5 h-3.5" />
              Criar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNewCatForm(false)}>
              <X className="w-3.5 h-3.5" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 bg-[#1a1a1a]">
        {displayCategories.map((cat) => {
          const isExpanded = expandedCat === cat;
          const isEditing = editingCat === cat;
          const colors = categoryColors[cat];

          return (
            <div key={cat} className="rounded-xl border border-border overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between p-3 bg-secondary/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{categoryIcons[cat]}</span>
                  {isEditing ? (
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Nome"
                        />
                        <Input
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className="h-8 text-sm w-16"
                          placeholder="Ícone"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="h-8 w-12 p-0.5 cursor-pointer"
                        />
                        <Input
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="h-8 text-sm flex-1"
                          placeholder="#hex"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveCategory}>
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCat(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {/* Preview chip */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Preview:</span>
                        <span
                          className="px-3 py-1.5 rounded-[22px] text-sm font-medium inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: /^#[0-9a-fA-F]{6}$/.test(editColor) ? generateMutedColor(editColor) : colors.muted,
                            color: /^#[0-9a-fA-F]{6}$/.test(editColor) ? editColor : colors.vibrant,
                          }}
                        >
                          <span>{editIcon || categoryIcons[cat]}</span>
                          {editLabel || categoryLabels[cat]}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{categoryLabels[cat]}</span>
                      <span
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: colors.vibrant }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!isEditing && (
                    <Button size="icon" className="h-8 w-8 bg-black text-white hover:bg-black/90" onClick={() => handleEditCategory(cat)}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {!isEditing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(cat)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setExpandedCat(isExpanded ? null : cat)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Subcategories */}
              {isExpanded && (
                <div className="p-3 space-y-3 bg-background">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subcategorias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(subcategoryOptions[cat] || []).map((sub) => (
                      <div
                        key={sub}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-sm border border-border"
                      >
                        <span>{sub}</span>
                        <button
                          onClick={() => handleRenameSubcategory(cat, sub)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Renomear"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveSubcategory(cat, sub)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!subcategoryOptions[cat] || subcategoryOptions[cat].length === 0) && (
                      <p className="text-xs text-muted-foreground">Nenhuma subcategoria.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova subcategoria"
                      value={newSubcategory}
                      onChange={(e) => setNewSubcategory(e.target.value)}
                      className="h-8 text-sm flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddSubcategory(cat);
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => handleAddSubcategory(cat)}
                      disabled={!newSubcategory.trim() || savingSub}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </AdminSection>
  );
};

export default CategoryManagement;
