import { useEffect, useMemo, useState } from 'react';
import {
  loadRuptura,
  loadTotaisAtivos,
  loadTotaisAtivosDepto,
  type RupturaItem,
  type RupturaTotal,
  type RupturaTotalDepto,
} from '@/lib/erpRuptura';
import { CURVAS, loadCurvaPorItem, loadResumoCurva, type ResumoCurva } from '@/lib/erpCurva';
import PainelResumo from '@/components/PainelResumo';
import { getLastSync, type ErpSyncInfo } from '@/lib/erpData';
import { formatCurrency, formatNumber } from '@/lib/csvParser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CalendarDays, Loader2, PackageX, Percent, Search, TrendingDown } from 'lucide-react';

interface LinhaResumo {
  chave: string;
  rotulo: string;
  ativos: number;
  emRuptura: number;
  perda: number;
}

const Ruptura = () => {
  const [items, setItems] = useState<RupturaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [unidade, setUnidade] = useState('all');
  const [departamento, setDepartamento] = useState('all');
  const [curva, setCurva] = useState('all');
  const [fornecedor, setFornecedor] = useState('all');
  const [busca, setBusca] = useState('');
  const [somenteComVenda, setSomenteComVenda] = useState(true);
  const [modoEstoque, setModoEstoque] = useState<'zerados' | 'zerados_negativos'>('zerados');
  const [totais, setTotais] = useState<RupturaTotal[]>([]);
  const [totaisDepto, setTotaisDepto] = useState<RupturaTotalDepto[]>([]);
  const [curvaPorItem, setCurvaPorItem] = useState<Map<string, string>>(new Map());
  const [resumoCurva, setResumoCurva] = useState<ResumoCurva[]>([]);
  const [sync, setSync] = useState<ErpSyncInfo | null>(null);

  useEffect(() => {
    loadRuptura()
      .then(setItems)
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    getLastSync().then((s) => s && setSync(s)).catch(() => {});
    loadTotaisAtivos().then(setTotais).catch(() => {});
    loadTotaisAtivosDepto().then(setTotaisDepto).catch(() => {});
    loadCurvaPorItem('REDE').then(setCurvaPorItem).catch(() => {});
    loadResumoCurva('REDE').then(setResumoCurva).catch(() => {});
  }, []);

  /** Itens com a curva ABC anexada. */
  const itensComCurva = useMemo(
    () => items.map((i) => ({ ...i, curva: curvaPorItem.get(i.codItem) ?? 'Sem curva' })),
    [items, curvaPorItem],
  );

  const fornecedores = useMemo(() => {
    let base = itensComCurva;
    if (unidade !== 'all') base = base.filter((i) => i.codUnidade === unidade);
    if (departamento !== 'all') base = base.filter((i) => i.departamento === departamento);
    return [...new Set(base.map((i) => i.fornecedor))].sort().slice(0, 400);
  }, [itensComCurva, unidade, departamento]);

  /** Base comum: modo de estoque, busca, fornecedor e "só com venda". */
  const baseComum = useMemo(() => {
    let r = modoEstoque === 'zerados'
      ? itensComCurva.filter((i) => i.quantidadeEstoque === 0)
      : itensComCurva.filter((i) => i.quantidadeEstoque <= 0);
    if (fornecedor !== 'all') r = r.filter((i) => i.fornecedor === fornecedor);
    if (somenteComVenda) r = r.filter((i) => i.vendasPeriodo > 0);
    if (busca) {
      const t = busca.toLowerCase();
      r = r.filter((i) => i.descricao.toLowerCase().includes(t) || i.codItem.toLowerCase().includes(t));
    }
    return r;
  }, [itensComCurva, fornecedor, somenteComVenda, busca, modoEstoque]);

  const filtrados = useMemo(() => {
    let r = baseComum;
    if (unidade !== 'all') r = r.filter((i) => i.codUnidade === unidade);
    if (departamento !== 'all') r = r.filter((i) => i.departamento === departamento);
    if (curva !== 'all') r = r.filter((i) => i.curva === curva);
    return [...r].sort((a, b) => b.perdaDia - a.perdaDia);
  }, [baseComum, unidade, departamento, curva]);

  const perdaTotalDia = filtrados.reduce((s, i) => s + i.perdaDia, 0);
  const comVenda = filtrados.filter((i) => i.vendasPeriodo > 0).length;

  const comNegativos = modoEstoque === 'zerados_negativos';

  // --- Painel por loja (ignora o próprio filtro de loja) ---
  const linhasLoja = useMemo<LinhaResumo[]>(() => {
    let base = baseComum;
    if (departamento !== 'all') base = base.filter((i) => i.departamento === departamento);
    if (curva !== 'all') base = base.filter((i) => i.curva === curva);
    const lojas = [...new Set([...totais.map((t) => t.codUnidade), ...base.map((i) => i.codUnidade)])].sort();
    return lojas.map((loja) => {
      const t = totais.find((x) => x.codUnidade === loja);
      const itens = base.filter((i) => i.codUnidade === loja);
      return {
        chave: loja,
        rotulo: `Loja ${loja}`,
        ativos: t?.itensAtivos ?? 0,
        emRuptura: itens.length,
        perda: itens.reduce((s, i) => s + i.perdaDia, 0),
      };
    });
  }, [baseComum, totais, departamento, curva]);

  // --- Painel por curva (ignora o próprio filtro de curva) ---
  const linhasCurva = useMemo<LinhaResumo[]>(() => {
    let base = baseComum;
    if (unidade !== 'all') base = base.filter((i) => i.codUnidade === unidade);
    if (departamento !== 'all') base = base.filter((i) => i.departamento === departamento);
    const chaves = [...CURVAS as readonly string[], 'Sem curva'];
    return chaves
      .map((c) => {
        const itens = base.filter((i) => i.curva === c);
        const ativos = resumoCurva.find((r) => r.curva === c)?.itens ?? 0;
        return {
          chave: c,
          rotulo: c,
          ativos,
          emRuptura: itens.length,
          perda: itens.reduce((s, i) => s + i.perdaDia, 0),
        };
      })
      .filter((l) => l.ativos > 0 || l.emRuptura > 0);
  }, [baseComum, resumoCurva, unidade, departamento]);

  // --- Painel por estrutura mercadológica (ignora o próprio filtro de departamento) ---
  const linhasDepartamento = useMemo<LinhaResumo[]>(() => {
    let base = baseComum;
    if (unidade !== 'all') base = base.filter((i) => i.codUnidade === unidade);
    if (curva !== 'all') base = base.filter((i) => i.curva === curva);
    const ativosPorDepto = new Map<string, number>();
    for (const t of totaisDepto) {
      if (unidade !== 'all' && t.codUnidade !== unidade) continue;
      ativosPorDepto.set(t.departamento, (ativosPorDepto.get(t.departamento) ?? 0) + t.itensAtivos);
    }
    const nomes = [...new Set([...ativosPorDepto.keys(), ...base.map((i) => i.departamento)])].sort();
    return nomes
      .map((nome) => {
        const itens = base.filter((i) => i.departamento === nome);
        return {
          chave: nome,
          rotulo: nome,
          ativos: ativosPorDepto.get(nome) ?? 0,
          emRuptura: itens.length,
          perda: itens.reduce((s, i) => s + i.perdaDia, 0),
        };
      })
      .sort((a, b) => b.perda - a.perda);
  }, [baseComum, totaisDepto, unidade, curva]);

  // % de ruptura = itens em ruptura ÷ itens ativos (não bloqueados) da(s) loja(s) selecionada(s)
  const itensAtivos = useMemo(() => {
    const base = unidade === 'all' ? totais : totais.filter((t) => t.codUnidade === unidade);
    return base.reduce((s, t) => s + t.itensAtivos, 0);
  }, [totais, unidade]);

  const rupturaBase = useMemo(() => {
    const base = unidade === 'all' ? totais : totais.filter((t) => t.codUnidade === unidade);
    return base.reduce(
      (s, t) => s + t.itensZerados + (comNegativos ? t.itensNegativos : 0),
      0,
    );
  }, [totais, unidade, comNegativos]);

  const percentualRuptura = itensAtivos > 0 ? (rupturaBase / itensAtivos) * 100 : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando ruptura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Ruptura de Estoque</h1>
            <p className="text-primary-foreground/70 text-xs sm:text-sm mt-0.5 flex items-center gap-2 flex-wrap">
              Itens com estoque zerado que não estão bloqueados (produtos que vendemos)
              {sync?.finalizado_em && (
                <span className="bg-primary-foreground/15 rounded px-2 py-0.5 text-xs font-medium inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  ERP · {new Date(sync.finalizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-5 space-y-4">
        {erro && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi
            icon={<Percent className="h-5 w-5" />}
            label={`% de ruptura (${modoEstoque === 'zerados' ? 'zerados' : 'zerados + negativos'})`}
            value={percentualRuptura === null ? '—' : `${formatNumber(percentualRuptura, 2)}%`}
            danger
          />
          <Kpi icon={<PackageX className="h-5 w-5" />} label="Itens em ruptura" value={String(filtrados.length)} danger />
          <Kpi icon={<AlertTriangle className="h-5 w-5" />} label="Com venda nos últimos 90d" value={String(comVenda)} />
          <Kpi icon={<TrendingDown className="h-5 w-5" />} label="Venda perdida estimada / dia" value={formatCurrency(perdaTotalDia)} danger />
          <Kpi icon={<CalendarDays className="h-5 w-5" />} label="Venda perdida estimada / mês" value={formatCurrency(perdaTotalDia * 30)} />
        </div>

        <div className="bg-card rounded-lg border p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
          </div>
          <Select value={fornecedor} onValueChange={setFornecedor}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os fornecedores</SelectItem>
              {fornecedores.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              variant={modoEstoque === 'zerados' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setModoEstoque('zerados')}
            >
              Só zerados
            </Button>
            <Button
              variant={modoEstoque === 'zerados_negativos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setModoEstoque('zerados_negativos')}
            >
              Zerados + negativos
            </Button>
          </div>
          <Button variant={somenteComVenda ? 'default' : 'outline'} size="sm" onClick={() => setSomenteComVenda((v) => !v)}>
            Só itens com venda
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setUnidade('all'); setDepartamento('all'); setCurva('all'); setFornecedor('all'); setBusca(''); setSomenteComVenda(true); setModoEstoque('zerados'); }}>
            Limpar
          </Button>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <PainelResumo
            titulo="Por loja"
            colunaRotulo="Loja"
            linhas={linhasLoja}
            selecionado={unidade}
            onSelecionar={(k) => setUnidade(unidade === k ? 'all' : k)}
            mostrarTotal
          />
          <PainelResumo
            titulo="Por curva ABC"
            colunaRotulo="Curva"
            linhas={linhasCurva}
            selecionado={curva}
            onSelecionar={(k) => setCurva(curva === k ? 'all' : k)}
            vazio="Curva ainda não calculada. Gere a curva em Comercial → Curva ABC."
          />
          <PainelResumo
            titulo="Por estrutura mercadológica"
            colunaRotulo="Departamento"
            linhas={linhasDepartamento}
            selecionado={departamento}
            onSelecionar={(k) => setDepartamento(departamento === k ? 'all' : k)}
            altura="max-h-[320px]"
          />
        </div>

        {itensAtivos > 0 && (
          <p className="text-xs text-muted-foreground">
            Base do cálculo: {formatNumber(rupturaBase, 0)} itens em ruptura de {formatNumber(itensAtivos, 0)} itens ativos (não bloqueados)
            {unidade !== 'all' ? ` na loja ${unidade}` : ' na rede'}.
            {' '}Nas tabelas acima, o % de ruptura usa os itens ativos do próprio recorte; na curva, a base é a quantidade de itens classificados naquela curva.
          </p>
        )}

        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Loja</th>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Departamento</th>
                  <th className="px-3 py-2 text-center">Curva</th>
                  <th className="px-3 py-2 text-left">Fornecedor</th>
                  <th className="px-3 py-2 text-right">Estoque</th>
                  <th className="px-3 py-2 text-right">Vendas 90d (qtd)</th>
                  <th className="px-3 py-2 text-right">VMD (qtd/dia)</th>
                  <th className="px-3 py-2 text-right">Preço venda</th>
                  <th className="px-3 py-2 text-right">Perda/dia (R$)</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, 300).map((i) => (
                  <tr key={`${i.codUnidade}-${i.codItem}`} className="border-t hover:bg-muted/40">
                    <td className="px-3 py-2 whitespace-nowrap">{i.codUnidade}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{i.codItem}</td>
                    <td className="px-3 py-2">{i.descricao}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.departamento}</td>
                    <td className="px-3 py-2 text-center font-medium">{i.curva}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.fornecedor}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(i.quantidadeEstoque, 0)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(i.vendasPeriodo, 0)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(i.vmd, 2)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(i.precoVenda)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-destructive">{formatCurrency(i.perdaDia)}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">Nenhum item em ruptura com os filtros atuais.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filtrados.length > 300 && (
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              Mostrando os 300 itens de maior perda estimada, de {filtrados.length} em ruptura.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

function Kpi({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="bg-card rounded-lg border p-3 sm:p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <span className="text-accent">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-lg sm:text-xl font-bold ${danger ? 'text-destructive' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}

export default Ruptura;
