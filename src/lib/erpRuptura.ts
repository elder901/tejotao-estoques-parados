import { supabase } from '@/integrations/supabase/client';

export interface RupturaItem {
  codUnidade: string;
  nomeUnidade: string;
  codItem: string;
  descricao: string;
  departamento: string;
  fornecedor: string;
  quantidadeEstoque: number;
  custoMedio: number;
  precoVenda: number;
  vendasPeriodo: number;
  diasPeriodo: number;
  vmd: number;
  perdaDia: number;
}

const UNIT_NAMES: Record<string, string> = {
  '001': 'Mato Grosso',
  '002': 'Melo Viana',
  '003': 'Amazonas',
};

const PAGE = 1000;
const MAX_ITENS = 8000;

export interface RupturaTotal {
  codUnidade: string;
  itensAtivos: number;
  itensZerados: number;
  itensNegativos: number;
}

/** Total de itens ativos (não bloqueados) por loja — base do % de ruptura. */
export async function loadTotaisAtivos(): Promise<RupturaTotal[]> {
  const { data, error } = await supabase
    .from('erp_ruptura_totais')
    .select('cod_unidade, itens_ativos, itens_zerados, itens_negativos');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    codUnidade: r.cod_unidade,
    itensAtivos: Number(r.itens_ativos) || 0,
    itensZerados: Number(r.itens_zerados) || 0,
    itensNegativos: Number(r.itens_negativos) || 0,
  }));
}

/** Itens em ruptura: estoque zerado e produto NÃO bloqueado (ou seja, vendemos). */
export async function loadRuptura(): Promise<RupturaItem[]> {
  const paginas = Array.from({ length: MAX_ITENS / PAGE }, (_, page) =>
    supabase
      .from('erp_ruptura_snapshot')
      .select('cod_unidade, cod_item, descricao, departamento, fornecedor, quantidade_estoque, custo_medio, preco_venda, vendas_periodo, dias_periodo, vmd, perda_dia')
      .order('perda_dia', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1),
  );
  const resultados = await Promise.all(paginas);
  const items: RupturaItem[] = [];
  for (const { data, error } of resultados) {
    if (error) throw error;
    for (const r of data ?? []) {
      items.push({
        codUnidade: r.cod_unidade,
        nomeUnidade: UNIT_NAMES[r.cod_unidade] ?? `Unidade ${r.cod_unidade}`,
        codItem: r.cod_item,
        descricao: r.descricao ?? '',
        departamento: r.departamento || 'Sem departamento',
        fornecedor: r.fornecedor || 'Sem fornecedor',
        quantidadeEstoque: Number(r.quantidade_estoque) || 0,
        custoMedio: Number(r.custo_medio) || 0,
        precoVenda: Number(r.preco_venda) || 0,
        vendasPeriodo: Number(r.vendas_periodo) || 0,
        diasPeriodo: r.dias_periodo || 90,
        vmd: Number(r.vmd) || 0,
        perdaDia: Number(r.perda_dia) || 0,
      });
    }
  }
  return items;
}
