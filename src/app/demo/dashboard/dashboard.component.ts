// ============================================================================
// Dashboard Component
// ============================================================================
// Dashboard principal con estadísticas de usuarios del sistema
// ============================================================================

import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { UserService } from 'src/app/core/services/user.service';
import { SupabaseService } from 'src/app/core/services/supabase.service';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { ReporteService } from 'src/app/core/services/reporte.service';
import { AlertaVencimiento, ClienteStats, PRIORIDAD_ALERTA } from 'src/app/core/models';

import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexDataLabels,
  ApexPlotOptions,
  ApexLegend,
  ApexXAxis,
  ApexYAxis,
  ApexAxisChartSeries,
  ApexFill
} from 'ng-apexcharts';
import { environment } from '../../../environments/environment';

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  responsive: ApexResponsive[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
};

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  colors: string[];
  fill: ApexFill;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SharedModule, NgApexchartsModule, RouterLink, NgbTooltipModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private userService = inject(UserService);
  private supabase = inject(SupabaseService);
  private clienteService = inject(ClienteService);
  private reporteService = inject(ReporteService);
  private router = inject(Router);

  // Estado
  loading = signal(true);
  userName = signal('');

  // FASE 6A: Estadísticas de Tickets y Casos
  ticketCasoStats = signal<{
    ticketsHoy: number;
    ticketsAbiertos: number;
    ticketsEnRojo: number;
    casosAbiertos: number;
    casosVencidos: number;
  } | null>(null);

  // FASE 6: Alertas de vencimiento
  alertasVencimiento = signal<AlertaVencimiento[]>([]);
  clienteStats = signal<ClienteStats | null>(null);
  loadingAlertas = signal(false);
  prioridadAlerta = PRIORIDAD_ALERTA;
  Math = Math; // For template access

  // Estadísticas de usuarios
  stats = signal<{
    total: number;
    activos: number;
    inactivos: number;
    porRol: { nombre: string; cantidad: number; color: string }[];
    porEquipo: { nombre: string; cantidad: number }[];
    porDisponibilidad: { estado: string; cantidad: number }[];
  } | null>(null);

  // Configuración de gráficas
  roleChartOptions: Partial<PieChartOptions> | null = null;
  teamChartOptions: Partial<BarChartOptions> | null = null;
  statusChartOptions: Partial<PieChartOptions> | null = null;

  // Cards de estadísticas
  statsCards = signal<{
    title: string;
    value: number;
    icon: string;
    bgClass: string;
    textClass: string;
  }[]>([]);

  ngOnInit(): void {
    this.loadUserName();
    this.loadStats();
    this.loadAlertas();
    this.loadClienteStats();
    this.loadTicketCasoStats();
  }

  private loadUserName(): void {
    const user = this.supabase.user;
    if (user) {
      this.userService.getUserById(user.id).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.userName.set(response.data.nombre_completo || 'Usuario');
          }
        }
      });
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const stats = await this.userService.getUserStats();
      this.stats.set(stats);

      // Configurar cards de estadísticas con colores corporativos iGAS
      this.statsCards.set([
        {
          title: 'Total Usuarios',
          value: stats.total,
          icon: 'feather icon-users',
          bgClass: 'bg-igas-yellow',
          textClass: 'text-white'
        },
        {
          title: 'Usuarios Activos',
          value: stats.activos,
          icon: 'feather icon-user-check',
          bgClass: 'bg-sla-green',
          textClass: 'text-white'
        },
        {
          title: 'Usuarios Inactivos',
          value: stats.inactivos,
          icon: 'feather icon-user-x',
          bgClass: 'bg-igas-gray',
          textClass: 'text-white'
        },
        {
          title: 'Roles Definidos',
          value: stats.porRol.length,
          icon: 'feather icon-shield',
          bgClass: 'bg-info',
          textClass: 'text-white'
        }
      ]);

      // Configurar gráfica de roles (pie chart)
      if (stats.porRol.length > 0) {
        this.roleChartOptions = {
          series: stats.porRol.map(r => r.cantidad),
          chart: {
            type: 'donut',
            height: 320,
            fontFamily: 'inherit'
          },
          labels: stats.porRol.map(r => r.nombre),
          colors: stats.porRol.map(r => r.color),
          legend: {
            position: 'bottom',
            horizontalAlign: 'center'
          },
          dataLabels: {
            enabled: true,
            formatter: (val: number) => val.toFixed(0) + '%'
          },
          responsive: [{
            breakpoint: 480,
            options: {
              chart: { width: 280 },
              legend: { position: 'bottom' }
            }
          }]
        };
      }

      // Configurar gráfica de equipos (bar chart)
      if (stats.porEquipo.length > 0) {
        this.teamChartOptions = {
          series: [{
            name: 'Usuarios',
            data: stats.porEquipo.map(e => e.cantidad)
          }],
          chart: {
            type: 'bar',
            height: 320,
            fontFamily: 'inherit',
            toolbar: { show: false }
          },
          xaxis: {
            categories: stats.porEquipo.map(e => e.nombre),
            labels: {
              style: { fontSize: '12px' }
            }
          },
          yaxis: {
            title: { text: 'Usuarios' }
          },
          plotOptions: {
            bar: {
              horizontal: false,
              borderRadius: 4,
              columnWidth: '60%'
            }
          },
          dataLabels: {
            enabled: true
          },
          colors: ['#F9B000'], // iGAS Yellow
          fill: {
            opacity: 1
          }
        };
      }

      // Configurar gráfica de disponibilidad (pie chart)
      if (stats.porDisponibilidad.length > 0) {
        // Colores corporativos iGAS para disponibilidad
        const dispColors: Record<string, string> = {
          'En línea': '#4CAF50',      // SLA Green
          'Ocupado': '#FFC107',        // SLA Yellow
          'Fuera de turno': '#58585A', // iGAS Gray
          'Sin estado': '#adb5bd'
        };

        this.statusChartOptions = {
          series: stats.porDisponibilidad.map(d => d.cantidad),
          chart: {
            type: 'pie',
            height: 280,
            fontFamily: 'inherit'
          },
          labels: stats.porDisponibilidad.map(d => d.estado),
          colors: stats.porDisponibilidad.map(d => dispColors[d.estado] || '#6c757d'),
          legend: {
            position: 'bottom',
            horizontalAlign: 'center'
          },
          dataLabels: {
            enabled: true
          },
          responsive: [{
            breakpoint: 480,
            options: {
              chart: { width: 280 },
              legend: { position: 'bottom' }
            }
          }]
        };
      }

      this.loading.set(false);
    } catch (error) {
      if (!environment.production) { console.error('Error loading stats:', error); }
      this.loading.set(false);
    }
  }

  // Helpers para calcular porcentajes
  getActivePercentage(): number {
    const s = this.stats();
    if (!s || s.total === 0) return 0;
    return Math.round((s.activos / s.total) * 100);
  }

  // ============================================================================
  // FASE 6: Alertas y Estadísticas de Clientes
  // ============================================================================

  private loadAlertas(): void {
    this.loadingAlertas.set(true);
    this.clienteService.getAlertas({ atendido: false }, 10).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.alertasVencimiento.set(response.data);
        }
        this.loadingAlertas.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading alertas:', err); }
        this.loadingAlertas.set(false);
      }
    });
  }

  private async loadClienteStats(): Promise<void> {
    try {
      const stats = await this.clienteService.getClienteStats();
      this.clienteStats.set(stats);
    } catch (error) {
      if (!environment.production) { console.error('Error loading cliente stats:', error); }
    }
  }

  getPrioridadColor(prioridad: string): string {
    const found = this.prioridadAlerta.find(p => p.value === prioridad);
    return found?.color || '#6c757d';
  }

  getPrioridadLabel(prioridad: string): string {
    const found = this.prioridadAlerta.find(p => p.value === prioridad);
    return found?.label || prioridad;
  }

  getTipoAlertaIcon(tipo: string): string {
    return tipo === 'licencia' ? 'feather icon-key' : 'feather icon-shield';
  }

  getTipoAlertaLabel(tipo: string): string {
    return tipo === 'licencia' ? 'Licencia' : 'Póliza';
  }

  getDiasClass(dias: number | undefined): string {
    if (dias === undefined || dias === null) return '';
    if (dias < 0) return 'text-danger';
    if (dias <= 7) return 'text-danger fw-bold';
    if (dias <= 30) return 'text-warning';
    return 'text-success';
  }

  navigateToCliente(clienteId: string | undefined): void {
    if (clienteId) {
      this.router.navigate(['/clientes', clienteId]);
    }
  }

  marcarAlertaAtendida(alerta: AlertaVencimiento): void {
    this.clienteService.marcarAlertaAtendida(alerta.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadAlertas();
        }
      }
    });
  }

  // ============================================================================
  // FASE 6A: Estadísticas de Tickets y Casos
  // ============================================================================

  private async loadTicketCasoStats(): Promise<void> {
    try {
      const stats = await this.reporteService.getDashboardStats();
      this.ticketCasoStats.set(stats);
    } catch (error) {
      if (!environment.production) { console.error('Error loading ticket/caso stats:', error); }
    }
  }
}
