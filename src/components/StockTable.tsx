import { StockItem, formatCurrency, formatNumber } from '@/lib/csvParser';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

interface StockTableProps {
  items: StockItem[];
  onSelectItem: (item: StockItem) => void;
  actionPlanKeys?: Set<string>;
}

function getDiasBadge(dias: number) {
  if (dias >= 90) return <Badge variant="destructive" className="text-xs">{formatNumber(dias, 0)}d</Badge>;
  if (dias >= 45) return <Badge className="text-xs bg-accent text-accent-foreground">{formatNumber(dias, 0)}d</Badge>;
  return <Badge variant="secondary" className="text-xs">{formatNumber(dias, 0)}d</Badge>;
}

export function StockTable({ items, onSelectItem, actionPlanKeys }: StockTableProps) {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 hover:bg-primary/5">
              <TableHead className="w-12 text-xs font-bold text-center">#</TableHead>
              <TableHead className="text-xs font-bold">Código</TableHead>
              <TableHead className="text-xs font-bold min-w-[250px]">Descrição</TableHead>
              <TableHead className="text-xs font-bold">Unidade</TableHead>
              <TableHead className="text-xs font-bold">Departamento</TableHead>
              <TableHead className="text-xs font-bold">Fornecedor</TableHead>
              <TableHead className="text-xs font-bold text-right">Estoque (R$)</TableHead>
              <TableHead className="text-xs font-bold text-right">Vendas 90d (qtd)</TableHead>
              <TableHead className="text-xs font-bold text-right">VMD (qtd/dia)</TableHead>
              <TableHead className="text-xs font-bold text-center">Dias Estoque</TableHead>
              <TableHead className="text-xs font-bold text-right">Qtd Estoque</TableHead>
              <TableHead className="text-xs font-bold text-center">Giro</TableHead>
              <TableHead className="text-xs font-bold text-center">Plano</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const hasPlan = actionPlanKeys?.has(`${item.codItem}-${item.codUnidade}`) ?? false;
              return (
                <TableRow
                  key={`${item.codItem}-${item.codUnidade}`}
                  className="cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => onSelectItem(item)}
                >
                  <TableCell className="text-xs text-center font-semibold text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="text-xs font-mono">{item.codItem}</TableCell>
                  <TableCell className="text-xs font-medium">{item.descricao}</TableCell>
                  <TableCell className="text-xs">{item.codUnidade}</TableCell>
                  <TableCell className="text-xs">{item.departamento}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate">{item.fornecedor}</TableCell>
                  <TableCell className="text-xs text-right font-semibold">{formatCurrency(item.estoqueCustoMedio)}</TableCell>
                  <TableCell className="text-xs text-right">{formatNumber(item.vendasQuantidade, 0)}</TableCell>
                  <TableCell className="text-xs text-right">{formatNumber(item.diasPeriodo > 0 ? item.vendasQuantidade / item.diasPeriodo : 0, 2)}</TableCell>
                  <TableCell className="text-center">{getDiasBadge(item.diasEstoque)}</TableCell>
                  <TableCell className="text-xs text-right">{formatNumber(item.quantidadeEstoque, 0)}</TableCell>
                  <TableCell className="text-xs text-center">{formatNumber(item.giro)}</TableCell>
                  <TableCell className="text-center">
                    {hasPlan ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mx-auto" />
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-10 text-muted-foreground">
                  Nenhum item encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
