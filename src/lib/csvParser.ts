export interface StockItem {
  diasEstoque: number;
  grupo: string;
  produto: string;
  codItem: string;
  descricao: string;
  departamento: string;
  codUnidade: string;
  nomeUnidade: string;
  fornecedor: string;
  quantidadeEstoque: number;
  vendasQuantidade: number;
  diasPeriodo: number;
  qtdCompras: number;
  estoqueCustoMedio: number;
  vendasCustoMedio: number;
  giro: number;
  diasEstoqueCalc: number;
  vdMediaMesAtual: number;
  vdMedia30: number;
  vdMedia90: number;
  vdMedia365: number;
}

const UNIT_NAMES: Record<string, string> = {
  '001': 'Mato Grosso',
  '002': 'Melo Viana',
  '003': 'Amazonas',
};

function parseNumber(val: string): number {
  if (!val || val.trim() === '') return 0;
  const cleaned = val.trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseLine(line: string, unitCode: string): StockItem | null {
  const cols = line.split('\t');
  if (cols.length < 20) return null;

  const diasEstoque = parseNumber(cols[0]);
  const grupo = cols[1]?.trim() || '';
  const descricao = cols[4]?.trim() || '';
  
  if (!grupo || !descricao) return null;

  return {
    diasEstoque,
    grupo,
    produto: cols[2]?.trim() || '',
    codItem: cols[3]?.trim() || '',
    descricao,
    departamento: cols[5]?.trim() || '',
    codUnidade: unitCode,
    nomeUnidade: UNIT_NAMES[unitCode] || unitCode,
    fornecedor: cols[7]?.trim() || '',
    quantidadeEstoque: parseNumber(cols[8]),
    vendasQuantidade: parseNumber(cols[9]),
    diasPeriodo: parseNumber(cols[10]),
    qtdCompras: parseNumber(cols[11]),
    estoqueCustoMedio: parseNumber(cols[12]),
    vendasCustoMedio: parseNumber(cols[13]),
    giro: parseNumber(cols[14]),
    diasEstoqueCalc: parseNumber(cols[15]),
    vdMediaMesAtual: parseNumber(cols[16]),
    vdMedia30: parseNumber(cols[17]),
    vdMedia90: parseNumber(cols[18]),
    vdMedia365: parseNumber(cols[19]),
  };
}

export async function loadStoreData(file: string, unitCode: string): Promise<StockItem[]> {
  const response = await fetch(`/data/${file}`);
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('windows-1252');
  const text = decoder.decode(buffer);
  const lines = text.split('\n');
  const items: StockItem[] = [];

  // skip header lines (first ~8 lines)
  for (let i = 8; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const item = parseLine(line, unitCode);
    if (item && item.quantidadeEstoque > 0) {
      items.push(item);
    }
  }

  return items;
}

export async function loadAllData(): Promise<StockItem[]> {
  const [store1, store2, store3] = await Promise.all([
    loadStoreData('Gloja1F.csv', '001'),
    loadStoreData('Gloja2F.csv', '002'),
    loadStoreData('Gloja3F.csv', '003'),
  ]);
  return [...store1, ...store2, ...store3];
}

export function getUniqueDepartments(items: StockItem[]): string[] {
  return [...new Set(items.map(i => i.departamento))].filter(Boolean).sort();
}

export function getUniqueSuppliers(items: StockItem[]): string[] {
  return [...new Set(items.map(i => i.fornecedor))].filter(Boolean).sort();
}

export function getUniqueUnits(items: StockItem[]): { code: string; name: string }[] {
  const map = new Map<string, string>();
  items.forEach(i => map.set(i.codUnidade, i.nomeUnidade));
  return Array.from(map.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}
