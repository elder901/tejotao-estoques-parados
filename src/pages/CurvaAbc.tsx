import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatNumber } from '@/lib/csvParser';
import { UNIT_NAMES } from '@/lib/erpIndicadores';
import {
  CURVAS,
  FAIXAS,
  loadCurva,
  loadDepartamentosCurva,
  loadResumoCurva,
  loadUnidadesCurva,
  type CurvaItem,
  type ResumoCurva,
  type ResumoDepartamento,
} from '@/lib/erpCurva';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Download, Loader2, RefreshCw, Search, TrendingUp } from 'lucide-react';

const CurvaAbc = () => {
  const { profile } = useAuth();
  const [unidade, setUnidade] = useState('REDE');
  const [departamento, setDepartamento] = useState<string>('all');
  const [curva, setCurva] = useState<string>('all');
  const [busca, setBusca] = useState('');
  const [unidades, setUnidades] = useState<string[]>([]);
  const [departamentos, setDepartamentos] = useState<ResumoDepartamento[]>([]);
  const [resumo, setResumo] = useState<ResumoCurva[]>([]);
  const [itens, setItens] = useState<CurvaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const dep = departamento === 'all' ? null : departamento;
      const [lista, res, deps] = await Promise.all([
        loadCurva({ unidade, departamento: dep, curva: curva === 'all' ? null : curva, busca }),
        loadResumoCurva(unidade, dep),
        loadDepartamentosCurva(unidade),
      ]);
      setItens(lista);
      setResumo(res);
      setDepartamentos(deps);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [unidade, departamento, curva, busca]);

  useEffect(() => {
    loadUnidadesCurva().then(setUnidades).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(carregar, busca ? 350 : 0);
    return () => clearTimeout(t);
  }, [carregar, busca]);

  const totalValor = resumo.reduce((s, r) => s + r.valor, 0);
  const totalItens = resumo.reduce((s, r) => s + r.itens, 0);
  const referencia = itens[0]?.dataReferencia ?? '';
  const diasPeriodo = itens[0]?.diasPeriodo ?? 90;

  const resumoPorCurva = useMemo(
    () =>
      CURVAS.map((c) => {
        const linha = resumo.find((r) => r.curva === c);
        return { curva: c, itens: linha?.itens ?? 0, valor: linha?.valor ?? 0 };
      }),
    [resumo],
  );

  const recalcular = async () => {
    setRecalculando(true);
    try {
      const { error } = await supabase.functions.invoke('erp-curva', { body: { janela: 90 } });
      if (error) throw error;
      toast({ title: 'Curva recalculada', description: 'A classificação foi atualizada com os dados do ERP.' });
      await carregar();
    } catch (e) {
      toast({
        title: 'Não foi possível recalcular',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setRecalculando(false);
    }
  };

  const exportar = () => {
    const wb = XLSX.utils.book_new();
    const resumoAoa: (string | number)[][] = [
      ['Curva', 'Faixa acumulada', 'Itens', 'Valor de venda', '% do valor'],
      ...resumoPorCurva.map((r) => [
        r.curva,
        FAIXAS[r.curva],
        r.itens,
        r.valor,
        totalValor ? r.valor / totalValor : 0,
      ]),
      ['Total', '', totalItens, totalValor, 1],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoAoa), 'Resumo');

    const detalheAoa: (string | number)[][] = [
      ['Loja', 'Código', 'Descrição', 'Departamento', 'Fornecedor', 'Valor de venda', 'Qtd vendida', 'Part.', 'Part. acumulada', 'Curva'],
      ...itens.map((i) => [
        i.codUnidade,
        i.codItem,
        i.descricao,
        i.departamento,
        i.fornecedor,
        i.valorVenda,
        i.quantidadeVenda,
        i.participacao,
        i.participacaoAcumulada,
        i.curva,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalheAoa), 'Curva ABC');
    XLSX.writeFile(wb, `Curva_ABC_${unidade}_${referencia || 'atual'}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Curva ABC</h1>
            <p className="text-primary-foreground/70 text-xs sm:text-sm mt-0.5">
              Classificação A1 a C3 por participação acumulada de venda dentro de cada departamento
              {referencia && ` · posição de ${new Date(`${referencia}T12:00:00`).toLocaleDateString('pt-BR')} (últimos ${diasPeriodo} dias)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={exportar} disabled={!itens.length}>
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
            {profile?.is_admin && (
              <Button variant="secondary" size="sm" onClick={recalcular} disabled={recalculando}>
                {recalculando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Recalcular
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-5 space-y-4">
        {erro && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>
        )}

        <div className="bg-card rounded-lg border p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
          </div>
          <Select value={unidade} onValueChange={(v) => { setUnidade(v); setDepartamento('all'); }}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REDE">Rede (consolidado)</SelectItem>
              {unidades.map((u) => <SelectItem key={u} value={u}>{UNIT_NAMES[u] ?? `Loja ${u}`}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={departamento} onValueChange={setDepartamento}>
            <SelectTrigger className="w-[230px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os departamentos</SelectItem>
              {departamentos.map((d) => <SelectItem key={d.departamento} value={d.departamento}>{d.departamento}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={curva} onValueChange={setCurva}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Curva" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as curvas</SelectItem>
              {CURVAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { setDepartamento('all'); setCurva('all'); setBusca(''); }}>
            Limpar
          </Button>
        </div>

        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-accent" />
            Resumo por curva
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Curva</th>
                  <th className="px-3 py-2 text-left">Faixa acumulada</th>
                  <th className="px-3 py-2 text-right">Itens</th>
                  <th className="px-3 py-2 text-right">% dos itens</th>
                  <th className="px-3 py-2 text-right">Valor de venda</th>
                  <th className="px-3 py-2 text-right">% do valor</th>
                </tr>
              </thead>
              <tbody>
                {resumoPorCurva.map((r) => (
                  <tr
                    key={r.curva}
                    className={`border-t cursor-pointer hover:bg-muted/40 ${curva === r.curva ? 'bg-accent/10' : ''}`}
                    onClick={() => setCurva(curva === r.curva ? 'all' : r.curva)}
                  >
                    <td className="px-3 py-2 font-semibold">{r.curva}</td>
                    <td className="px-3 py-2 text-muted-foreground">{FAIXAS[r.curva]}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(r.itens, 0)}</td>
                    <td className="px-3 py-2 text-right">{totalItens ? formatNumber((r.itens / totalItens) * 100, 1) : '0,0'}%</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.valor)}</td>
                    <td className="px-3 py-2 text-right">{totalValor ? formatNumber((r.valor / totalValor) * 100, 1) : '0,0'}%</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right">{formatNumber(totalItens, 0)}</td>
                  <td className="px-3 py-2 text-right">100,0%</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(totalValor)}</td>
                  <td className="px-3 py-2 text-right">100,0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Loja</th>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Departamento</th>
                  <th className="px-3 py-2 text-right">Valor de venda</th>
                  <th className="px-3 py-2 text-right">Qtd vendida</th>
                  <th className="px-3 py-2 text-right">Part.</th>
                  <th className="px-3 py-2 text-right">Part. acumulada</th>
                  <th className="px-3 py-2 text-center">Curva</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Carregando...
                  </td></tr>
                )}
                {!loading && itens.map((i) => (
                  <tr key={`${i.codUnidade}-${i.codItem}`} className="border-t hover:bg-muted/40">
                    <td className="px-3 py-2 whitespace-nowrap">{i.codUnidade}</td>
                    <td className="px-3 py-2 font-mono text-xs">{i.codItem}</td>
                    <td className="px-3 py-2">{i.descricao}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.departamento}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(i.valorVenda)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(i.quantidadeVenda, 0)}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(i.participacao * 100, 2)}%</td>
                    <td className="px-3 py-2 text-right">{formatNumber(i.participacaoAcumulada * 100, 2)}%</td>
                    <td className="px-3 py-2 text-center font-semibold">{i.curva}</td>
                  </tr>
                ))}
                {!loading && !itens.length && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum item classificado. {profile?.is_admin ? 'Use "Recalcular" para gerar a curva a partir do ERP.' : 'Peça a um administrador para gerar a curva.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {itens.length >= 500 && (
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              Mostrando os 500 itens de maior venda do recorte atual. Use os filtros para refinar.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CurvaAbc;