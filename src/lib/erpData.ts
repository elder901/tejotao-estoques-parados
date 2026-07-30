import { supabase } from '@/integrations/supabase/client';
import type { StockItem } from '@/lib/csvParser';

const UNIT_NAMES: Record<string, string> = {
  '001': 'Mato Grosso',
  '002': 'Melo Viana',
  '003': 'Amazonas',
};

export interface ErpSyncInfo {
  finalizado_em: string | null;
  linhas: number | null;
  regra_versao: number | null;
  status: string;
}

const PAGE = 1000;
const MAX_ITENS = 6000;

/** Carrega o snapshot calculado a partir do ERP (já com giro e dias de estoque). */
export async function loadErpData(): Promise<StockItem[]> {
  const paginas = Array.from({ length: MAX_ITENS / PAGE }, (_, page) =>
    supabase
      .from('erp_estoque_snapshot')
      .select('cod_item, descricao, cod_unidade, departamento, fornecedor, quantidade_estoque, custo_medio, valor_estoque, vendas_periodo, dias_periodo, vmd, dias_estoque')
      .order('valor_estoque', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1),
  );
  const resultados = await Promise.all(paginas);
  const items: StockItem[] = [];
  for (const { data, error } of resultados) {
    if (error) throw error;
    for (const r of data ?? []) {
      const diasPeriodo = r.dias_periodo || 90;
      items.push({
        diasEstoque: Number(r.dias_estoque) || 0,
        grupo: r.departamento ?? '',
        produto: r.descricao ?? '',
        codItem: r.cod_item,
        descricao: r.descricao ?? '',
        departamento: r.departamento || 'Sem departamento',
        codUnidade: r.cod_unidade,
        nomeUnidade: UNIT_NAMES[r.cod_unidade] ?? `Unidade ${r.cod_unidade}`,
        fornecedor: r.fornecedor || 'Sem fornecedor',
        quantidadeEstoque: Number(r.quantidade_estoque) || 0,
        vendasQuantidade: Number(r.vendas_periodo) || 0,
        diasPeriodo,
        qtdCompras: 0,
        estoqueCustoMedio: Number(r.valor_estoque) || 0,
        vendasCustoMedio: (Number(r.vendas_periodo) || 0) * (Number(r.custo_medio) || 0),
        giro: Number(r.dias_estoque) > 0 ? diasPeriodo / Number(r.dias_estoque) : 0,
        diasEstoqueCalc: Number(r.dias_estoque) || 0,
        vdMediaMesAtual: Number(r.vmd) * 30,
        vdMedia30: Number(r.vmd) * 30,
        vdMedia90: Number(r.vmd) * 90,
        vdMedia365: Number(r.vmd) * 365,
      });
    }
  }
  return items;
}

/** Última sincronização concluída com sucesso. */
export async function getLastSync(): Promise<ErpSyncInfo | null> {
  const { data } = await supabase
    .from('erp_sync_log')
    .select('finalizado_em, linhas, regra_versao, status')
    .eq('status', 'concluido')
    .order('finalizado_em', { ascending: false })
    .limit(1);
  return (data?.[0] as ErpSyncInfo) ?? null;
}