// ============================================================================
// Ticket Dashboard Component
// ============================================================================
// Dashboard principal de tickets con widgets, gráficas y alertas
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgApexchartsModule } from 'ng-apexcharts';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { TicketService } from 'src/app/core/services/ticket.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { TicketStats, TicketAlerta, TicketConSLA } from 'src/app/core/models';
import {
  SemaforoBadgeComponent,
  PrioridadBadgeComponent,
  ProgressBarSLAComponent
} from '../../components';

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
  selector: 'app-ticket-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgbTooltipModule,
    NgApexchartsModule,
    SharedModule,
    SemaforoBadgeComponent,
    PrioridadBadgeComponent,
    ProgressBarSLAComponent
  ],
  templateUrl: './ticket-dashboard.component.html',
  styleUrls: ['./ticket-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketDashboardComponent implements OnInit {
  private ticketService = inject(TicketService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  loading = signal(true);
  stats = signal<TicketStats | null>(null);
  alertas = signal<TicketAlerta[]>([]);
  ticketsRecientes = signal<TicketConSLA[]>([]);

  // Gráficas
  categoriaChartOptions = signal<ChartOptions | null>(null);
  semaforoChartOptions = signal<ChartOptions | null>(null);

  // Computed
  hasAlertas = computed(() => this.alertas().length > 0);

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
      const stats = await this.ticketService.getTicketStats();
      this.stats.set(stats);

      // Construir gráficas
      this.buildCategoriaChart(stats);
      this.buildSemaforoChart(stats);

      // Cargar alertas (tickets en rojo/amarillo)
      this.ticketService.getTicketsAlertas(10).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.alertas.set(response.data);
          }
        }
      });

      // Cargar tickets recientes
      this.ticketService.getTickets({}, { page: 1, pageSize: 5, sortBy: 'fecha_creacion', sortOrder: 'desc' }).subscribe({
        next: (response) => {
          this.ticketsRecientes.set(response.data);
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

  private buildCategoriaChart(stats: TicketStats): void {
    if (!stats.por_categoria || stats.por_categoria.length === 0) {
      return;
    }

    this.categoriaChartOptions.set({
      series: stats.por_categoria.map(c => c.cantidad),
      chart: {
        type: 'donut',
        height: 280,
        fontFamily: 'inherit'
      },
      labels: stats.por_categoria.map(c => c.nombre),
      colors: stats.por_categoria.map(c => c.color),
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

  private buildSemaforoChart(stats: TicketStats): void {
    const data = stats.por_semaforo;
    const total = data.verde + data.amarillo + data.rojo;

    if (total === 0) {
      return;
    }

    this.semaforoChartOptions.set({
      series: [{
        name: 'Tickets',
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
          formatter: (val: number) => `${val} tickets`
        }
      }
    });
  }

  // ============================================================================
  // Navegación
  // ============================================================================

  navigateToTicket(ticketId: string): void {
    this.router.navigate(['/tickets', ticketId]);
  }

  navigateToList(filter?: string): void {
    if (filter) {
      this.router.navigate(['/tickets/lista'], { queryParams: { filter } });
    } else {
      this.router.navigate(['/tickets/lista']);
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  refreshDashboard(): void {
    this.loadDashboardData();
  }
}
