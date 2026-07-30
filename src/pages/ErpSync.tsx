import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, RefreshCw, ScrollText, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface Regra {
  id: string;
  versao: number;
  ativa: boolean;
  motivo: string;
  created_at: string;
  parametros: any;
}

interface SyncLog {
  id: string;
  status: string;
  linhas: number | null;
  erro: string | null;
  regra_versao: number | null;
  iniciado_em: string;
  finalizado_em: string | null;
}

const fmtData = (v: string | null) =>
  v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function ErpSync() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [regras, setRegras] = useState<Regra[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // formulário da nova versão de regra
  const [janela, setJanela] = useState('90');
  const [tipos, setTipos] = useState('EVD, EVL, EVP');
  const [diasCriticos, setDiasCriticos] = useState('90');
  const [limite, setLimite] = useState('25000');
  const [descricao, setDescricao] = useState('');

  const ativa = regras.find((r) => r.ativa);

  const carregar = async () => {
    const [{ data: rs }, { data: ls }] = await Promise.all([
      supabase.from('regras_versoes').select('*').order('versao', { ascending: false }),
      supabase.from('erp_sync_log').select('*').order('iniciado_em', { ascending: false }).limit(10),
    ]);
    setRegras((rs ?? []) as Regra[]);
    setLogs((ls ?? []) as SyncLog[]);
    const a = (rs ?? []).find((r: any) => r.ativa) as Regra | undefined;
    if (a?.parametros) {
      setJanela(String(a.parametros.janela_dias ?? 90));
      setTipos((a.parametros.tipos_venda ?? ['EVD', 'EVL', 'EVP']).join(', '));
      setDiasCriticos(String(a.parametros.dias_criticos ?? 90));
      setLimite(String(a.parametros.limite_linhas ?? 25000));
    }
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!profile?.is_admin) return <Navigate to="/" replace />;

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-sync', { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Sincronização concluída: ${(data as any).linhas} itens atualizados`);
    } catch (e: any) {
      toast.error(`Falha na sincronização: ${e.message ?? e}`);
    } finally {
      setSincronizando(false);
      carregar();
    }
  };

  const publicarNovaVersao = async () => {
    if (!descricao.trim()) { toast.error('Descreva o motivo da mudança (fica registrado no histórico)'); return; }
    setSalvando(true);
    try {
      const base = ativa?.parametros ?? {};
      const parametros = {
        ...base,
        janela_dias: Number(janela) || 90,
        tipos_venda: tipos.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean),
        dias_criticos: Number(diasCriticos) || 90,
        limite_linhas: Number(limite) || 25000,
      };
      const proxima = Math.max(0, ...regras.map((r) => r.versao)) + 1;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('regras_versoes').update({ ativa: false }).eq('ativa', true);
      const { error } = await supabase.from('regras_versoes').insert({
        versao: proxima, ativa: true, motivo: descricao.trim(), parametros, criado_por: user?.id ?? null,
      });
      if (error) throw error;
      toast.success(`Versão ${proxima} publicada. Rode a sincronização para aplicar.`);
      setDescricao('');
      carregar();
    } catch (e: any) {
      toast.error(`Erro ao publicar: ${e.message ?? e}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-[1000px] mx-auto px-4 py-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Dados do ERP e Regras</h1>
            <p className="text-primary-foreground/70 text-xs mt-0.5">Sincronização automática e governança dos cálculos</p>
          </div>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 py-5 space-y-6">
        <section className="bg-card border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-bold text-sm">Sincronizar com o ERP</h2>
              <p className="text-xs text-muted-foreground">
                Busca estoque atual e vendas do período direto no ERP e recalcula o giro.
              </p>
            </div>
            <Button onClick={sincronizar} disabled={sincronizando}>
              {sincronizando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar agora
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Início</TableHead><TableHead>Status</TableHead>
                <TableHead>Itens</TableHead><TableHead>Regra</TableHead><TableHead>Fim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{fmtData(l.iniciado_em)}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === 'concluido' ? 'default' : l.status === 'erro' ? 'destructive' : 'secondary'}>
                      {l.status}
                    </Badge>
                    {l.erro && <div className="text-xs text-destructive mt-1 max-w-[280px]">{l.erro}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{l.linhas ?? '—'}</TableCell>
                  <TableCell className="text-xs">v{l.regra_versao ?? '—'}</TableCell>
                  <TableCell className="text-xs">{fmtData(l.finalizado_em)}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">Nenhuma sincronização ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </section>

        <section className="bg-card border rounded-lg p-4 space-y-3">
          <div>
            <h2 className="font-bold text-sm flex items-center gap-2"><ScrollText className="h-4 w-4" /> Regras de negócio (versão ativa: v{ativa?.versao ?? '—'})</h2>
            <p className="text-xs text-muted-foreground">
              Mudar um parâmetro cria uma nova versão. As versões antigas ficam guardadas para auditoria.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Janela de vendas (dias)" value={janela} onChange={setJanela} />
            <Campo label="Tipos de movimento de venda" value={tipos} onChange={setTipos} />
            <Campo label="Item crítico a partir de (dias)" value={diasCriticos} onChange={setDiasCriticos} />
            <Campo label="Máximo de itens no snapshot" value={limite} onChange={setLimite} />
            <div className="sm:col-span-2">
              <label className="text-xs font-medium">Motivo da mudança (obrigatório)</label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: passamos a considerar 60 dias por causa da sazonalidade" />
            </div>
          </div>
          <Button onClick={publicarNovaVersao} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Publicar nova versão
          </Button>

          <Table>
            <TableHeader>
              <TableRow><TableHead>Versão</TableHead><TableHead>Motivo</TableHead><TableHead>Criada em</TableHead><TableHead>Parâmetros</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {regras.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">v{r.versao} {r.ativa && <Badge className="ml-1">ativa</Badge>}</TableCell>
                  <TableCell className="text-xs">{r.motivo}</TableCell>
                  <TableCell className="text-xs">{fmtData(r.created_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[320px] truncate">{JSON.stringify(r.parametros)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </main>
    </div>
  );
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}