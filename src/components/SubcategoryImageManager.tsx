import { useState, useMemo } from "react";
import { subcategoryOptions, categoryLabels, categoryIcons, EventCategory } from "@/data/events";
import { categoryColors } from "@/data/categoryColors";
import { supabase } from "@/integrations/supabase/client";
import { useSubcategoryImages, subImgKey } from "@/hooks/useSubcategoryImages";
import { useCategoryImages } from "@/hooks/useCategoryImages";
import { useSubcategoriesVersion } from "@/hooks/useSubcategoriesSync";
import { useCategoriesVersion, getCustomCategoryKeys } from "@/hooks/useCategoriesSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Search, Image as ImageIcon } from "lucide-react";

const baseCategories: EventCategory[] = ["musica", "esporte", "alimentacao", "entretenimento", "palestras", "feiras", "festas"];

const SubcategoryImageManager = () => {
  const subVersion = useSubcategoriesVersion();
  const catVersion = useCategoriesVersion();
  const { images, loading, refetch } = useSubcategoryImages();
  const { images: categoryImages, refetch: refetchCategoryImages } = useCategoryImages();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadingCat, setUploadingCat] = useState<string | null>(null);

  const allCategories: EventCategory[] = useMemo(
    () => [...baseCategories, ...getCustomCategoryKeys().filter((c) => !baseCategories.includes(c))],
    [catVersion]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allCategories.map((cat) => ({
      cat,
      subs: (subcategoryOptions[cat] || []).filter((s) =>
        !q || s.toLowerCase().includes(q) || categoryLabels[cat].toLowerCase().includes(q)
      ),
    }));
  }, [search, subVersion, catVersion, allCategories]);

  const handleUpload = async (categoria: EventCategory, subcategory: string, slotIndex: number, file: File) => {
    const key = `${categoria}-${subcategory}-${slotIndex}`;
    setUploading(key);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      // Sanitize for Supabase storage key (ASCII only, no special chars or accents)
      const sanitize = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const safeCat = sanitize(categoria) || "cat";
      const safeSub = sanitize(subcategory) || "sub";
      const path = `subcategory/${safeCat}_${safeSub}_${slotIndex}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(path);

      const imageUrl = urlData.publicUrl;

      // Check if this slot for (categoria, subcategoria) already exists
      const { data: existing } = await supabase
        .from("subcategory_images")
        .select("id")
        .eq("categoria", categoria)
        .eq("subcategory", subcategory)
        .eq("image_index", slotIndex)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("subcategory_images")
          .update({ image_url: imageUrl })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subcategory_images")
          .insert({ categoria, subcategory, image_url: imageUrl, image_index: slotIndex });
        if (error) throw error;
      }

      toast.success(`Imagem ${slotIndex} de "${categoryLabels[categoria]} → ${subcategory}" atualizada!`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (categoria: EventCategory, subcategory: string, slotIndex: number) => {
    try {
      const { error } = await supabase
        .from("subcategory_images")
        .delete()
        .eq("categoria", categoria)
        .eq("subcategory", subcategory)
        .eq("image_index", slotIndex);
      if (error) throw error;
      toast.success(`Imagem ${slotIndex} de "${categoryLabels[categoria]} → ${subcategory}" removida`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const handleUploadCategory = async (categoria: EventCategory, file: File) => {
    setUploadingCat(categoria);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const sanitize = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const safeCat = sanitize(categoria) || "cat";
      const path = `category/${safeCat}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      const { error } = await supabase
        .from("category_images")
        .upsert({ categoria, image_url: imageUrl }, { onConflict: "categoria" });
      if (error) throw error;

      toast.success(`Imagem geral de "${categoryLabels[categoria]}" atualizada!`);
      await refetchCategoryImages();
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploadingCat(null);
    }
  };

  const handleRemoveCategory = async (categoria: EventCategory) => {
    try {
      const { error } = await supabase
        .from("category_images")
        .delete()
        .eq("categoria", categoria);
      if (error) throw error;
      toast.success(`Imagem geral de "${categoryLabels[categoria]}" removida`);
      await refetchCategoryImages();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold font-sans text-neutral-400">Imagens por Subcategoria</h2>
      <p className="text-xs text-muted-foreground">
        Defina até 3 imagens para cada subcategoria. Cada categoria tem suas próprias imagens, mesmo quando o nome da subcategoria se repete.
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
                  const subImages = images[subImgKey(cat, sub)] || [];
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
                          const isSlotUploading = uploading === `${cat}-${sub}-${slot}`;
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
                                      if (file) handleUpload(cat, sub, slot, file);
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
                                    onClick={() => handleRemove(cat, sub, slot)}
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
