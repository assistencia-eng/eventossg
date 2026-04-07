import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabels, categoryIcons, type EventCategory } from "@/data/events";
import { geocodeAddress } from "@/lib/geocode";
import { Loader2, Plus, ImagePlus, MapPin } from "lucide-react";

interface AddEventFormProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const categories = Object.keys(categoryLabels) as EventCategory[];

const AddEventForm = ({ open, onClose, onAdded }: AddEventFormProps) => {
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    categoria: "musica" as EventCategory,
    data: "",
    cidade: "",
    local: "",
    endereco: "",
    descricao: "",
    atracoes: "",
  });

  const resetForm = () => {
    setForm({ nome: "", categoria: "musica", data: "", cidade: "", local: "", endereco: "", descricao: "", atracoes: "" });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.data || !form.categoria || !form.cidade.trim()) {
      toast.error("Preencha os campos obrigatórios: título, data, categoria e cidade.");
      return;
    }

    setSaving(true);
    try {
      let imagemUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(fileName);
        imagemUrl = urlData.publicUrl;
      }

      // Geocode the address
      setGeocoding(true);
      const geo = await geocodeAddress(
        form.endereco.trim() || "Não informado",
        form.cidade.trim()
      );
      setGeocoding(false);

      const { error: insertError } = await supabase.from("events").insert({
        nome: form.nome.trim(),
        categoria: form.categoria,
        data: form.data,
        cidade: form.cidade.trim(),
        local: form.local.trim() || "Não informado",
        endereco: form.endereco.trim() || "Não informado",
        descricao: form.descricao.trim() || "Não informado",
        atracoes: form.atracoes ? form.atracoes.split(",").map((s) => s.trim()).filter(Boolean) : [],
        latitude: geo.latitude,
        longitude: geo.longitude,
        imagem: imagemUrl,
      });

      if (insertError) throw insertError;

      toast.success("Evento adicionado com sucesso!");
      onAdded();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar o evento. Tente novamente.");
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
            <Label htmlFor="nome">Título do evento *</Label>
            <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do evento" required maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as EventCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoryIcons[cat]} {categoryLabels[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input id="cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} placeholder="Ex: Gramado" required maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input id="local" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Ex: Palácio dos Festivais" maxLength={200} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Ex: Av. Borges de Medeiros, 2500" maxLength={300} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do evento" rows={3} maxLength={1000} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="atracoes">Atrações (separadas por vírgula)</Label>
            <Input id="atracoes" value={form.atracoes} onChange={(e) => setForm({ ...form, atracoes: e.target.value })} placeholder="Ex: Show ao vivo, Degustação, Workshop" maxLength={500} />
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Imagem de capa (opcional)</Label>
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImagePlus className="w-8 h-8 mx-auto mb-1" />
                  <span className="text-sm">Clique para selecionar uma imagem</span>
                </div>
              )}
            </label>
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
