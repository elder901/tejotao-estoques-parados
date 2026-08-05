import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Metrica {
  id: string;
  chave: string;
  nome: string;
  area: string;
  definicao: string;
  regra_tecnica: string;
  ativa: boolean;
  ordem: number;
}

interface Versao {
  id: string;
  metrica_id: string;
  motivo: string;
  created_at: string;
  snapshot: any;
}

const AREAS = [
  { id: "comercial", nome: "Comercial" },
  { id: "estoque", nome: "Estoque" },
  { id: "perdas", nome: "Prevenção de Perdas" },
  { id: "geral", nome: "Geral" },
];

const AdminMetricas = () => {
  const { profile, loading } = useAuth();
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [historicoAberto, setHistoricoAberto] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: m, error }, { data: v }] = await Promise.all([
        supabase.from("ai_metricas").select("*").order("area").order("ordem"),
        supabase
          .from("ai_metrica_versoes")
          .select("id, metrica_id, motivo, created_at, snapshot")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (error) toast.error("Não consegui carregar a biblioteca de métricas.");
      setMetricas((m ?? []) as Metrica[]);
      setVersoes((v ?? []) as Versao[]);
      setCarregando(false);
    })();
  }, []);

  if (loading || !profile) return null;
  if (!profile?.is_admin) return <Navigate to="/" replace />;

  const atualizar = (id: string, campo: keyof Metrica, valor: unknown) =>
    setMetricas((lista) => lista.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));

  const criar = async () => {
    setCriando(true);
    const sufixo = Date.now().toString(36).slice(-4);
    const { data, error } = await supabase
      .from("ai_metricas")
      .insert({
        chave: `metrica-${sufixo}`,
        nome: "Nova métrica",
        area: "comercial",
        definicao: "",
        regra_tecnica: "",
        ordem: metricas.length + 1,
      })
      .select("*")
      .single();
    setCriando(false);
    if (error || !data) {
      toast.error(error?.message ?? "Não consegui criar a métrica.");
      return;
    }
    setMetricas((lista) => [...lista, data as Metrica]);
  };

  const salvar = async (m: Metrica) => {
    setSalvandoId(m.id);
    try {
      const { error } = await supabase
        .from("ai_metricas")
        .update({
          nome: m.nome.trim() || "Sem nome",
          area: m.area,
          definicao: m.definicao,
          regra_tecnica: m.regra_tecnica,
          ativa: m.ativa,
        })
        .eq("id", m.id);
      if (error) throw error;

      const { data: versao, error: erroVersao } = await supabase
        .from("ai_metrica_versoes")
        .insert({
          metrica_id: m.id,
          criado_por: profile.id,
          motivo: (motivos[m.id] ?? "").trim(),
          snapshot: { ...m },
        })
        .select("id, metrica_id, motivo, created_at, snapshot")
        .single();
      if (erroVersao) throw erroVersao;

      setVersoes((v) => [versao as Versao, ...v]);
      setMotivos((mo) => ({ ...mo, [m.id]: "" }));
      toast.success("Métrica atualizada. Todos os agentes que a usam já seguem a nova regra.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui salvar a métrica.");
    } finally {
      setSalvandoId(null);
    }
  };

  const excluir = async (m: Metrica) => {
    const { error } = await supabase.from("ai_metricas").delete().eq("id", m.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMetricas((lista) => lista.filter((x) => x.id !== m.id));
    toast.success("Métrica removida da biblioteca.");
  };

  const restaurar = (v: Versao) => {
    const snap = v.snapshot ?? {};
    setMetricas((lista) =>
      lista.map((m) =>
        m.id === v.metrica_id
          ? {
              ...m,
              nome: snap.nome ?? m.nome,
              area: snap.area ?? m.area,
              definicao: snap.definicao ?? m.definicao,
              regra_tecnica: snap.regra_tecnica ?? m.regra_tecnica,
              ativa: snap.ativa !== false,
            }
          : m,
      ),
    );
    setMotivos((mo) => ({ ...mo, [v.metrica_id]: `Restaurado de ${new Date(v.created_at).toLocaleString("pt-BR")}` }));
    toast.info("Versão carregada. Revise e clique em Salvar para publicar.");
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biblioteca de Métricas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Definições oficiais do negócio (o equivalente às medidas do Power BI). Elas são compartilhadas: mudou aqui,
            todos os agentes de IA passam a responder igual.
          </p>
        </div>
        <Button onClick={criar} disabled={criando}>
          {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Nova métrica
        </Button>
      </div>

      {carregando ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : metricas.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Nenhuma métrica cadastrada ainda.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {metricas.map((m) => {
            const hist = versoes.filter((v) => v.metrica_id === m.id);
            return (
              <section key={m.id} className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={m.nome}
                    onChange={(e) => atualizar(m.id, "nome", e.target.value)}
                    className="h-9 max-w-xs font-medium"
                  />
                  <Select value={m.area} onValueChange={(v) => atualizar(m.id, "area", v)}>
                    <SelectTrigger className="h-9 w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AREAS.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">{m.chave}</Badge>
                  <div className="ml-auto flex items-center gap-2">
                    <Switch checked={m.ativa} onCheckedChange={(v) => atualizar(m.id, "ativa", v)} />
                    <span className="text-xs text-muted-foreground">{m.ativa ? "Ativa" : "Desligada"}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => excluir(m)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Definição para o gestor</Label>
                  <Textarea
                    value={m.definicao}
                    rows={2}
                    onChange={(e) => atualizar(m.id, "definicao", e.target.value)}
                    placeholder="Explique em português o que essa métrica significa."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Regra técnica (o que a IA deve seguir)</Label>
                  <Textarea
                    value={m.regra_tecnica}
                    rows={7}
                    onChange={(e) => atualizar(m.id, "regra_tecnica", e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={motivos[m.id] ?? ""}
                    placeholder="Motivo da alteração"
                    onChange={(e) => setMotivos((mo) => ({ ...mo, [m.id]: e.target.value }))}
                    className="h-9 min-w-[200px] flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={() => setHistoricoAberto(historicoAberto === m.id ? null : m.id)}>
                    <History className="h-4 w-4" /> Histórico ({hist.length})
                  </Button>
                  <Button size="sm" onClick={() => salvar(m)} disabled={salvandoId === m.id}>
                    {salvandoId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                  </Button>
                </div>

                {historicoAberto === m.id && (
                  <div className="space-y-2 rounded-md border p-3">
                    {hist.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma versão salva ainda.</p>}
                    {hist.map((v) => (
                      <div key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline">{new Date(v.created_at).toLocaleString("pt-BR")}</Badge>
                        <span className="text-muted-foreground">{v.motivo || "Sem motivo informado"}</span>
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => restaurar(v)}>
                          Restaurar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminMetricas;