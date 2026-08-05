import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Agente {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  avatar: string;
  modelo: string;
  ativo: boolean;
  permite_erp: boolean;
}

const AdminAgentes = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("ai_agentes")
        .select("id, slug, nome, descricao, avatar, modelo, ativo, permite_erp")
        .order("nome");
      if (error) toast.error("Não consegui carregar os agentes.");
      setAgentes(data ?? []);
      setCarregando(false);
    })();
  }, []);

  if (loading) return null;
  if (!profile?.is_admin) return <Navigate to="/" replace />;

  const criar = async () => {
    setCriando(true);
    const sufixo = Date.now().toString(36).slice(-4);
    const { data, error } = await supabase
      .from("ai_agentes")
      .insert({
        slug: `agente-${sufixo}`,
        nome: "Novo agente",
        descricao: "",
        avatar: "🤖",
        instrucoes: "Você é um analista do Supermercado Tejotão. Responda em português do Brasil.",
        ativo: false,
      })
      .select("id")
      .single();
    setCriando(false);
    if (error || !data) {
      toast.error(error?.message ?? "Não consegui criar o agente.");
      return;
    }
    navigate(`/admin/agentes/${data.id}`);
  };

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agentes de IA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure instruções, skills e modelo de cada analista virtual sem depender de alterações no código.
          </p>
        </div>
        <Button onClick={criar} disabled={criando}>
          {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Novo agente
        </Button>
      </div>

      {carregando ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : agentes.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Nenhum agente cadastrado ainda.</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {agentes.map((a) => (
            <Link
              key={a.id}
              to={`/admin/agentes/${a.id}`}
              className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl">
                {a.avatar || <Bot className="h-5 w-5 text-primary" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">{a.nome}</h2>
                  <Badge variant={a.ativo ? "default" : "secondary"}>{a.ativo ? "Ativo" : "Inativo"}</Badge>
                  {a.permite_erp && <Badge variant="outline">Consulta o ERP</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {a.descricao || "Sem descrição."}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{a.modelo}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAgentes;