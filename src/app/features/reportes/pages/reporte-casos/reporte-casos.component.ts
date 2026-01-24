// ============================================================================
// Reporte Casos Component
// ============================================================================
// Página de reporte de casos con filtros, gráficas y tabla
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { ReporteService } from 'src/app/core/services/reporte.service';
import { ExportService } from 'src/app/core/services/export.service';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { UserService } from 'src/app/core/services/user.service';
import {
  ReporteCasosFilters,
  CasoResumen,
  CasoTendenciaMensual,
  CasoReporteDetalle,
  COLORES_IGAS,
  COLORES_SEMAFORO,
  COLORES_AREA,
  ExportConfig,
  Cliente,
  Profile,
  PaginationOptions
} from 'src/app/core/models';

@Component({
  selector: 'app-reporte-casos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgApexchartsModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './reporte-casos.component.html',
  styleUrls: ['./reporte-casos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteCasosComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private exportService = inject(ExportService);
  private clienteService = inject(ClienteService);
  private userService = inject(UserService);

  // Exponer Math para uso en templates
  Math = Math;

  // Estado
  loading = signal(false);
  loadingResumen = signal(false);
  loadingTendencia = signal(false);
  loadingDetalle = signal(false);

  // Filtros
  filters = signal<ReporteCasosFilters>({
    fecha_inicio: this.getDefaultStartDate(),
    fecha_fin: this.getDefaultEndDate()
  });

  // Catálogos
  clientes = signal<Cliente[]>([]);
  usuarios = signal<Profile[]>([]);
  areas = ['Desarrollo', 'Calidad', 'Soporte', 'Infraestructura', 'Comercial'];
  motivos = ['Mejora', 'Error', 'Cambio de alcance', 'Solicitud nueva', 'Soporte'];

  // Datos
  resumen = signal<CasoResumen | null>(null);
  tendencia = signal<CasoTendenciaMensual[]>([]);
  detalle = signal<CasoReporteDetalle[]>([]);

  // Paginación
  pagination = signal<PaginationOptions>({ page: 1, pageSize: 20 });
  totalItems = signal(0);
  totalPages = signal(0);

  // Gráficas
  chartArea: any = null;
  chartMotivo: any = null;
  chartTendencia: any = null;
  chartSemaforo: any = null;

  // Computed
  cumplimientoCompromiso = computed(() => {
    const r = this.resumen();
    if (!r) return 0;
    return r.cumplimiento_compromiso_pct ?? 0;
  });

  ngOnInit(): void {
    this.loadCatalogos();
    this.loadReporte();
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ============================================================================
  // CARGAR CATÁLOGOS
  // ============================================================================

  private loadCatalogos(): void {
    this.clienteService.getClientes({ estatus_cliente: 'Activo' }, { page: 1, pageSize: 500 }).subscribe({
      next: (response) => this.clientes.set(response.data)
    });

    this.userService.getUsers({ estatus: 'Activo' }, { page: 1, pageSize: 200 }).subscribe({
      next: (response) => this.usuarios.set(response.data)
    });
  }

  // ============================================================================
  // CARGAR REPORTE
  // ============================================================================

  loadReporte(): void {
    this.loading.set(true);
    this.loadResumen();
    this.loadTendencia();
    this.loadDetalle();
  }

  private loadResumen(): void {
    this.loadingResumen.set(true);
    this.reporteService.getCasosResumen(this.filters()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.resumen.set(response.data);
          this.buildCharts(response.data);
        }
        this.loadingResumen.set(false);
        this.checkLoadingComplete();
      },
      error: () => {
        this.loadingResumen.set(false);
        this.checkLoadingComplete();
      }
    });
  }

  private loadTendencia(): void {
    this.loadingTendencia.set(true);
    this.reporteService.getCasosTendenciaMensual(12, this.filters().cliente_id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tendencia.set(response.data);
          this.buildTendenciaChart(response.data);
        }
        this.loadingTendencia.set(false);
        this.checkLoadingComplete();
      },
      error: () => {
        this.loadingTendencia.set(false);
        this.checkLoadingComplete();
      }
    });
  }

  private loadDetalle(): void {
    this.loadingDetalle.set(true);
    this.reporteService.getCasosDetalle(this.filters(), this.pagination()).subscribe({
      next: (response) => {
        this.detalle.set(response.data);
        this.totalItems.set(response.total);
        this.totalPages.set(response.totalPages);
        this.loadingDetalle.set(false);
        this.checkLoadingComplete();
      },
      error: () => {
        this.loadingDetalle.set(false);
        this.checkLoadingComplete();
      }
    });
  }

  private checkLoadingComplete(): void {
    if (!this.loadingResumen() && !this.loadingTendencia() && !this.loadingDetalle()) {
      this.loading.set(false);
    }
  }

  // ============================================================================
  // FILTROS
  // ============================================================================

  updateFilter(key: keyof ReporteCasosFilters, value: any): void {
    this.filters.update(f => ({ ...f, [key]: value || undefined }));
  }

  applyFilters(): void {
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.loadReporte();
  }

  clearFilters(): void {
    this.filters.set({
      fecha_inicio: this.getDefaultStartDate(),
      fecha_fin: this.getDefaultEndDate()
    });
    this.applyFilters();
  }

  // ============================================================================
  // PAGINACIÓN
  // ============================================================================

  onPageChange(page: number): void {
    this.pagination.update(p => ({ ...p, page }));
    this.loadDetalle();
  }

  // ============================================================================
  // CONSTRUIR GRÁFICAS
  // ============================================================================

  private buildCharts(data: CasoResumen): void {
    // Gráfica por área (donut)
    if (data.por_area && data.por_area.length > 0) {
      this.chartArea = {
        series: data.por_area.map(a => a.total),
        chart: { type: 'donut', height: 280 },
        labels: data.por_area.map(a => a.area),
        colors: data.por_area.map(a => COLORES_AREA[a.area] || COLORES_IGAS[data.por_area.indexOf(a) % COLORES_IGAS.length]),
        legend: { position: 'bottom' },
        dataLabels: { enabled: true }
      };
    }

    // Gráfica por motivo (bar)
    if (data.por_motivo && data.por_motivo.length > 0) {
      const top5 = data.por_motivo.slice(0, 5);
      this.chartMotivo = {
        series: [{ name: 'Casos', data: top5.map(m => m.total) }],
        chart: { type: 'bar', height: 280, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        xaxis: { categories: top5.map(m => m.motivo) },
        colors: [COLORES_IGAS[2]],
        dataLabels: { enabled: true }
      };
    }

    // Gráfica de semáforo
    this.chartSemaforo = {
      series: [
        Math.round((data.semaforo_verde / (data.total || 1)) * 100),
        Math.round((data.semaforo_amarillo / (data.total || 1)) * 100),
        Math.round((data.semaforo_rojo / (data.total || 1)) * 100)
      ],
      chart: { type: 'radialBar', height: 280 },
      plotOptions: {
        radialBar: {
          dataLabels: {
            name: { fontSize: '14px' },
            value: { fontSize: '16px' },
            total: {
              show: true,
              label: 'Total',
              formatter: () => String(data.total)
            }
          }
        }
      },
      labels: ['Verde', 'Amarillo', 'Rojo'],
      colors: [COLORES_SEMAFORO['verde'], COLORES_SEMAFORO['amarillo'], COLORES_SEMAFORO['rojo']]
    };
  }

  private buildTendenciaChart(data: CasoTendenciaMensual[]): void {
    if (data.length === 0) return;

    this.chartTendencia = {
      series: [
        { name: 'Total', data: data.map(d => d.total) },
        { name: 'Cerrados', data: data.map(d => d.cerrados) },
        { name: 'Abiertos', data: data.map(d => d.abiertos) }
      ],
      chart: { type: 'area', height: 300, toolbar: { show: false } },
      xaxis: { categories: data.map(d => d.periodo_mes) },
      colors: [COLORES_IGAS[2], COLORES_IGAS[1], COLORES_IGAS[3]],
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
      dataLabels: { enabled: false },
      legend: { position: 'top' }
    };
  }

  // ============================================================================
  // EXPORTACIÓN
  // ============================================================================

  exportToExcel(): void {
    const config: ExportConfig = {
      titulo: 'Reporte de Casos',
      subtitulo: this.getSubtitulo(),
      fechaGeneracion: new Date().toLocaleString('es-MX'),
      filtrosAplicados: this.getFiltersSummary()
    };

    const columns = [
      { header: 'Folio', key: 'folio' as const },
      { header: 'Descripción', key: 'descripcion' as const },
      { header: 'Fecha', key: 'fecha_creacion' as const, format: (v: string) => this.exportService.formatDate(v) },
      { header: 'Compromiso', key: 'fecha_compromiso' as const, format: (v: string) => this.exportService.formatDate(v) },
      { header: 'Cliente', key: 'cliente_nombre' as const },
      { header: 'Área', key: 'area_destino' as const },
      { header: 'Motivo', key: 'motivo' as const },
      { header: 'Estatus', key: 'estatus_nombre' as const },
      { header: 'Responsable', key: 'responsable_nombre' as const },
      { header: 'Semáforo', key: 'semaforo' as const },
      { header: 'Hrs Resolución', key: 'horas_resolucion' as const, format: (v: number) => this.exportService.formatNumber(v, 1) }
    ];

    this.reporteService.getCasosDetalle(this.filters(), { page: 1, pageSize: 10000 }).subscribe({
      next: (response) => {
        this.exportService.exportToExcel(response.data, columns, 'reporte_casos', config);
      }
    });
  }

  exportToPDF(): void {
    const config: ExportConfig = {
      titulo: 'Reporte de Casos',
      subtitulo: this.getSubtitulo(),
      fechaGeneracion: new Date().toLocaleString('es-MX'),
      filtrosAplicados: this.getFiltersSummary()
    };

    const columns = [
      { header: 'Folio', key: 'folio' as const },
      { header: 'Cliente', key: 'cliente_nombre' as const },
      { header: 'Área', key: 'area_destino' as const },
      { header: 'Motivo', key: 'motivo' as const },
      { header: 'Estatus', key: 'estatus_nombre' as const },
      { header: 'Semáforo', key: 'semaforo' as const }
    ];

    this.reporteService.getCasosDetalle(this.filters(), { page: 1, pageSize: 500 }).subscribe({
      next: (response) => {
        this.exportService.exportToPDF(response.data, columns, 'reporte_casos', config);
      }
    });
  }

  private getSubtitulo(): string {
    const f = this.filters();
    if (f.fecha_inicio && f.fecha_fin) {
      return `Período: ${this.exportService.formatDate(f.fecha_inicio)} - ${this.exportService.formatDate(f.fecha_fin)}`;
    }
    return '';
  }

  private getFiltersSummary(): Record<string, string> {
    const f = this.filters();
    const summary: Record<string, string> = {};

    if (f.cliente_id) {
      const cliente = this.clientes().find(c => c.id === f.cliente_id);
      summary['Cliente'] = cliente?.nombre_comercial || f.cliente_id;
    }
    if (f.area_destino) {
      summary['Área'] = f.area_destino;
    }
    if (f.responsable_id) {
      const user = this.usuarios().find(u => u.id === f.responsable_id);
      summary['Responsable'] = user?.nombre_completo || f.responsable_id;
    }
    if (f.motivo) {
      summary['Motivo'] = f.motivo;
    }

    return summary;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  getSemaforoColor(semaforo: string): string {
    return COLORES_SEMAFORO[semaforo] || '#6c757d';
  }

  getAreaColor(area: string): string {
    return COLORES_AREA[area] || '#6c757d';
  }

  formatDate(date: string | null | undefined): string {
    return this.exportService.formatDate(date);
  }

  formatHours(hours: number | null | undefined): string {
    return this.exportService.formatHours(hours);
  }

  formatPercent(value: number | null | undefined): string {
    return this.exportService.formatPercent(value);
  }
}
