import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabels, categoryIcons, subcategoryOptions, weekDayLabels, type EventCategory } from "@/data/events";
import { categoryColors, generateMutedColor } from "@/data/categoryColors";
import { geocodeAddress } from "@/lib/geocode";
import { Loader2, Plus, ImagePlus, MapPin } from "lucide-react";
import { useCategoriesVersion, getCustomCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import { useKeywordImages } from "@/hooks/useKeywordImages";
import KeywordsInput from "@/components/KeywordsInput";
import { getOrCreateVenue } from "@/hooks/useVenues";
import { useMemo } from "react";

interface AddEventFormProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const baseCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];
const weekDays = Object.keys(weekDayLabels);

const AddEventForm = ({ open, onClose, onAdded }: AddEventFormProps) => {
  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  const { images: keywordImages } = useKeywordImages();
  const availableKeywords = useMemo(() => Object.keys(keywordImages).sort(), [keywordImages]);
  const allCategories = useMemo<EventCategory[]>(
    () => [...baseCategories, ...getCustomCategoryKeys().filter((c) => !baseCategories.includes(c))],
    [catVersion]
  );
  void subVersion;
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    categorias: [] as EventCategory[],
    subcategorias: [] as string[],
    data: "",
    data_fim: "",
    horario: "",
    cidade: "",
    local: "",
    endereco: "",
    descricao: "",
    atracoes: "",
    is_featured: false,
    is_recurring: false,
    recurring_days: [] as string[],
    keywords: [] as string[],
  });

  const resetForm = () => {
    setForm({ nome: "", categorias: [], subcategorias: [], data: "", data_fim: "", horario: "", cidade: "", local: "", endereco: "", descricao: "", atracoes: "", is_featured: false, is_recurring: false, recurring_days: [], keywords: [] });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const toggleCategory = (cat: EventCategory) => {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((c) => c !== cat)
        : [...prev.categorias, cat],
    }));
  };

  const toggleSubcategory = (sub: string) => {
    setForm((prev) => ({
      ...prev,
      subcategorias: prev.subcategorias.includes(sub)
        ? prev.subcategorias.filter((s) => s !== sub)
        : [...prev.subcategorias, sub],
    }));
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      recurring_days: prev.recurring_days.includes(day)
        ? prev.recurring_days.filter((d) => d !== day)
        : [...prev.recurring_days, day],
    }));
  };

  const availableSubcategories = form.categorias.flatMap((cat) => subcategoryOptions[cat] || []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB."); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.data || form.categorias.length === 0 || !form.cidade.trim()) {
      toast.error("Preencha: título, data, categoria e cidade.");
      return;
    }

    setSaving(true);
    try {
      let imagemUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("event-images").upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(fileName);
        imagemUrl = urlData.publicUrl;
      }

      setGeocoding(true);
      const geo = await geocodeAddress(form.endereco.trim() || "Não informado", form.cidade.trim());
      setGeocoding(false);

      const { error: insertError } = await supabase.from("events").insert({
        nome: form.nome.trim(),
        categoria: form.categorias[0],
        categorias: form.categorias,
        subcategorias: form.subcategorias,
        data: form.data,
        data_fim: form.data_fim || null,
        horario: form.horario || null,
        cidade: form.cidade.trim(),
        local: form.local.trim() || "Não informado",
        endereco: form.endereco.trim() || "Não informado",
        descricao: form.descricao.trim() || "Não informado",
        atracoes: form.atracoes ? form.atracoes.split(",").map((s) => s.trim()).filter(Boolean) : [],
        latitude: geo.latitude,
        longitude: geo.longitude,
        imagem: imagemUrl,
        is_featured: form.is_featured,
        is_recurring: form.is_recurring,
        recurring_days: form.recurring_days,
        keywords: form.keywords,
      });

      if (insertError) throw insertError;

      toast.success("Evento adicionado!");
      onAdded();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Adicionar Evento</DialogTitle>
          <DialogDescription>Preencha os dados para criar um novo evento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do evento" required maxLength={200} />
          </div>

          {/* Categories multi-select */}
          <div className="space-y-2">
            <Label>Categorias *</Label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => {
                const isActive = form.categorias.includes(cat);
                const colors = categoryColors[cat] || { vibrant: "#6366f1", muted: generateMutedColor("#6366f1") };
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5"
                    style={{
                      backgroundColor: isActive ? colors.vibrant : colors.muted,
                      color: isActive ? "#fff" : colors.vibrant,
                      border: `1px solid ${isActive ? colors.vibrant : "transparent"}`,
                    }}
                  >
                    <span>{categoryIcons[cat]}</span>
                    {categoryLabels[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategories */}
          {availableSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Subcategorias</Label>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(availableSubcategories)].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubcategory(sub)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                      form.subcategorias.includes(sub)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data inicial *</Label>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Data final</Label>
              <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Horário de início</Label>
            <Input type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
          </div>

          {/* Recurring event */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_recurring_add"
                checked={form.is_recurring}
                onCheckedChange={(checked) => setForm({ ...form, is_recurring: !!checked })}
              />
              <Label htmlFor="is_recurring_add" className="cursor-pointer">Evento recorrente</Label>
            </div>
            {form.is_recurring && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {weekDays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      form.recurring_days.includes(day)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {weekDayLabels[day]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} placeholder="Ex: Gramado" required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Ex: Palácio dos Festivais" maxLength={200} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Ex: Av. Borges de Medeiros, 2500" maxLength={300} />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do evento" rows={3} maxLength={1000} />
          </div>

          <div className="space-y-2">
            <Label>Atrações (separadas por vírgula)</Label>
            <Input value={form.atracoes} onChange={(e) => setForm({ ...form, atracoes: e.target.value })} placeholder="Ex: Show ao vivo, Degustação" maxLength={500} />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Palavras-chave</Label>
            <p className="text-xs text-muted-foreground">
              Digite para buscar tags da biblioteca (máx. 5). A imagem da palavra-chave tem prioridade sobre a subcategoria.
            </p>
            {availableKeywords.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma palavra-chave cadastrada. Crie em "Meu Perfil → Biblioteca de Palavras".</p>
            ) : (
              <KeywordsInput
                value={form.keywords}
                onChange={(next) => setForm({ ...form, keywords: next })}
                available={availableKeywords}
                max={5}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Imagem de capa (opcional)</Label>
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImagePlus className="w-8 h-8 mx-auto mb-1" />
                  <span className="text-sm">Selecionar imagem</span>
                </div>
              )}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_featured_add"
              checked={form.is_featured}
              onCheckedChange={(checked) => setForm({ ...form, is_featured: !!checked })}
            />
            <Label htmlFor="is_featured_add" className="cursor-pointer">Evento principal (destaque no outdoor)</Label>
          </div>

          <Button type="submit" disabled={saving || geocoding} className="w-full">
            {geocoding ? (
              <><MapPin className="w-4 h-4 mr-2 animate-pulse" /> Localizando endereço...</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Adicionar Evento</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEventForm;
