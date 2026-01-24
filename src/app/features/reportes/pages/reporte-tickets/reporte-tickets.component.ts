// ============================================================================
// Reporte Tickets Component
// ============================================================================
// Página de reporte de tickets con filtros, gráficas y tabla
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
import { TicketService } from 'src/app/core/services/ticket.service';
import {
  ReporteTicketsFilters,
  TicketResumen,
  TicketTendenciaMensual,
  TicketReporteDetalle,
  COLORES_IGAS,
  COLORES_PRIORIDAD,
  COLORES_SEMAFORO,
  ExportConfig,
  Cliente,
  Profile,
  CategoriaServicio,
  PaginationOptions
} from 'src/app/core/models';

import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexPlotOptions,
  ApexLegend,
  ApexResponsive,
  ApexStroke,
  ApexFill
} from 'ng-apexcharts';

@Component({
  selector: 'app-reporte-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgApexchartsModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './reporte-tickets.component.html',
  styleUrls: ['./reporte-tickets.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteTicketsComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private exportService = inject(ExportService);
  private clienteService = inject(ClienteService);
  private userService = inject(UserService);
  private ticketService = inject(TicketService);

  // Exponer Math para uso en templates
  Math = Math;

  // Estado
  loading = signal(false);
  loadingResumen = signal(false);
  loadingTendencia = signal(false);
  loadingDetalle = signal(false);

  // Filtros
  filters = signal<ReporteTicketsFilters>({
    fecha_inicio: this.getDefaultStartDate(),
    fecha_fin: this.getDefaultEndDate()
  });

  // Catálogos para filtros
  clientes = signal<Cliente[]>([]);
  usuarios = signal<Profile[]>([]);
  categorias = signal<CategoriaServicio[]>([]);
  prioridades = ['Crítica', 'Alta', 'Media', 'Baja'];

  // Datos del reporte
  resumen = signal<TicketResumen | null>(null);
  tendencia = signal<TicketTendenciaMensual[]>([]);
  detalle = signal<TicketReporteDetalle[]>([]);

  // Paginación
  pagination = signal<PaginationOptions>({ page: 1, pageSize: 20 });
  totalItems = signal(0);
  totalPages = signal(0);

  // Configuración de gráficas
  chartPrioridad: any = null;
  chartCategoria: any = null;
  chartTendencia: any = null;
  chartSemaforo: any = null;

  // Computed
  cumplimientoSLA = computed(() => {
    const r = this.resumen();
    if (!r) return 0;
    return r.cumplimiento_sla_resolucion_pct ?? 0;
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
    // Clientes
    this.clienteService.getClientes({ estatus_cliente: 'Activo' }, { page: 1, pageSize: 500 }).subscribe({
      next: (response) => this.clientes.set(response.data)
    });

    // Usuarios
    this.userService.getUsers({ estatus: 'Activo' }, { page: 1, pageSize: 200 }).subscribe({
      next: (response) => this.usuarios.set(response.data)
    });

    // Categorías
    this.ticketService.getCategorias().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categorias.set(response.data);
        }
      }
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
    this.reporteService.getTicketsResumen(this.filters()).subscribe({
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
    this.reporteService.getTicketsTendenciaMensual(12, this.filters().cliente_id).subscribe({
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
    this.reporteService.getTicketsDetalle(this.filters(), this.pagination()).subscribe({
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

  updateFilter(key: keyof ReporteTicketsFilters, value: any): void {
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

  private buildCharts(data: TicketResumen): void {
    // Gráfica de prioridad (donut)
    if (data.por_prioridad && data.por_prioridad.length > 0) {
      this.chartPrioridad = {
        series: data.por_prioridad.map(p => p.total),
        chart: { type: 'donut', height: 280 },
        labels: data.por_prioridad.map(p => p.prioridad),
        colors: data.por_prioridad.map(p => COLORES_PRIORIDAD[p.prioridad] || '#6c757d'),
        legend: { position: 'bottom' },
        dataLabels: { enabled: true }
      };
    }

    // Gráfica de categoría (bar horizontal)
    if (data.por_categoria && data.por_categoria.length > 0) {
      const top5 = data.por_categoria.slice(0, 5);
      this.chartCategoria = {
        series: [{ name: 'Tickets', data: top5.map(c => c.total) }],
        chart: { type: 'bar', height: 280, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        xaxis: { categories: top5.map(c => c.categoria) },
        colors: [COLORES_IGAS[0]],
        dataLabels: { enabled: true }
      };
    }

    // Gráfica de semáforo (radialBar)
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

  private buildTendenciaChart(data: TicketTendenciaMensual[]): void {
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
      titulo: 'Reporte de Tickets',
      subtitulo: this.getSubtitulo(),
      fechaGeneracion: new Date().toLocaleString('es-MX'),
      filtrosAplicados: this.getFiltersSummary()
    };

    const columns = [
      { header: 'Folio', key: 'folio' as const },
      { header: 'Título', key: 'titulo' as const },
      { header: 'Fecha', key: 'fecha_creacion' as const, format: (v: string) => this.exportService.formatDate(v) },
      { header: 'Cliente', key: 'cliente_nombre' as const },
      { header: 'Categoría', key: 'categoria_nombre' as const },
      { header: 'Prioridad', key: 'prioridad' as const },
      { header: 'Estatus', key: 'estatus_nombre' as const },
      { header: 'Responsable', key: 'responsable_nombre' as const },
      { header: 'Semáforo', key: 'semaforo' as const },
      { header: 'Hrs Respuesta', key: 'horas_respuesta' as const, format: (v: number) => this.exportService.formatNumber(v, 1) },
      { header: 'Hrs Resolución', key: 'horas_resolucion' as const, format: (v: number) => this.exportService.formatNumber(v, 1) }
    ];

    // Cargar todos los datos para exportar
    this.reporteService.getTicketsDetalle(this.filters(), { page: 1, pageSize: 10000 }).subscribe({
      next: (response) => {
        this.exportService.exportToExcel(response.data, columns, 'reporte_tickets', config);
      }
    });
  }

  exportToPDF(): void {
    const config: ExportConfig = {
      titulo: 'Reporte de Tickets',
      subtitulo: this.getSubtitulo(),
      fechaGeneracion: new Date().toLocaleString('es-MX'),
      filtrosAplicados: this.getFiltersSummary()
    };

    const columns = [
      { header: 'Folio', key: 'folio' as const },
      { header: 'Cliente', key: 'cliente_nombre' as const },
      { header: 'Categoría', key: 'categoria_nombre' as const },
      { header: 'Prioridad', key: 'prioridad' as const },
      { header: 'Estatus', key: 'estatus_nombre' as const },
      { header: 'Semáforo', key: 'semaforo' as const }
    ];

    this.reporteService.getTicketsDetalle(this.filters(), { page: 1, pageSize: 500 }).subscribe({
      next: (response) => {
        this.exportService.exportToPDF(response.data, columns, 'reporte_tickets', config);
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
    if (f.categoria_id) {
      const cat = this.categorias().find(c => c.id === f.categoria_id);
      summary['Categoría'] = cat?.nombre || f.categoria_id;
    }
    if (f.responsable_id) {
      const user = this.usuarios().find(u => u.id === f.responsable_id);
      summary['Responsable'] = user?.nombre_completo || f.responsable_id;
    }
    if (f.prioridad) {
      summary['Prioridad'] = f.prioridad;
    }

    return summary;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  getSemaforoColor(semaforo: string): string {
    return COLORES_SEMAFORO[semaforo] || '#6c757d';
  }

  getPrioridadColor(prioridad: string): string {
    return COLORES_PRIORIDAD[prioridad] || '#6c757d';
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
