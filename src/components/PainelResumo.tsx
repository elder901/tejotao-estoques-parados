import { formatCurrency, formatNumber } from '@/lib/csvParser';

export interface LinhaPainel {
  chave: string;
  rotulo: string;
  ativos: number;
  emRuptura: number;
  perda: number;
}

interface Props {
  titulo: string;
  colunaRotulo: string;
  linhas: LinhaPainel[];
  selecionado: string;
  onSelecionar: (chave: string) => void;
  mostrarTotal?: boolean;
  vazio?: string;
  altura?: string;
}

/** Tabela-resumo clicável usada como filtro na tela de Ruptura. */
const PainelResumo = ({ titulo, colunaRotulo, linhas, selecionado, onSelecionar, mostrarTotal, vazio, altura = 'max-h-[320px]' }: Props) => {
  const totalAtivos = linhas.reduce((s, l) => s + l.ativos, 0);
  const totalRuptura = linhas.reduce((s, l) => s + l.emRuptura, 0);
  const totalPerda = linhas.reduce((s, l) => s + l.perda, 0);

  return (
    <div className="bg-card rounded-lg border overflow-hidden flex flex-col">
      <div className="border-b px-3 py-2 text-sm font-semibold">{titulo}</div>
      {linhas.length === 0 ? (
        <div className="px-3 py-6 text-center text-xs text-muted-foreground">{vazio ?? 'Sem dados.'}</div>
      ) : (
        <div className={`overflow-auto ${altura}`}>
          <table className="w-full text-xs">
            <thead className="bg-muted/50 uppercase text-muted-foreground sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left">{colunaRotulo}</th>
                <th className="px-2 py-1.5 text-right">Ativos</th>
                <th className="px-2 py-1.5 text-right">Ruptura</th>
                <th className="px-2 py-1.5 text-right">%</th>
                <th className="px-2 py-1.5 text-right">Perda/dia</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr
                  key={l.chave}
                  onClick={() => onSelecionar(l.chave)}
                  className={`border-t cursor-pointer hover:bg-muted/40 ${selecionado === l.chave ? 'bg-accent/10 font-medium' : ''}`}
                >
                  <td className="px-2 py-1.5">{l.rotulo}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(l.ativos, 0)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(l.emRuptura, 0)}</td>
                  <td className="px-2 py-1.5 text-right">{l.ativos ? formatNumber((l.emRuptura / l.ativos) * 100, 1) : '—'}{l.ativos ? '%' : ''}</td>
                  <td className="px-2 py-1.5 text-right">{formatCurrency(l.perda)}</td>
                </tr>
              ))}
              {mostrarTotal && (
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-2 py-1.5">Total</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(totalAtivos, 0)}</td>
                  <td className="px-2 py-1.5 text-right">{formatNumber(totalRuptura, 0)}</td>
                  <td className="px-2 py-1.5 text-right">{totalAtivos ? formatNumber((totalRuptura / totalAtivos) * 100, 1) : '—'}{totalAtivos ? '%' : ''}</td>
                  <td className="px-2 py-1.5 text-right">{formatCurrency(totalPerda)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PainelResumo;