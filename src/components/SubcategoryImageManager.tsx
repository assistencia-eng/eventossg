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

  const handleUpload = async (subcategory: string, file: File) => {
    setUploading(subcategory);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `subcategory/${subcategory.replace(/\s+/g, "_")}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(path);

      const imageUrl = urlData.publicUrl;

      // Upsert into subcategory_images
      const existing = images[subcategory];
      if (existing) {
        const { error } = await supabase
          .from("subcategory_images")
          .update({ image_url: imageUrl })
          .eq("subcategory", subcategory);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subcategory_images")
          .insert({ subcategory, image_url: imageUrl });
        if (error) throw error;
      }

      toast.success(`Imagem de "${subcategory}" atualizada!`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (subcategory: string) => {
    try {
      const { error } = await supabase
        .from("subcategory_images")
        .delete()
        .eq("subcategory", subcategory);
      if (error) throw error;
      toast.success(`Imagem de "${subcategory}" removida`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-neutral-400 font-sans">Imagens por Subcategoria</h2>
      <p className="text-xs text-muted-foreground">
        Defina imagens padrão para cada subcategoria. Eventos sem imagem própria usarão a imagem da subcategoria correspondente.
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subs.map((sub) => {
                  const imgUrl = images[sub];
                  const isUploading = uploading === sub;
                  return (
                    <div
                      key={sub}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] border border-border"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#2a2a2a] shrink-0 flex items-center justify-center">
                        {imgUrl ? (
                          <img src={imgUrl} alt={sub} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-neutral-600" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-200 truncate capitalize">{sub}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {imgUrl ? "Imagem definida" : "Sem imagem"}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(sub, file);
                              e.target.value = "";
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            asChild
                            disabled={isUploading}
                          >
                            <span>
                              <Upload className="w-4 h-4" />
                            </span>
                          </Button>
                        </label>
                        {imgUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemove(sub)}
                          >
                            <Trash2 className="w-4 h-4" />
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
    </section>
  );
};

export default SubcategoryImageManager;
