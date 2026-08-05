import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatNumber } from '@/lib/csvParser';
import {
  agregar, loadIndicadores, mesAnterior, mesmoMesAnoAnterior, rotuloMes,
  UNIT_NAMES, type Bloco, type IndicadorMes,
} from '@/lib/erpIndicadores';
import { exportarExcel, exportarPdf, type VisaoExport } from '@/lib/exportIndicadores';

type Formato = 'moeda' | 'numero' | 'perc' | 'decimal';

const INDICADORES: { chave: keyof Bloco; titulo: string; formato: Formato }[] = [
  { chave: 'faturamento', titulo: 'Faturamento', formato: 'moeda' },
  { chave: 'fatDia', titulo: 'Fat. médio dia', formato: 'moeda' },
  { chave: 'margem', titulo: 'Massa de margem', formato: 'moeda' },
  { chave: 'margemDia', titulo: 'Massa margem média dia', formato: 'moeda' },
  { chave: 'percMc', titulo: '% MC', formato: 'perc' },
  { chave: 'itens', titulo: 'Quantidade de itens', formato: 'numero' },
  { chave: 'ticketItem', titulo: 'Tícket por item', formato: 'decimal' },
  { chave: 'cupons', titulo: 'Número de clientes', formato: 'numero' },
  { chave: 'ticketMedio', titulo: 'Tícket médio', formato: 'decimal' },
];

function fmt(valor: number, formato: Formato) {
  if (!isFinite(valor)) return '-';
  if (formato === 'moeda') return formatCurrency(valor);
  if (formato === 'perc') return `${(valor * 100).toFixed(1)}%`;
  if (formato === 'decimal') return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return formatNumber(Math.round(valor));
}

