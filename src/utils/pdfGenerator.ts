import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Suporte } from '../types';

interface ExportFilters {
  dateStart?: string;
  dateEnd?: string;
  cliente?: string;
  tipo?: string;
  status?: string;
}

export function generateSuportesPDF(suportes: Suporte[], filters: ExportFilters) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('Relatório de Suportes', 14, 20);

  doc.setFontSize(10);
  let yPos = 30;

  if (filters.dateStart || filters.dateEnd) {
    doc.text(
      `Período: ${filters.dateStart ? new Date(filters.dateStart).toLocaleDateString('pt-BR') : 'Início'} até ${filters.dateEnd ? new Date(filters.dateEnd).toLocaleDateString('pt-BR') : 'Hoje'}`,
      14,
      yPos
    );
    yPos += 6;
  }

  if (filters.cliente) {
    doc.text(`Cliente: ${filters.cliente}`, 14, yPos);
    yPos += 6;
  }

  if (filters.tipo) {
    doc.text(`Tipo: ${filters.tipo}`, 14, yPos);
    yPos += 6;
  }

  if (filters.status) {
    doc.text(`Status: ${filters.status}`, 14, yPos);
    yPos += 6;
  }

  doc.text(`Total de registros: ${suportes.length}`, 14, yPos);
  yPos += 10;

  const tableData = suportes.map(suporte => [
    new Date(suporte.data_suporte).toLocaleDateString('pt-BR'),
    suporte.cliente_nome || '-',
    suporte.tipo || '-',
    suporte.tecnico || '-',
    getStatusLabel(suporte.status),
    truncateText(suporte.descricao, 40)
  ]);

  autoTable(doc, {
    head: [['Data', 'Cliente', 'Tipo', 'Técnico', 'Status', 'Descrição']],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [245, 247, 250] }
  });

  const fileName = `relatorio-suportes-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'aberto': return 'Aberto';
    case 'em_andamento': return 'Em Andamento';
    case 'resolvido': return 'Resolvido';
    case 'fechado': return 'Fechado';
    default: return status;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
