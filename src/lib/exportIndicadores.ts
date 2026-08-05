import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UNIT_NAMES, type Bloco } from './erpIndicadores';

export interface VisaoExport {
  titulo: string;
  subtitulo: string;
  rotuloBase: string;
  rotuloAtual: string;
  base: { porLoja: Record<string, Bloco>; total: Bloco };
  atual: { porLoja: Record<string, Bloco>; total: Bloco };
}

export interface IndicadorDef {
  chave: keyof Bloco;
  titulo: string;
  formato: 'moeda' | 'numero' | 'perc' | 'decimal';
}

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);

/** Monta as 4 linhas (base, atual, cresc., % cresc.) de um indicador. */
function linhasIndicador(v: VisaoExport, ind: IndicadorDef, lojas: string[]) {
  const val = (d: VisaoExport['base'], loja?: string) =>
    num(loja ? d.porLoja[loja]?.[ind.chave] : d.total[ind.chave]);
  const cols = [...lojas.map((l) => l as string | undefined), undefined];
  const base = cols.map((l) => val(v.base, l));
  const atual = cols.map((l) => val(v.atual, l));
  const cresc = atual.map((a, i) => a - base[i]);
  const perc = atual.map((a, i) => (base[i] !== 0 ? (a - base[i]) / Math.abs(base[i]) : 0));
  return [
    [v.rotuloBase, ...base],
    [v.rotuloAtual, ...atual],
    ['Cresc.', ...cresc],
    ['% Cresc.', ...perc],
  ] as (string | number)[][];
}

function cabecalho(lojas: string[]) {
  return ['Período', ...lojas.map((l) => UNIT_NAMES[l] ?? l), 'Total'];
}

export function exportarExcel(
  visoes: VisaoExport[],
  lojas: string[],
  indicadores: IndicadorDef[],
  mesRotulo: string,
) {
  const wb = XLSX.utils.book_new();
  for (const v of visoes) {
    const linhas: (string | number)[][] = [[v.titulo], [v.subtitulo], []];
    for (const ind of indicadores) {
      linhas.push([ind.titulo]);
      linhas.push(cabecalho(lojas));
      for (const l of linhasIndicador(v, ind, lojas)) linhas.push(l);
      linhas.push([]);
    }
    const ws = XLSX.utils.aoa_to_sheet(linhas);
    ws['!cols'] = [{ wch: 18 }, ...lojas.map(() => ({ wch: 16 })), { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, v.titulo.slice(0, 28).replace(/[\\/*?:[\]]/g, '-'));
  }
  XLSX.writeFile(wb, `Indicadores_${mesRotulo.replace('/', '-')}.xlsx`);
}

export function exportarPdf(
  visoes: VisaoExport[],
  lojas: string[],
  indicadores: IndicadorDef[],
  mesRotulo: string,
  fmt: (valor: number, formato: IndicadorDef['formato']) => string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  let primeira = true;

  for (const v of visoes) {
    if (!primeira) doc.addPage();
    primeira = false;
    doc.setFontSize(14);
    doc.text(`Fechamento de Indicadores — ${v.titulo}`, 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(v.subtitulo, 40, 56);
    doc.setTextColor(0);

    let y = 74;
    for (const ind of indicadores) {
      const body = linhasIndicador(v, ind, lojas).map((linha, i) => [
        String(linha[0]),
        ...linha.slice(1).map((valor) =>
          i === 3 ? `${(Number(valor) * 100).toFixed(1)}%` : fmt(Number(valor), ind.formato),
        ),
      ]);
      autoTable(doc, {
        startY: y,
        head: [[ind.titulo, ...cabecalho(lojas).slice(1)]],
        body,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7 },
        columnStyles: { 0: { cellWidth: 80, halign: 'left' } },
        margin: { left: 40, right: 40 },
        tableWidth: 'auto',
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index > 0) data.cell.styles.halign = 'right';
        },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      if (y > 480) {
        doc.addPage();
        y = 40;
      }
    }
  }

  doc.save(`Indicadores_${mesRotulo.replace('/', '-')}.pdf`);
}