const Indicadores = () => {
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState<IndicadorMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mes, setMes] = useState<string>('');

  useEffect(() => {
    loadIndicadores()
      .then((d) => {
        setLinhas(d);
        const meses = [...new Set(d.map((l) => l.anoMes))].sort();
        setMes(meses[meses.length - 1] ?? '');
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const meses = useMemo(() => [...new Set(linhas.map((l) => l.anoMes))].sort().reverse(), [linhas]);
  const lojas = useMemo(() => [...new Set(linhas.map((l) => l.codUnidade))].sort(), [linhas]);

  const blocosPorLoja = (filtro: (l: IndicadorMes) => boolean) => {
    const base = linhas.filter(filtro);
    const porLoja: Record<string, Bloco> = {};
    for (const loja of lojas) porLoja[loja] = agregar(base.filter((l) => l.codUnidade === loja));
    return { porLoja, total: agregar(base) };
  };

  const visoes = useMemo(() => {
    if (!mes) return [];
    const anterior = mesAnterior(mes);
    const anoAnterior = mesmoMesAnoAnterior(mes);
    const [ano, m] = mes.split('-');
    const acumulado = (a: string) => (l: IndicadorMes) => l.anoMes.startsWith(a) && l.anoMes.slice(5) <= m;
    return [
      {
        id: 'lm',
        titulo: 'Mês anterior — LM',
        subtitulo: `${rotuloMes(mes)} x ${rotuloMes(anterior)}`,
        rotuloBase: rotuloMes(anterior),
        rotuloAtual: rotuloMes(mes),
        base: blocosPorLoja((l) => l.anoMes === anterior),
        atual: blocosPorLoja((l) => l.anoMes === mes),
      },
      {
        id: 'aa',
        titulo: 'Mesmo mês do ano anterior',
        subtitulo: `${rotuloMes(mes)} x ${rotuloMes(anoAnterior)}`,
        rotuloBase: rotuloMes(anoAnterior),
        rotuloAtual: rotuloMes(mes),
        base: blocosPorLoja((l) => l.anoMes === anoAnterior),
        atual: blocosPorLoja((l) => l.anoMes === mes),
      },
      {
        id: 'acum',
        titulo: 'Ano acumulado',
        subtitulo: `até ${rotuloMes(mes)} x até ${rotuloMes(anoAnterior)}`,
        rotuloBase: `até ${rotuloMes(anoAnterior)}`,
        rotuloAtual: `até ${rotuloMes(mes)}`,
        base: blocosPorLoja(acumulado(String(Number(ano) - 1))),
        atual: blocosPorLoja(acumulado(ano)),
      },
    ];
  }, [mes, linhas, lojas]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-[1800px] mx-auto px-4 py-4 sm:py-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Fechamento de Indicadores</h1>
            <p className="text-primary-foreground/70 text-xs sm:text-sm mt-0.5">
              Três visões: mês anterior, mesmo mês do ano anterior e ano acumulado
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!visoes.length}
              onClick={() => exportarExcel(visoes as VisaoExport[], lojas, INDICADORES, rotuloMes(mes))}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <FileSpreadsheet className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!visoes.length}
              onClick={() => exportarPdf(visoes as VisaoExport[], lojas, INDICADORES, rotuloMes(mes), fmt)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <FileDown className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[130px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => <SelectItem key={m} value={m}>{rotuloMes(m)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Voltar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-5 space-y-8">
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {!erro && !linhas.length && (
          <p className="text-sm text-muted-foreground">Nenhum indicador sincronizado ainda.</p>
        )}

        {visoes.map((v) => (
          <section key={v.id} className="space-y-3">
            <div className="border-l-4 border-primary pl-3">
              <h2 className="text-lg font-bold text-foreground">{v.titulo}</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{v.subtitulo}</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {INDICADORES.map((ind) => (
                <div key={ind.chave} className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="bg-muted/60 px-3 py-2 text-xs font-bold uppercase tracking-wide text-foreground">
                    {ind.titulo}
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left font-medium px-3 py-1.5">Período</th>
                        {lojas.map((l) => (
                          <th key={l} className="text-right font-medium px-2 py-1.5">{UNIT_NAMES[l] ?? l}</th>
                        ))}
                        <th className="text-right font-semibold px-3 py-1.5">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { rotulo: v.rotuloBase, dados: v.base },
                        { rotulo: v.rotuloAtual, dados: v.atual },
                      ].map((linha) => (
                        <tr key={linha.rotulo} className="border-t border-border">
                          <td className="px-3 py-1.5 text-muted-foreground">{linha.rotulo}</td>
                          {lojas.map((l) => (
                            <td key={l} className="px-2 py-1.5 text-right tabular-nums">
                              {fmt(linha.dados.porLoja[l]?.[ind.chave] as number, ind.formato)}
                            </td>
                          ))}
                          <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                            {fmt(linha.dados.total[ind.chave] as number, ind.formato)}
                          </td>
                        </tr>
                      ))}
                      {(() => {
                        const cresc = (a: number, b: number) => a - b;
                        const perc = (a: number, b: number) => (b !== 0 ? (a - b) / Math.abs(b) : 0);
                        return (
                          <>
                            <tr className="border-t border-border bg-muted/30">
                              <td className="px-3 py-1.5 font-medium">Cresc.</td>
                              {lojas.map((l) => {
                                const d = cresc(v.atual.porLoja[l]?.[ind.chave] as number, v.base.porLoja[l]?.[ind.chave] as number);
                                return (
                                  <td key={l} className={`px-2 py-1.5 text-right tabular-nums ${d < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {fmt(d, ind.formato === 'perc' ? 'perc' : ind.formato)}
                                  </td>
                                );
                              })}
                              {(() => {
                                const d = cresc(v.atual.total[ind.chave] as number, v.base.total[ind.chave] as number);
                                return (
                                  <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${d < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {fmt(d, ind.formato === 'perc' ? 'perc' : ind.formato)}
                                  </td>
                                );
                              })()}
                            </tr>
                            <tr className="border-t border-border bg-muted/30">
                              <td className="px-3 py-1.5 font-medium">% Cresc.</td>
                              {lojas.map((l) => {
                                const d = perc(v.atual.porLoja[l]?.[ind.chave] as number, v.base.porLoja[l]?.[ind.chave] as number);
                                return (
                                  <td key={l} className={`px-2 py-1.5 text-right tabular-nums ${d < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {(d * 100).toFixed(1)}%
                                  </td>
                                );
                              })}
                              {(() => {
                                const d = perc(v.atual.total[ind.chave] as number, v.base.total[ind.chave] as number);
                                return (
                                  <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${d < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                    {(d * 100).toFixed(1)}%
                                  </td>
                                );
                              })()}
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default Indicadores;
