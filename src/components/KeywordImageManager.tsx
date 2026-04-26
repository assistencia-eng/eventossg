import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKeywordImages } from "@/hooks/useKeywordImages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Trash2, Search, Image as ImageIcon, Plus, X, ChevronDown } from "lucide-react";

const sanitize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const KeywordImageManager = () => {
  const { images, loading, refetch } = useKeywordImages();
  const [search, setSearch] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const keywords = useMemo(() => {
    const list = Object.keys(images).sort();
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((k) => k.toLowerCase().includes(q));
  }, [images, search]);

  const handleAddKeyword = async () => {
    const k = newKeyword.trim().toLowerCase();
    if (!k) return;
    if (images[k]) {
      toast.error("Esta palavra-chave já existe");
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from("keyword_images")
        .insert({ keyword: k, image_url: "", image_index: 0 });
      if (error) throw error;
      setNewKeyword("");
      toast.success(`Palavra-chave "${k}" criada! Envie até 3 imagens.`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar palavra-chave");
    }
  };

  const allKeywords = useMemo(() => keywords, [keywords]);

  const handleUpload = async (keyword: string, slotIndex: number, file: File) => {
    const slotKey = `${keyword}-${slotIndex}`;
    setUploading(slotKey);
    try {
      const ext =
        (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const safeKw = sanitize(keyword) || "kw";
      const path = `keyword/${safeKw}_${slotIndex}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("event-images").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      const { data: existing } = await (supabase as any)
        .from("keyword_images")
        .select("id")
        .eq("keyword", keyword)
        .eq("image_index", slotIndex)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("keyword_images")
          .update({ image_url: imageUrl })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("keyword_images")
          .insert({ keyword, image_url: imageUrl, image_index: slotIndex });
        if (error) throw error;
      }

      toast.success(`Imagem ${slotIndex} de "${keyword}" atualizada!`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async (keyword: string, slotIndex: number) => {
    try {
      const { error } = await (supabase as any)
        .from("keyword_images")
        .delete()
        .eq("keyword", keyword)
        .eq("image_index", slotIndex);
      if (error) throw error;
      toast.success(`Imagem ${slotIndex} de "${keyword}" removida`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    if (!confirm(`Remover a palavra-chave "${keyword}" e todas as suas imagens?`)) return;
    try {
      const { error } = await (supabase as any)
        .from("keyword_images")
        .delete()
        .eq("keyword", keyword);
      if (error) throw error;
      setLocalDrafts((prev) => prev.filter((k) => k !== keyword));
      toast.success(`Palavra-chave "${keyword}" removida`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left group"
        aria-expanded={expanded}
      >
        <h2 className="text-lg font-semibold font-sans text-neutral-400 group-hover:text-foreground transition-colors">
          Biblioteca de Palavras
        </h2>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <>
      <p className="text-xs text-muted-foreground">
        Cadastre palavras-chave e até 3 imagens por palavra. Quando o título do evento contiver
        a palavra, uma dessas imagens será usada com prioridade sobre a imagem da subcategoria.
      </p>

      {/* Add new keyword */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nova palavra-chave (ex: moto, festival, vinho)"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddKeyword();
            }
          }}
          className="bg-[#1a1a1a] border-border text-neutral-50"
        />
        <Button onClick={handleAddKeyword} variant="outline" size="sm" className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar palavra..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#1a1a1a] border-border"
        />
      </div>

      <div className="space-y-3">
        {allKeywords.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">
            Nenhuma palavra-chave cadastrada ainda.
          </p>
        )}
        {allKeywords.map((kw) => {
          const kwImages = images[kw] || [];
          return (
            <div
              key={kw}
              className="p-3 rounded-xl bg-[#1a1a1a] border border-border space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-200 lowercase">"{kw}"</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleRemoveKeyword(kw)}
                  title="Remover palavra-chave"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((slot) => {
                  const imgUrl = kwImages[slot - 1] || null;
                  const isSlotUploading = uploading === `${kw}-${slot}`;
                  return (
                    <div key={slot} className="space-y-1">
                      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#2a2a2a] flex items-center justify-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={`${kw} ${slot}`}
                            className="w-full h-full object-cover"
                          />
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
                              if (file) handleUpload(kw, slot, file);
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
                            onClick={() => handleRemoveImage(kw, slot)}
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
        </>
      )}
    </section>
  );
};

export default KeywordImageManager;
