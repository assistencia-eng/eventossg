import { useState } from "react";
import { EventCategory, categoryLabels, categoryIcons, subcategoryOptions } from "@/data/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tags, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from "lucide-react";

const allCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const CategoryManagement = () => {
  const [expandedCat, setExpandedCat] = useState<EventCategory | null>(null);
  const [editingCat, setEditingCat] = useState<EventCategory | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");

  const handleEditCategory = (cat: EventCategory) => {
    setEditingCat(cat);
    setEditLabel(categoryLabels[cat]);
  };

  const handleSaveCategory = () => {
    if (!editingCat || !editLabel.trim()) return;
    categoryLabels[editingCat] = editLabel.trim();
    toast.success(`Categoria "${editLabel.trim()}" atualizada!`);
    setEditingCat(null);
    setEditLabel("");
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
        <h2 className="text-lg font-serif font-semibold">Gerenciar Categorias</h2>
      </div>

      <div className="space-y-2">
        {allCategories.map((cat) => {
          const isExpanded = expandedCat === cat;
          const isEditing = editingCat === cat;

          return (
            <div key={cat} className="rounded-xl border border-border overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between p-3 bg-secondary/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{categoryIcons[cat]}</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveCategory}>
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCat(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium">{categoryLabels[cat]}</span>
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
