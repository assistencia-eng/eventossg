import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, Trash2, Plus, Loader2 } from "lucide-react";

interface AdminEntry {
  id: string;
  user_id: string;
  created_at: string;
  email?: string;
}

const AdminManagement = () => {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data } = await supabase.from("admins").select("*");
    if (data) {
      // Fetch emails from profiles
      const userIds = data.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = new Map(profiles?.map((p) => [p.user_id, p.email]) || []);
      setAdmins(data.map((a) => ({ ...a, email: emailMap.get(a.user_id) || "Desconhecido" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);

    // Find user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", newEmail.trim())
      .maybeSingle();

    if (!profile) {
      toast.error("Usuário não encontrado. Ele precisa ter uma conta cadastrada.");
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("admins").insert({ user_id: profile.user_id });
    if (error) {
      if (error.code === "23505") toast.error("Este usuário já é admin.");
      else toast.error("Erro ao adicionar admin.");
    } else {
      toast.success("Admin adicionado!");
      setNewEmail("");
      fetchAdmins();
    }
    setAdding(false);
  };

  const handleRemove = async (admin: AdminEntry) => {
    if (admins.length <= 1) {
      toast.error("Deve haver pelo menos 1 administrador.");
      return;
    }
    const { error } = await supabase.from("admins").delete().eq("id", admin.id);
    if (error) toast.error("Erro ao remover admin.");
    else { toast.success("Admin removido."); fetchAdmins(); }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-serif font-semibold">Gerenciar Administradores</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
              <div>
                <p className="text-sm font-medium">{admin.email}</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(admin)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="E-mail do novo admin"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={adding || !newEmail.trim()} size="sm" className="gap-1.5">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
        </Button>
      </div>
    </section>
  );
};

export default AdminManagement;
