// ============================================================================
// Caso Dashboard Component
// ============================================================================
// Dashboard principal de casos con widgets, gráficas y alertas
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { CasoService } from 'src/app/core/services/caso.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CasoStats, CasoConSLA, AREAS_DESTINO } from 'src/app/core/models';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexLegend,
  ApexFill,
  ApexTooltip,
  ApexPlotOptions,
  ApexNonAxisChartSeries,
  ApexResponsive
} from 'ng-apexcharts';
import { environment } from '../../../../../environments/environment';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  legend?: ApexLegend;
  fill?: ApexFill;
  tooltip?: ApexTooltip;
  plotOptions?: ApexPlotOptions;
  labels?: string[];
  colors?: string[];
  responsive?: ApexResponsive[];
};

@Component({
  selector: 'app-caso-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgbTooltipModule,
    NgApexchartsModule,
    SharedModule
  ],
  templateUrl: './caso-dashboard.component.html',
  styleUrls: ['./caso-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CasoDashboardComponent implements OnInit {
  private casoService = inject(CasoService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  loading = signal(true);
  stats = signal<CasoStats | null>(null);
  alertas = signal<CasoConSLA[]>([]);
  casosAntiguos = signal<CasoConSLA[]>([]);

  // Gráficas
  areaChartOptions = signal<ChartOptions | null>(null);
  semaforoChartOptions = signal<ChartOptions | null>(null);

  // Computed
  hasAlertas = computed(() => this.alertas().length > 0);

  // Constantes
  areasDestino = AREAS_DESTINO;

  // Helper para usar Math en template
  Math = Math;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadDashboardData();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  async loadDashboardData(): Promise<void> {
    this.loading.set(true);

    try {
      // Cargar estadísticas
      const stats = await this.casoService.getCasoStats();
      this.stats.set(stats);

      // Construir gráficas
      this.buildAreaChart(stats);
      this.buildSemaforoChart(stats);

      // Cargar alertas (casos en rojo/amarillo o con compromiso vencido)
      this.casoService.getCasosAlertas(10).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.alertas.set(response.data);
          }
        }
      });

      // Cargar casos más antiguos
      this.casoService.getCasosMasAntiguos(5).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.casosAntiguos.set(response.data);
          }
        }
      });

    } catch (error) {
      if (!environment.production) { console.error('Error loading dashboard:', error); }
      this.notificationService.error('Error al cargar el dashboard');
    } finally {
      this.loading.set(false);
    }
  }

  // ============================================================================
  // Gráficas
  // ============================================================================

  private buildAreaChart(stats: CasoStats): void {
    const areas = this.areasDestino.map(a => ({
      name: a.label,
      value: stats.total_por_area[a.value] || 0,
      color: a.color
    })).filter(a => a.value > 0);

    if (areas.length === 0) {
      return;
    }

    this.areaChartOptions.set({
      series: areas.map(a => a.value),
      chart: {
        type: 'donut',
        height: 280,
        fontFamily: 'inherit'
      },
      labels: areas.map(a => a.name),
      colors: areas.map(a => a.color),
      legend: {
        position: 'bottom',
        fontSize: '12px'
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(0)}%`
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                fontSize: '14px',
                fontWeight: 600
              }
            }
          }
        }
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: { height: 250 },
          legend: { position: 'bottom' }
        }
      }]
    });
  }

  private buildSemaforoChart(stats: CasoStats): void {
    const data = stats.total_por_semaforo;
    const total = data.verde + data.amarillo + data.rojo;

    if (total === 0) {
      return;
    }

    this.semaforoChartOptions.set({
      series: [{
        name: 'Casos',
        data: [data.verde, data.amarillo, data.rojo]
      }],
      chart: {
        type: 'bar',
        height: 200,
        fontFamily: 'inherit',
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          borderRadius: 4,
          dataLabels: { position: 'center' }
        }
      },
      colors: ['#4CAF50', '#FFC107', '#F44336'],
      xaxis: {
        categories: ['En tiempo', 'Por vencer', 'Vencidos']
      },
      dataLabels: {
        enabled: true,
        style: { colors: ['#fff'] }
      },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} casos`
        }
      }
    });
  }

  // ============================================================================
  // Navegación
  // ============================================================================

  navigateToCaso(casoId: string): void {
    this.router.navigate(['/casos', casoId]);
  }

  navigateToList(filter?: string): void {
    if (filter) {
      this.router.navigate(['/casos/lista'], { queryParams: { filter } });
    } else {
      this.router.navigate(['/casos/lista']);
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  getAreaColor(area: string): string {
    const found = this.areasDestino.find(a => a.value === area);
    return found?.color || '#6c757d';
  }

  getAreaLabel(area: string): string {
    const found = this.areasDestino.find(a => a.value === area);
    return found?.label || area;
  }

  getSemaforoClass(semaforo: string): string {
    const classes: Record<string, string> = {
      'verde': 'bg-success',
      'amarillo': 'bg-warning',
      'rojo': 'bg-danger',
      'azul': 'bg-info',
      'gris': 'bg-secondary'
    };
    return classes[semaforo] || 'bg-secondary';
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  }
}
