import { useState, useMemo } from "react";
import { subcategoryOptions, categoryLabels, categoryIcons, EventCategory } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { supabase } from "@/integrations/supabase/client";
import { useSubcategoryImages } from "@/hooks/useSubcategoryImages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Search, Image as ImageIcon } from "lucide-react";

const allCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const SubcategoryImageManager = () => {
  const { images, loading, refetch } = useSubcategoryImages();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allCategories.map((cat) => ({
      cat,
      subs: (subcategoryOptions[cat] || []).filter((s) =>
        !q || s.toLowerCase().includes(q) || categoryLabels[cat].toLowerCase().includes(q)
      ),
    })).filter((g) => g.subs.length > 0);
  }, [search]);

  const handleUpload = async (subcategory: string, slotIndex: number, file: File) => {
    const key = `${subcategory}-${slotIndex}`;
    setUploading(key);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `subcategory/${subcategory.replace(/\s+/g, "_")}_${slotIndex}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(path);

      const imageUrl = urlData.publicUrl;

      // Check if this slot already exists
      const existingImages = images[subcategory] || [];
      // We need to check by querying the DB for this specific slot
      const { data: existing } = await supabase
        .from("subcategory_images")
        .select("id")
        .eq("subcategory", subcategory)
        .eq("image_index", slotIndex)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("subcategory_images")
          .update({ image_url: imageUrl })
          .eq("subcategory", subcategory)
          .eq("image_index", slotIndex);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subcategory_images")
          .insert({ subcategory, image_url: imageUrl, image_index: slotIndex });
        if (error) throw error;
      }

      toast.success(`Imagem ${slotIndex} de "${subcategory}" atualizada!`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (subcategory: string, slotIndex: number) => {
    try {
      const { error } = await supabase
        .from("subcategory_images")
        .delete()
        .eq("subcategory", subcategory)
        .eq("image_index", slotIndex);
      if (error) throw error;
      toast.success(`Imagem ${slotIndex} de "${subcategory}" removida`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold font-sans text-neutral-400">Imagens por Subcategoria</h2>
      <p className="text-xs text-muted-foreground">
        Defina até 3 imagens para cada subcategoria. Cards de mesma subcategoria usarão imagens variadas automaticamente.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar subcategoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#1a1a1a] border-border"
        />
      </div>

      <div className="space-y-6">
        {filtered.map(({ cat, subs }) => {
          const color = categoryColors[cat]?.vibrant || "#888";
          return (
            <div key={cat}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color }}>
                <span>{categoryIcons[cat]}</span> {categoryLabels[cat]}
              </h3>
              <div className="space-y-3">
                {subs.map((sub) => {
                  const subImages = images[sub] || [];
                  return (
                    <div
                      key={sub}
                      className="p-3 rounded-xl bg-[#1a1a1a] border border-border space-y-2"
                    >
                      <p className="text-sm font-medium text-neutral-200 capitalize">{sub}</p>

                      {/* 3 image slots */}
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((slot) => {
                          const imgUrl = subImages[slot - 1] || null;
                          const isSlotUploading = uploading === `${sub}-${slot}`;
                          return (
                            <div key={slot} className="space-y-1">
                              <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#2a2a2a] flex items-center justify-center">
                                {imgUrl ? (
                                  <img src={imgUrl} alt={`${sub} ${slot}`} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-neutral-600" />
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="cursor-pointer flex-1">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isSlotUploading}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUpload(sub, slot, file);
                                      e.target.value = "";
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-primary w-full"
                                    asChild
                                    disabled={isSlotUploading}
                                  >
                                    <span>
                                      <Upload className="w-3.5 h-3.5" />
                                    </span>
                                  </Button>
                                </label>
                                {imgUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleRemove(sub, slot)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SubcategoryImageManager;
