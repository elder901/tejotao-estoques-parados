import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, History, Loader2, Play, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Agente {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  avatar: string;
  instrucoes: string;
  modelo: string;
  temperatura: number;
  permite_erp: boolean;
  ativo: boolean;
}

interface Skill {
  id: string;
  titulo: string;
  conteudo: string;
  ordem: number;
  ativa: boolean;
  novo?: boolean;
}

interface Versao {
  id: string;
  motivo: string;
  created_at: string;
  snapshot: any;
}

const MODELOS = [
  { id: "deepseek/deepseek-chat", nome: "DeepSeek Chat (barato, recomendado)" },
  { id: "deepseek/deepseek-reasoner", nome: "DeepSeek Reasoner (raciocínio)" },
  { id: "google/gemini-2.0-flash-001", nome: "Gemini 2.0 Flash (rápido)" },
  { id: "openai/gpt-4o-mini", nome: "GPT-4o mini" },
  { id: "anthropic/claude-3.5-haiku", nome: "Claude 3.5 Haiku" },
];

const novoId = () => `novo-${Math.random().toString(36).slice(2, 9)}`;

const AdminAgenteEditar = () => {
  const { profile, loading } = useAuth();
  const { agenteId } = useParams<{ agenteId: string }>();
  const navigate = useNavigate();

  const [agente, setAgente] = useState<Agente | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [removidas, setRemovidas] = useState<string[]>([]);
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [testando, setTestando] = useState(false);
  const [resposta, setResposta] = useState("");
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  useEffect(() => {
    if (!agenteId) return;
    let ativo = true;
    (async () => {
      setCarregando(true);
      const [{ data: a }, { data: s }, { data: v }] = await Promise.all([
        supabase.from("ai_agentes").select("*").eq("id", agenteId).maybeSingle(),
        supabase
          .from("ai_agente_skills")
          .select("id, titulo, conteudo, ordem, ativa")
          .eq("agente_id", agenteId)
          .order("ordem"),
        supabase
          .from("ai_agente_versoes")
          .select("id, motivo, created_at, snapshot")
          .eq("agente_id", agenteId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (!ativo) return;
      if (!a) {
        toast.error("Agente não encontrado.");
        navigate("/admin/agentes", { replace: true });
        return;
      }
      setAgente(a as Agente);
      setSkills((s ?? []) as Skill[]);
      setVersoes((v ?? []) as Versao[]);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [agenteId, navigate]);

  if (loading) return null;
  if (!profile?.is_admin) return <Navigate to="/" replace />;

  const atualizar = (campo: keyof Agente, valor: unknown) =>
    setAgente((a) => (a ? { ...a, [campo]: valor } : a));

  const atualizarSkill = (id: string, campo: keyof Skill, valor: unknown) =>
    setSkills((lista) => lista.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));

  const adicionarSkill = () =>
    setSkills((lista) => [
      ...lista,
      { id: novoId(), titulo: "Nova skill", conteudo: "", ordem: lista.length + 1, ativa: true, novo: true },
    ]);

  const removerSkill = (id: string) => {
    setSkills((lista) => lista.filter((s) => s.id !== id));
    if (!id.startsWith("novo-")) setRemovidas((r) => [...r, id]);
  };

  const salvar = async () => {
    if (!agente) return;
    setSalvando(true);
    try {
      const { error: erroAgente } = await supabase
        .from("ai_agentes")
        .update({
          nome: agente.nome.trim() || "Sem nome",
          descricao: agente.descricao,
          avatar: agente.avatar,
          instrucoes: agente.instrucoes,
          modelo: agente.modelo,
          temperatura: agente.temperatura,
          permite_erp: agente.permite_erp,
          ativo: agente.ativo,
        })
        .eq("id", agente.id);
      if (erroAgente) throw erroAgente;

      if (removidas.length) {
        const { error } = await supabase.from("ai_agente_skills").delete().in("id", removidas);
        if (error) throw error;
      }

      const novas = skills.filter((s) => s.novo);
      const existentes = skills.filter((s) => !s.novo);

      for (const [i, s] of existentes.entries()) {
        const { error } = await supabase
          .from("ai_agente_skills")
          .update({ titulo: s.titulo, conteudo: s.conteudo, ativa: s.ativa, ordem: i + 1 })
          .eq("id", s.id);
        if (error) throw error;
      }

      if (novas.length) {
        const { data, error } = await supabase
          .from("ai_agente_skills")
          .insert(
            novas.map((s, i) => ({
              agente_id: agente.id,
              titulo: s.titulo,
              conteudo: s.conteudo,
              ativa: s.ativa,
              ordem: existentes.length + i + 1,
            })),
          )
          .select("id, titulo, conteudo, ordem, ativa");
        if (error) throw error;
        setSkills([...existentes, ...((data ?? []) as Skill[])]);
      }

      const { data: versao, error: erroVersao } = await supabase
        .from("ai_agente_versoes")
        .insert({
          agente_id: agente.id,
          criado_por: profile.id,
          motivo: motivo.trim(),
          snapshot: {
            agente: { ...agente },
            skills: skills.map((s, i) => ({
              titulo: s.titulo,
              conteudo: s.conteudo,
              ativa: s.ativa,
              ordem: i + 1,
            })),
          },
        })
        .select("id, motivo, created_at, snapshot")
        .single();
      if (erroVersao) throw erroVersao;

      setVersoes((v) => [versao as Versao, ...v]);
      setRemovidas([]);
      setMotivo("");
      toast.success("Agente atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui salvar o agente.");
    } finally {
      setSalvando(false);
    }
  };

  const restaurar = (v: Versao) => {
    const snap = v.snapshot ?? {};
    if (snap.agente && agente) setAgente({ ...agente, ...snap.agente, id: agente.id, slug: agente.slug });
    const lista: Skill[] = (snap.skills ?? []).map((s: any, i: number) => ({
      id: novoId(),
      titulo: s.titulo ?? "",
      conteudo: s.conteudo ?? "",
      ativa: s.ativa !== false,
      ordem: i + 1,
      novo: true,
    }));
    setRemovidas((r) => [...r, ...skills.filter((s) => !s.novo).map((s) => s.id)]);
    setSkills(lista);
    setMotivo(`Restaurado de ${new Date(v.created_at).toLocaleString("pt-BR")}`);
    toast.info("Versão carregada. Revise e clique em Salvar para publicar.");
  };

  const testar = async () => {
    if (!agente || !pergunta.trim()) return;
    setTestando(true);
    setResposta("");
    try {
      const { data, error } = await supabase.functions.invoke("analista-comercial", {
        body: {
          previa: true,
          pergunta: pergunta.trim(),
          agente: {
            instrucoes: agente.instrucoes,
            modelo: agente.modelo,
            temperatura: agente.temperatura,
            permite_erp: agente.permite_erp,
          },
          skills: skills.filter((s) => s.ativa).map((s) => ({ conteudo: s.conteudo })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResposta(String(data?.resposta ?? ""));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao testar o agente.");
    } finally {
      setTestando(false);
    }
  };

  if (carregando || !agente) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/admin/agentes")}>
        <ArrowLeft className="h-4 w-4" /> Agentes
      </Button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{agente.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Identificador interno: {agente.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMostrarHistorico((v) => !v)}>
            <History className="h-4 w-4" /> Histórico
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </Button>
        </div>
      </div>

      <section className="mt-6 space-y-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Identidade</h2>
        <div className="grid gap-4 sm:grid-cols-[80px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="avatar">Avatar</Label>
            <Input id="avatar" value={agente.avatar} maxLength={4} onChange={(e) => atualizar("avatar", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={agente.nome} onChange={(e) => atualizar("nome", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descricao">Descrição curta</Label>
          <Input id="descricao" value={agente.descricao} onChange={(e) => atualizar("descricao", e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch id="ativo" checked={agente.ativo} onCheckedChange={(v) => atualizar("ativo", v)} />
            <Label htmlFor="ativo">Agente ativo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="erp" checked={agente.permite_erp} onCheckedChange={(v) => atualizar("permite_erp", v)} />
            <Label htmlFor="erp">Pode consultar o ERP (somente leitura)</Label>
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Instruções</h2>
        <Textarea
          value={agente.instrucoes}
          onChange={(e) => atualizar("instrucoes", e.target.value)}
          rows={10}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Missão, tom de voz e regras gerais. As skills ativas são anexadas abaixo destas instruções.
        </p>
      </section>

      <section className="mt-4 space-y-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Modelo e criatividade</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Select value={agente.modelo} onValueChange={(v) => atualizar("modelo", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELOS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
                {!MODELOS.some((m) => m.id === agente.modelo) && (
                  <SelectItem value={agente.modelo}>{agente.modelo}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estilo da resposta: {agente.temperatura.toFixed(1)}</Label>
            <Slider
              value={[agente.temperatura]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([v]) => atualizar("temperatura", v)}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Mais objetivo</span>
              <span>Mais criativo</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-4 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Skills ({skills.filter((s) => s.ativa).length} ativas)</h2>
          <Button variant="outline" size="sm" onClick={adicionarSkill}>
            <Plus className="h-4 w-4" /> Nova skill
          </Button>
        </div>
        {skills.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma skill cadastrada.</p>
        )}
        {skills.map((s) => (
          <div key={s.id} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={s.titulo}
                onChange={(e) => atualizarSkill(s.id, "titulo", e.target.value)}
                className="h-8 max-w-xs"
              />
              <div className="ml-auto flex items-center gap-2">
                <Switch checked={s.ativa} onCheckedChange={(v) => atualizarSkill(s.id, "ativa", v)} />
                <span className="text-xs text-muted-foreground">{s.ativa ? "Ativa" : "Desligada"}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => removerSkill(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <Textarea
              value={s.conteudo}
              onChange={(e) => atualizarSkill(s.id, "conteudo", e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
          </div>
        ))}
      </section>

      <section className="mt-4 space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Prévia</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={pergunta}
            placeholder="Ex.: qual produto mais vendeu em junho?"
            onChange={(e) => setPergunta(e.target.value)}
            className="min-w-[240px] flex-1"
          />
          <Button variant="outline" onClick={testar} disabled={testando || !pergunta.trim()}>
            {testando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Testar
          </Button>
        </div>
        {resposta && (
          <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{resposta}</div>
        )}
        <p className="text-xs text-muted-foreground">
          O teste usa a configuração da tela (mesmo sem salvar) e não grava nada nas suas conversas.
        </p>
      </section>

      <section className="mt-4 space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Motivo da alteração</h2>
        <Input
          value={motivo}
          placeholder="Ex.: ajustei o formato da resposta"
          onChange={(e) => setMotivo(e.target.value)}
        />
      </section>

      {mostrarHistorico && (
        <section className="mt-4 space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Histórico de versões</h2>
          {versoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma versão salva ainda.</p>}
          {versoes.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
              <Badge variant="outline">{new Date(v.created_at).toLocaleString("pt-BR")}</Badge>
              <span className="text-muted-foreground">{v.motivo || "Sem motivo informado"}</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => restaurar(v)}>
                Restaurar
              </Button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default AdminAgenteEditar;