// ============================================================================
// Export Service
// ============================================================================
// Servicio para exportación de reportes a PDF y Excel
// ============================================================================
// NOTA: Para funcionalidad completa instalar:
//   npm install jspdf jspdf-autotable xlsx file-saver
//   npm install -D @types/file-saver
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { ExportConfig } from '../models';

// Tipos para las librerías (cuando estén instaladas)
declare const jsPDF: any;
declare const XLSX: any;

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  // ============================================================================
  // EXPORTAR A EXCEL (CSV como fallback, XLSX si está disponible)
  // ============================================================================

  /**
   * Exporta datos a Excel/CSV
   */
  exportToExcel<T extends Record<string, any>>(
    data: T[],
    columns: { header: string; key: keyof T; format?: (val: any) => string }[],
    filename: string,
    config?: ExportConfig
  ): void {
    // Intentar usar xlsx si está disponible
    if (typeof XLSX !== 'undefined') {
      this.exportWithXLSX(data, columns, filename, config);
    } else {
      // Fallback a CSV
      this.exportToCSV(data, columns, filename);
    }
  }

  private exportWithXLSX<T extends Record<string, any>>(
    data: T[],
    columns: { header: string; key: keyof T; format?: (val: any) => string }[],
    filename: string,
    config?: ExportConfig
  ): void {
    try {
      // Preparar datos con headers
      const headers = columns.map(c => c.header);
      const rows = data.map(row =>
        columns.map(col => {
          const value = row[col.key];
          return col.format ? col.format(value) : (value ?? '');
        })
      );

      // Agregar información del reporte al inicio
      const reportInfo: string[][] = [];
      if (config) {
        reportInfo.push([config.titulo]);
        if (config.subtitulo) reportInfo.push([config.subtitulo]);
        reportInfo.push([`Generado: ${config.fechaGeneracion}`]);
        if (config.filtrosAplicados) {
          const filtros = Object.entries(config.filtrosAplicados)
            .filter(([_, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ');
          if (filtros) reportInfo.push([`Filtros: ${filtros}`]);
        }
        reportInfo.push([]); // Línea vacía
      }

      const worksheetData = [...reportInfo, headers, ...rows];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

      // Ajustar anchos de columna
      const colWidths = columns.map(col => ({
        wch: Math.max(col.header.length, 15)
      }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      // Fallback a CSV
      this.exportToCSV(data, columns, filename);
    }
  }

  /**
   * Exporta a CSV (funciona sin dependencias externas)
   */
  exportToCSV<T extends Record<string, any>>(
    data: T[],
    columns: { header: string; key: keyof T; format?: (val: any) => string }[],
    filename: string
  ): void {
    // Headers
    const headers = columns.map(c => `"${c.header}"`).join(',');

    // Rows
    const rows = data.map(row =>
      columns.map(col => {
        const rawValue = row[col.key];
        const formattedValue = col.format ? col.format(rawValue) : rawValue;
        // Escapar comillas y envolver en comillas
        const strValue = String(formattedValue ?? '').replace(/"/g, '""');
        return `"${strValue}"`;
      }).join(',')
    ).join('\n');

    const csvContent = `${headers}\n${rows}`;

    // Crear y descargar archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.csv`);
  }

  // ============================================================================
  // EXPORTAR A PDF
  // ============================================================================

  /**
   * Exporta datos a PDF
   */
  exportToPDF<T extends Record<string, any>>(
    data: T[],
    columns: { header: string; key: keyof T; format?: (val: any) => string }[],
    filename: string,
    config?: ExportConfig
  ): void {
    // Verificar si jsPDF está disponible
    if (typeof jsPDF === 'undefined') {
      console.warn('jsPDF no está instalado. Exportando como tabla HTML...');
      this.exportToPrintableHTML(data, columns, filename, config);
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');

      // Título y metadata
      let yPos = 15;

      // Logo placeholder (si se tiene base64 del logo)
      // doc.addImage(logoBase64, 'PNG', 10, 10, 30, 15);

      // Título
      doc.setFontSize(18);
      doc.setTextColor(62, 62, 62); // #3E3E3E - gris iGAS
      doc.text(config?.titulo || 'Reporte', 14, yPos);
      yPos += 8;

      // Subtítulo
      if (config?.subtitulo) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(config.subtitulo, 14, yPos);
        yPos += 6;
      }

      // Fecha de generación
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generado: ${config?.fechaGeneracion || new Date().toLocaleString('es-MX')}`, 14, yPos);
      yPos += 4;

      // Filtros aplicados
      if (config?.filtrosAplicados) {
        const filtros = Object.entries(config.filtrosAplicados)
          .filter(([_, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');
        if (filtros) {
          doc.text(`Filtros: ${filtros}`, 14, yPos);
          yPos += 4;
        }
      }

      yPos += 5;

      // Tabla con autotable
      const headers = columns.map(c => c.header);
      const rows = data.map(row =>
        columns.map(col => {
          const value = row[col.key];
          return col.format ? col.format(value) : String(value ?? '');
        })
      );

      // @ts-ignore - autoTable es un plugin
      doc.autoTable({
        head: [headers],
        body: rows,
        startY: yPos,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [249, 176, 0], // Amarillo iGAS
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: 14, right: 14 }
      });

      // Pie de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${pageCount} | iGAS Control Volumétrico`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      this.exportToPrintableHTML(data, columns, filename, config);
    }
  }

  /**
   * Exporta a HTML imprimible (fallback para PDF)
   */
  private exportToPrintableHTML<T extends Record<string, any>>(
    data: T[],
    columns: { header: string; key: keyof T; format?: (val: any) => string }[],
    filename: string,
    config?: ExportConfig
  ): void {
    const headers = columns.map(c => `<th style="background:#F9B000;color:white;padding:8px;text-align:left;">${c.header}</th>`).join('');
    const rows = data.map((row, idx) =>
      `<tr style="background:${idx % 2 === 0 ? '#fff' : '#f8f9fa'}">
        ${columns.map(col => {
          const value = row[col.key];
          const formatted = col.format ? col.format(value) : String(value ?? '');
          return `<td style="padding:6px;border-bottom:1px solid #ddd;">${formatted}</td>`;
        }).join('')}
      </tr>`
    ).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${config?.titulo || 'Reporte'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #3E3E3E; margin-bottom: 5px; }
          h2 { color: #666; font-size: 14px; margin-top: 0; }
          .meta { color: #888; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <h1>${config?.titulo || 'Reporte'}</h1>
        ${config?.subtitulo ? `<h2>${config.subtitulo}</h2>` : ''}
        <div class="meta">
          Generado: ${config?.fechaGeneracion || new Date().toLocaleString('es-MX')}
          ${config?.filtrosAplicados ? '<br>Filtros: ' + Object.entries(config.filtrosAplicados).filter(([_, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' | ') : ''}
        </div>
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.print();</script>
      </body>
      </html>
    `;

    // Abrir en nueva ventana para imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Formatea una fecha para mostrar en reportes
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Formatea fecha y hora
   */
  formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatea números
   */
  formatNumber(value: number | null | undefined, decimals: number = 0): string {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Formatea porcentajes
   */
  formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1)}%`;
  }

  /**
   * Formatea horas
   */
  formatHours(hours: number | null | undefined): string {
    if (hours === null || hours === undefined) return '-';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(1)} hrs`;
  }

  /**
   * Formatea booleano a Sí/No
   */
  formatBoolean(value: boolean | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return value ? 'Sí' : 'No';
  }
}
