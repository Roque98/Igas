// ============================================================================
// Mantenimiento Calendar Component
// ============================================================================
// Vista de calendario mensual de mantenimientos
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { MantenimientoService } from 'src/app/core/services/mantenimiento.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { MantenimientoCalendario, DiaCalendario, MESES, DIAS_SEMANA } from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-mantenimiento-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './mantenimiento-calendar.component.html',
  styleUrls: ['./mantenimiento-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenimientoCalendarComponent implements OnInit {
  private mantenimientoService = inject(MantenimientoService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Estado
  loading = signal(true);
  mantenimientos = signal<MantenimientoCalendario[]>([]);

  // Calendario
  mesActual = signal(new Date().getMonth() + 1);
  anioActual = signal(new Date().getFullYear());

  // Constantes
  meses = MESES;
  diasSemana = DIAS_SEMANA;
  anios: number[] = [];

  // Computed
  diasCalendario = computed(() => this.generarDiasCalendario());
  nombreMes = computed(() => this.meses[this.mesActual() - 1]);

  ngOnInit(): void {
    // Generar lista de años
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      this.anios.push(y);
    }

    this.loadMantenimientos();
  }

  loadMantenimientos(): void {
    this.loading.set(true);

    this.mantenimientoService.getMantenimientosPorMes(this.mesActual(), this.anioActual()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.mantenimientos.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading mantenimientos:', err); }
        this.notificationService.error('Error al cargar el calendario');
        this.loading.set(false);
      }
    });
  }

  private generarDiasCalendario(): DiaCalendario[] {
    const mes = this.mesActual();
    const anio = this.anioActual();
    const dias: DiaCalendario[] = [];

    // Primer día del mes
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);

    // Día de la semana del primer día (0 = Domingo, ajustar para Lunes = 0)
    let diaSemana = primerDia.getDay();
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;

    // Días del mes anterior para completar la primera semana
    const diasMesAnterior = new Date(anio, mes - 1, 0).getDate();
    for (let i = diaSemana - 1; i >= 0; i--) {
      const fecha = new Date(anio, mes - 2, diasMesAnterior - i);
      dias.push({
        fecha,
        dia: diasMesAnterior - i,
        esHoy: false,
        esMesActual: false,
        mantenimientos: []
      });
    }

    // Días del mes actual
    const hoy = new Date();
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(anio, mes - 1, d);
      const fechaStr = fecha.toISOString().split('T')[0];
      const mtns = this.mantenimientos().filter(m => m.fecha_programada === fechaStr);

      dias.push({
        fecha,
        dia: d,
        esHoy: fecha.toDateString() === hoy.toDateString(),
        esMesActual: true,
        mantenimientos: mtns
      });
    }

    // Días del mes siguiente para completar la última semana
    const diasRestantes = 42 - dias.length; // 6 semanas * 7 días
    for (let d = 1; d <= diasRestantes; d++) {
      const fecha = new Date(anio, mes, d);
      dias.push({
        fecha,
        dia: d,
        esHoy: false,
        esMesActual: false,
        mantenimientos: []
      });
    }

    return dias;
  }

  mesAnterior(): void {
    if (this.mesActual() === 1) {
      this.mesActual.set(12);
      this.anioActual.update(a => a - 1);
    } else {
      this.mesActual.update(m => m - 1);
    }
    this.loadMantenimientos();
  }

  mesSiguiente(): void {
    if (this.mesActual() === 12) {
      this.mesActual.set(1);
      this.anioActual.update(a => a + 1);
    } else {
      this.mesActual.update(m => m + 1);
    }
    this.loadMantenimientos();
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesActual.set(hoy.getMonth() + 1);
    this.anioActual.set(hoy.getFullYear());
    this.loadMantenimientos();
  }

  onMesChange(mes: number): void {
    this.mesActual.set(mes);
    this.loadMantenimientos();
  }

  onAnioChange(anio: number): void {
    this.anioActual.set(anio);
    this.loadMantenimientos();
  }

  viewMantenimiento(mtn: MantenimientoCalendario): void {
    this.router.navigate(['/mantenimientos', mtn.id]);
  }

  newMantenimientoEnFecha(dia: DiaCalendario): void {
    const fecha = dia.fecha.toISOString().split('T')[0];
    this.router.navigate(['/mantenimientos', 'nuevo'], { queryParams: { fecha } });
  }

  goToList(): void {
    this.router.navigate(['/mantenimientos', 'lista']);
  }
}
