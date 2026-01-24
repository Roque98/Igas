// ============================================================================
// Horario Detail Component
// ============================================================================
// Componente para ver detalles de un horario y usuarios asignados
// ============================================================================

import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { HorarioService } from 'src/app/core/services/horario.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { HorarioWithCount, DIAS_SEMANA_NOMBRES } from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-horario-detail',
  standalone: true,
  imports: [
    CommonModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './horario-detail.component.html',
  styleUrls: ['./horario-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HorarioDetailComponent implements OnInit {
  private horarioService = inject(HorarioService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  horario = signal<HorarioWithCount | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Usuarios asignados
  usuarios = signal<any[]>([]);
  loadingUsuarios = signal(false);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadHorario();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  private loadHorario(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/horarios']);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.horarioService.getHorarioById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.horario.set(response.data);
          this.loadUsuarios(id);
        } else {
          this.error.set('Horario no encontrado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading horario:', err); }
        this.error.set('Error al cargar el horario');
        this.loading.set(false);
      }
    });
  }

  private loadUsuarios(horarioId: string): void {
    this.loadingUsuarios.set(true);

    this.horarioService.getUsuariosByHorario(horarioId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.usuarios.set(response.data);
        }
        this.loadingUsuarios.set(false);
      },
      error: () => {
        this.loadingUsuarios.set(false);
      }
    });
  }

  // ============================================================================
  // Navegación
  // ============================================================================

  editHorario(): void {
    const id = this.horario()?.id;
    if (id) {
      this.router.navigate(['/horarios/editar', id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/horarios']);
  }

  viewUsuario(usuario: any): void {
    this.router.navigate(['/usuarios', usuario.id]);
  }

  // ============================================================================
  // Helpers de UI
  // ============================================================================

  formatDiasSemana(dias: (number | string)[]): string {
    return this.horarioService.formatDiasSemana(dias);
  }

  formatDiasSemanaFull(dias: (number | string)[]): string {
    // Normalizar días a números (pueden venir como strings de la BD)
    const diasNormalizados = dias.map(d => typeof d === 'string' ? parseInt(d, 10) : d);
    return diasNormalizados
      .sort((a, b) => a - b)
      .map(d => DIAS_SEMANA_NOMBRES[d])
      .join(', ');
  }

  formatHora(hora: string): string {
    return this.horarioService.formatHora(hora);
  }

  formatHorarioRango(): string {
    const h = this.horario();
    if (!h) return '';
    return `${this.formatHora(h.hora_inicio)} - ${this.formatHora(h.hora_fin)}`;
  }

  getAvatarUrl(usuario: any): string {
    return usuario.avatar_url || 'assets/images/user/avatar-1.jpg';
  }

  isWithinSchedule(): boolean {
    const h = this.horario();
    if (!h) return false;
    return this.horarioService.isWithinSchedule(h);
  }
}
