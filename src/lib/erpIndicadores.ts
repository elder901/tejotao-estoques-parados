import { supabase } from '@/integrations/supabase/client';

export const UNIT_NAMES: Record<string, string> = {
  '001': 'Loja 01',
  '002': 'Loja 02',
  '003': 'Loja 03',
  '004': 'Loja 04',
  '005': 'Loja 05',
};

export interface IndicadorMes {
  codUnidade: string;
  anoMes: string;
  faturamento: number;
  custo: number;
  itens: number;
  cupons: number;
  dias: number;
}

export async function loadIndicadores(): Promise<IndicadorMes[]> {
  const { data, error } = await supabase
    .from('erp_indicadores_mensal')
    .select('cod_unidade, ano_mes, faturamento, custo, itens, cupons, dias')
    .order('ano_mes', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    codUnidade: r.cod_unidade,
    anoMes: r.ano_mes,
    faturamento: Number(r.faturamento) || 0,
    custo: Number(r.custo) || 0,
    itens: Number(r.itens) || 0,
    cupons: Number(r.cupons) || 0,
    dias: Number(r.dias) || 0,
  }));
}

/** Totais agregados de um conjunto de meses/lojas. */
export interface Bloco {
  faturamento: number;
  margem: number;
  percMc: number;
  itens: number;
  cupons: number;
  dias: number;
  fatDia: number;
  margemDia: number;
  ticketItem: number;
  ticketMedio: number;
}

/** Dias corridos do mês (para o mês em curso, apenas os dias já decorridos). */
function diasCorridos(anoMes: string) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const total = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const hoje = new Date();
  const atual = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, '0')}`;
  if (anoMes === atual) return Math.max(1, hoje.getUTCDate() - 1);
  return total;
}

export function agregar(linhas: IndicadorMes[]): Bloco {
  const faturamento = linhas.reduce((s, l) => s + l.faturamento, 0);
  const custo = linhas.reduce((s, l) => s + l.custo, 0);
  const itens = linhas.reduce((s, l) => s + l.itens, 0);
  const cupons = linhas.reduce((s, l) => s + l.cupons, 0);
  // Dias do período = soma dos dias de cada mês (mês fechado = 1 mês; acumulado = todos os meses).
  // Dentro do mesmo mês, lojas diferentes compartilham o calendário, então usamos o maior valor.
  const meses = [...new Set(linhas.map((l) => l.anoMes))];
  const dias = meses.reduce((s, m) => s + diasCorridos(m), 0);
  const margem = faturamento - custo;
  return {
    faturamento,
    margem,
    percMc: faturamento > 0 ? margem / faturamento : 0,
    itens,
    cupons,
    dias,
    fatDia: dias > 0 ? faturamento / dias : 0,
    margemDia: dias > 0 ? margem / dias : 0,
    ticketItem: itens > 0 ? faturamento / itens : 0,
    ticketMedio: cupons > 0 ? faturamento / cupons : 0,
  };
}

export function rotuloMes(anoMes: string) {
  const [ano, mes] = anoMes.split('-');
  const nomes = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
}

export function mesAnterior(anoMes: string) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function mesmoMesAnoAnterior(anoMes: string) {
  const [ano, mes] = anoMes.split('-');
  return `${Number(ano) - 1}-${mes}`;
}
