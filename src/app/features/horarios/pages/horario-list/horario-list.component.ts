// ============================================================================
// Horario List Component
// ============================================================================
// Componente para listar horarios/turnos con filtros, búsqueda y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbPaginationModule, NgbModalModule, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { HorarioService } from 'src/app/core/services/horario.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  HorarioWithCount,
  HorarioFilters,
  HorarioEstatus,
  PaginationOptions,
  DIAS_SEMANA_ABREV
} from 'src/app/core/models';

@Component({
  selector: 'app-horario-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbPaginationModule,
    NgbModalModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './horario-list.component.html',
  styleUrls: ['./horario-list.component.scss']
})
export class HorarioListComponent implements OnInit {
  private horarioService = inject(HorarioService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  horarios = signal<HorarioWithCount[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Paginación
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Filtros
  searchTerm = signal('');
  selectedEstatus = signal<HorarioEstatus | null>(null);
  selectedHorarioHabil = signal<boolean | null>(null);

  // Horario seleccionado para acciones
  selectedHorario = signal<HorarioWithCount | null>(null);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadHorarios();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  loadHorarios(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: HorarioFilters = {};
    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedEstatus()) filters.estatus = this.selectedEstatus()!;
    if (this.selectedHorarioHabil() !== null) filters.es_horario_habil = this.selectedHorarioHabil()!;

    const pagination: PaginationOptions = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: 'nombre',
      sortOrder: 'asc'
    };

    this.horarioService.getHorarios(filters, pagination).subscribe({
      next: (response) => {
        this.horarios.set(response.data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading horarios:', err);
        this.error.set('Error al cargar horarios');
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de horarios');
      }
    });
  }

  // ============================================================================
  // Métodos de filtrado y búsqueda
  // ============================================================================

  onSearch(): void {
    this.currentPage.set(1);
    this.loadHorarios();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadHorarios();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedEstatus.set(null);
    this.selectedHorarioHabil.set(null);
    this.currentPage.set(1);
    this.loadHorarios();
  }

  // ============================================================================
  // Paginación
  // ============================================================================

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadHorarios();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadHorarios();
  }

  // ============================================================================
  // Acciones sobre horarios
  // ============================================================================

  viewHorario(horario: HorarioWithCount): void {
    this.router.navigate(['/horarios', horario.id]);
  }

  editHorario(horario: HorarioWithCount): void {
    this.router.navigate(['/horarios/editar', horario.id]);
  }

  openDeactivateModal(content: any, horario: HorarioWithCount): void {
    this.selectedHorario.set(horario);
    this.modalService.open(content, { centered: true });
  }

  confirmDeactivate(): void {
    const horario = this.selectedHorario();
    if (!horario) return;

    this.horarioService.deactivateHorario(horario.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`Horario ${horario.nombre} desactivado correctamente`);
          this.loadHorarios();
        } else {
          this.notificationService.error(response.error || 'Error al desactivar horario');
        }
        this.modalService.dismissAll();
      },
      error: () => {
        this.notificationService.error('Error al desactivar horario');
        this.modalService.dismissAll();
      }
    });
  }

  activateHorario(horario: HorarioWithCount): void {
    this.horarioService.activateHorario(horario.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`Horario ${horario.nombre} activado correctamente`);
          this.loadHorarios();
        } else {
          this.notificationService.error(response.error || 'Error al activar horario');
        }
      },
      error: () => {
        this.notificationService.error('Error al activar horario');
      }
    });
  }

  // ============================================================================
  // Helpers de UI
  // ============================================================================

  getEstatusBadgeClass(estatus: HorarioEstatus): string {
    return estatus === 'Activo' ? 'badge bg-success' : 'badge bg-secondary';
  }

  getHorarioHabilBadgeClass(esHabil: boolean): string {
    return esHabil ? 'badge bg-info' : 'badge bg-warning text-dark';
  }

  getUserCountBadgeClass(count: number): string {
    if (count === 0) return 'badge bg-light text-dark';
    if (count < 3) return 'badge bg-warning text-dark';
    return 'badge bg-info';
  }

  formatDiasSemana(dias: number[]): string {
    return this.horarioService.formatDiasSemana(dias);
  }

  formatHora(hora: string): string {
    return this.horarioService.formatHora(hora);
  }

  formatHorarioRango(horario: HorarioWithCount): string {
    return `${this.formatHora(horario.hora_inicio)} - ${this.formatHora(horario.hora_fin)}`;
  }
}
