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
import { categoryColors, generateMutedColor } from "@/data/categoryColors";
import { geocodeAddress } from "@/lib/geocode";
import { Loader2, Save, MapPin, ImagePlus, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubcategoryImages, subImgKey } from "@/hooks/useSubcategoryImages";
import { useCategoriesVersion, getCustomCategoryKeys, getRemovedDefaultCategoryKeys } from "@/hooks/useCategoriesSync";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import { useKeywordImages } from "@/hooks/useKeywordImages";
import KeywordsInput from "@/components/KeywordsInput";
import ImagePositioner from "@/components/ImagePositioner";
import ContactsEditor from "@/components/ContactsEditor";
import type { VenueContact } from "@/types/contact";
import { getOrCreateVenue } from "@/hooks/useVenues";
import { syncContactsToVenue } from "@/lib/syncVenueContacts";
import { useMemo } from "react";

interface EditEventFormProps {
  event: EventData | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const baseCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];
const weekDays = Object.keys(weekDayLabels);

const EditEventForm = ({ event, open, onClose, onUpdated }: EditEventFormProps) => {
  const catVersion = useCategoriesVersion();
  const subVersion = useSubcategoriesVersion();
  const allCategories = useMemo<EventCategory[]>(
    () => {
      const removed = new Set(getRemovedDefaultCategoryKeys());
      return [
        ...baseCategories.filter((c) => !removed.has(c)),
        ...getCustomCategoryKeys().filter((c) => !baseCategories.includes(c)),
      ];
    },
    [catVersion]
  );
  void subVersion;
  const { isAdmin } = useAuth();
  const { images: subcategoryImages } = useSubcategoryImages();
  const { images: keywordImages } = useKeywordImages();
  const availableKeywords = useMemo(() => Object.keys(keywordImages).sort(), [keywordImages]);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
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
    keywords: [] as string[],
    image_source: "auto" as "auto" | "subcategory" | "keyword",
    image_keyword: null as string | null,
    keyword_image_index: null as number | null,
    custom_contacts: [] as VenueContact[],
    outdoor_image_position_x: 50,
    outdoor_image_position_y: 50,
    outdoor_image_zoom: 1,
  });
  const [venueContactsPreview, setVenueContactsPreview] = useState<VenueContact[]>([]);
  const [syncContactsToVenueFlag, setSyncContactsToVenueFlag] = useState(true);

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
        subcategory_image_index: event.subcategory_image_index ?? null,
        keywords: event.keywords || [],
        image_source: (event.image_source as any) || "auto",
        image_keyword: event.image_keyword ?? null,
        keyword_image_index: event.keyword_image_index ?? null,
        custom_contacts: Array.isArray(event.custom_contacts) ? event.custom_contacts : [],
        outdoor_image_position_x: event.outdoor_image_position_x ?? 50,
        outdoor_image_position_y: event.outdoor_image_position_y ?? 50,
        outdoor_image_zoom: event.outdoor_image_zoom ?? 1,
      });
      setImagePreview(event.imagem || null);
      setImageFile(null);
      // Pré-visualiza contatos do venue (somente leitura, se evento não tem custom)
      (async () => {
        if (event.venue_id && (!event.custom_contacts || event.custom_contacts.length === 0)) {
          const { data } = await supabase
            .from("venue_contacts")
            .select("id, nome, whatsapp, instagram, facebook")
            .eq("venue_id", event.venue_id);
          setVenueContactsPreview((data || []) as VenueContact[]);
        } else {
          setVenueContactsPreview([]);
        }
      })();
    }
  }, [event]);

  const toggleKeyword = (kw: string) => {
    setForm((prev) => ({
      ...prev,
      keywords: prev.keywords.includes(kw)
        ? prev.keywords.filter((k) => k !== kw)
        : [...prev.keywords, kw],
    }));
  };

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

      // Resolve venue: se o nome do local mudou ou ainda não há venue_id, busca/cria
      let venueId = event.venue_id ?? null;
      const localName = form.local.trim();
      if (localName && (event.local !== localName || !venueId)) {
        venueId = await getOrCreateVenue(localName, form.cidade.trim());
      } else if (!localName) {
        venueId = null;
      }

      // Sanitiza custom_contacts (mantém apenas com algum dado)
      const sanitizedContacts = form.custom_contacts
        .map((c) => ({
          nome: c.nome?.trim() || null,
          whatsapp: c.whatsapp?.trim() || null,
          instagram: c.instagram?.trim() || null,
          facebook: c.facebook?.trim() || null,
        }))
        .filter((c) => c.nome || c.whatsapp || c.instagram || c.facebook);

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
        subcategory_image_index: imageFile || event.imagem ? null : form.subcategory_image_index,
        keywords: form.keywords,
        image_source: (imageFile || event.imagem) ? "auto" : form.image_source,
        image_keyword: form.image_source === "keyword" ? form.image_keyword : null,
        keyword_image_index: form.image_source === "keyword" ? form.keyword_image_index : null,
        venue_id: venueId,
        custom_contacts: sanitizedContacts,
        outdoor_image_position_x: form.outdoor_image_position_x,
        outdoor_image_position_y: form.outdoor_image_position_y,
        outdoor_image_zoom: form.outdoor_image_zoom,
      } as any).eq("id", event.id);

      if (updateError) throw updateError;

      // Sincroniza contatos personalizados do evento com o venue (sem sobrescrever)
      if (venueId && sanitizedContacts.length > 0 && syncContactsToVenueFlag) {
        const { inserted, merged } = await syncContactsToVenue(venueId, sanitizedContacts);
        if (inserted > 0 || merged > 0) {
          toast.success(
            `Evento atualizado! ${inserted} contato(s) novo(s) e ${merged} mesclado(s) no local.`
          );
        } else {
          toast.success("Evento atualizado!");
        }
      } else {
        toast.success("Evento atualizado!");
      }
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

          {/* Keywords (tags) — only existing library keywords */}
          <div className="space-y-2">
            <Label>Palavras-chave</Label>
            <p className="text-xs text-muted-foreground">
              Digite para buscar tags da biblioteca (máx. 5). Eventos com palavra-chave usam a imagem da palavra (prioridade sobre subcategoria).
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
            {imagePreview && (
              <div className="mt-3 p-3 rounded-xl border border-border bg-card/50">
                <Label className="text-xs font-semibold mb-2 block">Reposicionar imagem (outdoor)</Label>
                <ImagePositioner
                  imageSrc={imagePreview}
                  value={{ x: form.outdoor_image_position_x, y: form.outdoor_image_position_y, zoom: form.outdoor_image_zoom }}
                  onChange={(v) => setForm({ ...form, outdoor_image_position_x: v.x, outdoor_image_position_y: v.y, outdoor_image_zoom: v.zoom })}
                />
              </div>
            )}
          </div>

          {/* Image source selector - shown when no custom image is uploaded */}
          {!imagePreview && !imageFile && (() => {
            // Find a (categoria, subcategoria) pair with uploaded images
            let subWithImages: string | undefined;
            let catForSub: EventCategory | undefined;
            let subImgs: string[] = [];
            for (const sub of form.subcategorias) {
              for (const cat of form.categorias) {
                const imgs = subcategoryImages[subImgKey(cat, sub)] || [];
                if (imgs.length > 0) {
                  subWithImages = sub;
                  catForSub = cat;
                  subImgs = imgs;
                  break;
                }
              }
              if (subWithImages) break;
            }

            // Available keywords on this event that actually have images
            const eventKeywordsWithImgs = (form.keywords || []).filter((kw) => {
              const k = kw.toLowerCase().trim();
              return keywordImages[k] && keywordImages[k].length > 0;
            });

            const hasSub = !!subWithImages && subImgs.length > 0;
            const hasKw = eventKeywordsWithImgs.length > 0;
            if (!hasSub && !hasKw) return null;

            const currentKeyword = form.image_keyword && eventKeywordsWithImgs.includes(form.image_keyword)
              ? form.image_keyword
              : eventKeywordsWithImgs[0];
            const currentKwImgs = currentKeyword
              ? (keywordImages[currentKeyword.toLowerCase().trim()] || [])
              : [];

            return (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-secondary/20">
                <div>
                  <Label>Imagem do card</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escolha de qual fonte virá a imagem exibida no card deste evento.
                  </p>
                </div>

                {/* Source tabs */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_source: "auto", subcategory_image_index: null, image_keyword: null, keyword_image_index: null })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      form.image_source === "auto"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    Automático
                  </button>
                  {hasSub && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_source: "subcategory", image_keyword: null, keyword_image_index: null })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        form.image_source === "subcategory"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      Subcategoria
                    </button>
                  )}
                  {hasKw && (
                    <button
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        image_source: "keyword",
                        subcategory_image_index: null,
                        image_keyword: form.image_keyword || eventKeywordsWithImgs[0],
                      })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        form.image_source === "keyword"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      Palavra-chave
                    </button>
                  )}
                </div>

                {/* Subcategory image picker */}
                {form.image_source === "subcategory" && hasSub && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      ({categoryLabels[catForSub!]} → {subWithImages}) — escolha qual imagem usar ou deixe em "Auto" para variação.
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, subcategory_image_index: null })}
                        className={`aspect-[4/3] rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-all ${
                          form.subcategory_image_index === null
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        Auto
                      </button>
                      {[1, 2, 3].map((slot) => {
                        const url = subImgs[slot - 1];
                        if (!url) {
                          return (
                            <div key={slot} className="aspect-[4/3] rounded-lg border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center text-[10px] text-muted-foreground">
                              Slot {slot}
                            </div>
                          );
                        }
                        const isSelected = form.subcategory_image_index === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setForm({ ...form, subcategory_image_index: slot })}
                            className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                              isSelected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <img src={url} alt={`Imagem ${slot}`} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                <Check className="w-5 h-5 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Keyword image picker */}
                {form.image_source === "keyword" && hasKw && (
                  <div className="space-y-2">
                    {eventKeywordsWithImgs.length > 1 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Escolha a palavra-chave:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {eventKeywordsWithImgs.map((kw) => (
                            <button
                              key={kw}
                              type="button"
                              onClick={() => setForm({ ...form, image_keyword: kw, keyword_image_index: null })}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                currentKeyword === kw
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                              }`}
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Imagens da palavra-chave <strong>{currentKeyword}</strong>:
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, keyword_image_index: null })}
                        className={`aspect-[4/3] rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-all ${
                          form.keyword_image_index === null
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        Auto
                      </button>
                      {[1, 2, 3].map((slot) => {
                        const url = currentKwImgs[slot - 1];
                        if (!url) {
                          return (
                            <div key={slot} className="aspect-[4/3] rounded-lg border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center text-[10px] text-muted-foreground">
                              Slot {slot}
                            </div>
                          );
                        }
                        const isSelected = form.keyword_image_index === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setForm({ ...form, keyword_image_index: slot })}
                            className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                              isSelected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <img src={url} alt={`${currentKeyword} ${slot}`} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                <Check className="w-5 h-5 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Contatos do evento */}
          <div className="space-y-2 p-3 rounded-lg border border-border bg-secondary/20">
            {venueContactsPreview.length > 0 && form.custom_contacts.length === 0 && (
              <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground">
                  Este evento herda <strong>{venueContactsPreview.length}</strong> contato{venueContactsPreview.length === 1 ? "" : "s"} do local "{form.local}". Edite o local em "Meu Perfil → Locais" para alterá-los, ou adicione contatos personalizados abaixo (eles substituirão os do local apenas para este evento).
                </p>
              </div>
            )}
            <ContactsEditor
              contacts={form.custom_contacts}
              onChange={(next) => setForm({ ...form, custom_contacts: next })}
              title="Contatos do evento (personalizados)"
              description="Se preenchidos, sobrescrevem os contatos herdados do local apenas para este evento."
              showSyncToggle={!!form.local.trim()}
              syncToVenue={syncContactsToVenueFlag}
              onSyncToVenueChange={setSyncContactsToVenueFlag}
            />
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
