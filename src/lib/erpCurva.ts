import { supabase } from '@/integrations/supabase/client';

export const CURVAS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'] as const;
export type Curva = (typeof CURVAS)[number];

/** Faixas do modelo oficial: % acumulado de venda dentro do departamento. */
export const FAIXAS: Record<Curva, string> = {
  A1: 'até 25%',
  A2: 'até 45%',
  A3: 'até 50%',
  B1: 'até 70%',
  B2: 'até 85%',
  B3: 'até 90%',
  C1: 'até 95%',
  C2: 'até 98%',
  C3: 'até 100%',
};

export interface CurvaItem {
  codUnidade: string;
  codItem: string;
  descricao: string;
  codDepartamento: string;
  departamento: string;
  fornecedor: string;
  valorVenda: number;
  quantidadeVenda: number;
  participacao: number;
  participacaoAcumulada: number;
  curva: Curva;
  posicao: number;
  diasPeriodo: number;
  dataReferencia: string;
}

export interface ResumoCurva {
  curva: string;
  itens: number;
  valor: number;
}

export interface ResumoDepartamento {
  departamento: string;
  itens: number;
  valor: number;
}

export interface FiltroCurva {
  unidade: string;
  departamento?: string | null;
  curva?: string | null;
  busca?: string;
  limite?: number;
}

function mapear(r: Record<string, unknown>): CurvaItem {
  return {
    codUnidade: String(r.cod_unidade),
    codItem: String(r.cod_item),
    descricao: String(r.descricao ?? ''),
    codDepartamento: String(r.cod_departamento ?? ''),
    departamento: String(r.departamento ?? ''),
    fornecedor: String(r.fornecedor ?? ''),
    valorVenda: Number(r.valor_venda) || 0,
    quantidadeVenda: Number(r.quantidade_venda) || 0,
    participacao: Number(r.participacao) || 0,
    participacaoAcumulada: Number(r.participacao_acumulada) || 0,
    curva: String(r.curva) as Curva,
    posicao: Number(r.posicao) || 0,
    diasPeriodo: Number(r.dias_periodo) || 90,
    dataReferencia: String(r.data_referencia ?? ''),
  };
}

export async function loadCurva(filtro: FiltroCurva): Promise<CurvaItem[]> {
  let q = supabase
    .from('erp_curva_abc')
    .select('cod_unidade, cod_item, descricao, cod_departamento, departamento, fornecedor, valor_venda, quantidade_venda, participacao, participacao_acumulada, curva, posicao, dias_periodo, data_referencia')
    .eq('cod_unidade', filtro.unidade)
    .order('valor_venda', { ascending: false })
    .limit(filtro.limite ?? 500);

  if (filtro.departamento) q = q.eq('departamento', filtro.departamento);
  if (filtro.curva) q = q.eq('curva', filtro.curva);
  if (filtro.busca) {
    const termo = filtro.busca.replace(/[%,]/g, ' ').trim();
    if (termo) q = q.or(`descricao.ilike.%${termo}%,cod_item.ilike.%${termo}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapear);
}

export async function loadResumoCurva(unidade: string, departamento?: string | null): Promise<ResumoCurva[]> {
  const { data, error } = await supabase.rpc('curva_abc_resumo', {
    p_unidade: unidade,
    p_departamento: departamento ?? null,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    curva: String(r.curva),
    itens: Number(r.itens) || 0,
    valor: Number(r.valor) || 0,
  }));
}

export async function loadDepartamentosCurva(unidade: string): Promise<ResumoDepartamento[]> {
  const { data, error } = await supabase.rpc('curva_abc_departamentos', { p_unidade: unidade });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    departamento: String(r.departamento),
    itens: Number(r.itens) || 0,
    valor: Number(r.valor) || 0,
  }));
}

export async function loadUnidadesCurva(): Promise<string[]> {
  const { data, error } = await supabase
    .from('erp_curva_abc')
    .select('cod_unidade')
    .neq('cod_unidade', 'REDE')
    .limit(5000);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => String(r.cod_unidade)))].sort();
}

/** Mapa item -> curva da visão rede, usado pela tela de Ruptura. */
export async function loadCurvaPorItem(unidade = 'REDE'): Promise<Map<string, Curva>> {
  const PAGE = 1000;
  const mapa = new Map<string, Curva>();
  for (let pagina = 0; pagina < 60; pagina++) {
    const { data, error } = await supabase
      .from('erp_curva_abc')
      .select('cod_item, curva')
      .eq('cod_unidade', unidade)
      .range(pagina * PAGE, pagina * PAGE + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) mapa.set(String(r.cod_item), String(r.curva) as Curva);
    if (!data || data.length < PAGE) break;
  }
  return mapa;
}