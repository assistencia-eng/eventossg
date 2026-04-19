import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabels, categoryIcons, subcategoryOptions, weekDayLabels, type EventCategory, type EventData } from "@/data/events";
import { geocodeAddress } from "@/lib/geocode";
import { Loader2, Save, MapPin, ImagePlus, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubcategoryImages } from "@/hooks/useSubcategoryImages";

interface EditEventFormProps {
  event: EventData | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const allCategories = Object.keys(categoryLabels) as EventCategory[];
const weekDays = Object.keys(weekDayLabels);

const EditEventForm = ({ event, open, onClose, onUpdated }: EditEventFormProps) => {
  const { isAdmin } = useAuth();
  const { images: subcategoryImages } = useSubcategoryImages();
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
    subcategory_image_index: null as number | null,
  });

  useEffect(() => {
    if (event) {
      setForm({
        nome: event.nome,
        categorias: event.categorias?.length ? event.categorias : [event.categoria],
        subcategorias: event.subcategorias || [],
        data: event.data,
        data_fim: event.data_fim || "",
        horario: event.horario || "",
        cidade: event.cidade,
        local: event.local === "Não informado" ? "" : event.local,
        endereco: event.endereco === "Não informado" ? "" : event.endereco,
        descricao: event.descricao === "Não informado" ? "" : event.descricao,
        atracoes: event.atracoes.join(", "),
        is_featured: event.is_featured || false,
        is_recurring: event.is_recurring || false,
        recurring_days: event.recurring_days || [],
      });
      setImagePreview(event.imagem || null);
      setImageFile(null);
    }
  }, [event]);

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
    if (!event || !form.nome.trim() || !form.data || form.categorias.length === 0 || !form.cidade.trim()) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      let imagemUrl = event.imagem || null;

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

      const { error: updateError } = await supabase.from("events").update({
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
      }).eq("id", event.id);

      if (updateError) throw updateError;

      toast.success("Evento atualizado!");
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Editar Evento</DialogTitle>
          <DialogDescription>Atualize os dados do evento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label>Categorias *</Label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`category-chip category-chip-${cat} ${form.categorias.includes(cat) ? "active" : ""}`}
                >
                  <span className="mr-1">{categoryIcons[cat]}</span>
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

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
                id="is_recurring_edit"
                checked={form.is_recurring}
                onCheckedChange={(checked) => setForm({ ...form, is_recurring: !!checked })}
              />
              <Label htmlFor="is_recurring_edit" className="cursor-pointer">Evento recorrente</Label>
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
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} maxLength={200} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} maxLength={300} />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} maxLength={1000} />
          </div>

          <div className="space-y-2">
            <Label>Atrações (separadas por vírgula)</Label>
            <Input value={form.atracoes} onChange={(e) => setForm({ ...form, atracoes: e.target.value })} maxLength={500} />
          </div>

          <div className="space-y-2">
            <Label>Imagem de capa</Label>
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

          {/* Featured checkbox - admin only */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_featured"
                checked={form.is_featured}
                onCheckedChange={(checked) => setForm({ ...form, is_featured: !!checked })}
              />
              <Label htmlFor="is_featured" className="cursor-pointer">Evento principal (destaque no outdoor)</Label>
            </div>
          )}

          <Button type="submit" disabled={saving || geocoding} className="w-full h-12 text-base">
            {geocoding ? (
              <><MapPin className="w-4 h-4 mr-2 animate-pulse" /> Localizando...</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventForm;
