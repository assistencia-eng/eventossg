import { useState } from "react";
import { EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { categoryColors, generateMutedColor, CategoryColor } from "@/data/categoryColors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tags, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp, Palette } from "lucide-react";

const allCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const CategoryManagement = () => {
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
  const [customCategories, setCustomCategories] = useState<EventCategory[]>([]);

  const displayCategories = [...allCategories, ...customCategories];

  const handleCreateCategory = () => {
    const key = newCatKey.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!key || !newCatLabel.trim()) {
      toast.error("Preencha o identificador e o nome da categoria.");
      return;
    }
    if (displayCategories.includes(key as EventCategory) || categoryLabels[key as EventCategory]) {
      toast.error("Essa categoria já existe.");
      return;
    }
    const cat = key as EventCategory;
    categoryLabels[cat] = newCatLabel.trim();
    categoryIcons[cat] = newCatIcon.trim() || "📌";
    const vibrant = /^#[0-9a-fA-F]{6}$/.test(newCatColor) ? newCatColor : "#6366f1";
    categoryColors[cat] = { vibrant, muted: generateMutedColor(vibrant) };
    subcategoryOptions[cat] = [];
    setCustomCategories((prev) => [...prev, cat]);
    toast.success(`Categoria "${newCatLabel.trim()}" criada!`);
    setNewCatKey("");
    setNewCatLabel("");
    setNewCatIcon("");
    setNewCatColor("#6366f1");
    setShowNewCatForm(false);
  };

  const handleEditCategory = (cat: EventCategory) => {
    setEditingCat(cat);
    setEditLabel(categoryLabels[cat]);
    setEditIcon(categoryIcons[cat]);
    setEditColor(categoryColors[cat].vibrant);
  };

  const handleSaveCategory = () => {
    if (!editingCat || !editLabel.trim()) return;
    categoryLabels[editingCat] = editLabel.trim();
    if (editIcon.trim()) {
      categoryIcons[editingCat] = editIcon.trim();
    }
    if (editColor.trim() && /^#[0-9a-fA-F]{6}$/.test(editColor.trim())) {
      const vibrant = editColor.trim();
      const muted = generateMutedColor(vibrant);
      categoryColors[editingCat] = { vibrant, muted };
    }
    toast.success(`Categoria "${editLabel.trim()}" atualizada!`);
    setEditingCat(null);
    setEditLabel("");
    setEditIcon("");
    setEditColor("");
  };

  const handleAddSubcategory = (cat: EventCategory) => {
    if (!newSubcategory.trim()) return;
    const sub = newSubcategory.trim();
    if (subcategoryOptions[cat]?.includes(sub)) {
      toast.error("Essa subcategoria já existe.");
      return;
    }
    if (!subcategoryOptions[cat]) {
      subcategoryOptions[cat] = [];
    }
    subcategoryOptions[cat].push(sub);
    toast.success(`Subcategoria "${sub}" adicionada!`);
    setNewSubcategory("");
  };

  const handleRemoveSubcategory = (cat: EventCategory, sub: string) => {
    const idx = subcategoryOptions[cat]?.indexOf(sub);
    if (idx !== undefined && idx >= 0) {
      subcategoryOptions[cat].splice(idx, 1);
      toast.success(`Subcategoria "${sub}" removida.`);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Tags className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold font-sans text-neutral-400">Gerenciar Categorias</h2>
      </div>

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
            <Button size="sm" className="gap-1" onClick={handleCreateCategory}>
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

      <div className="space-y-2 bg-[#1f1f1f]">
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
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditCategory(cat)}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
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
                          onClick={() => handleRemoveSubcategory(cat, sub)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
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
                      disabled={!newSubcategory.trim()}
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
    </section>
  );
};

export default CategoryManagement;
