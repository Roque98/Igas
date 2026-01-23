// ============================================================================
// Equipo List Component
// ============================================================================
// Componente para listar equipos/áreas con filtros, búsqueda y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbPaginationModule, NgbModalModule, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { EquipoService } from 'src/app/core/services/equipo.service';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  EquipoWithRelations,
  EquipoFilters,
  EquipoEstatus,
  PaginationOptions
} from 'src/app/core/models';

@Component({
  selector: 'app-equipo-list',
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
  templateUrl: './equipo-list.component.html',
  styleUrls: ['./equipo-list.component.scss']
})
export class EquipoListComponent implements OnInit {
  private equipoService = inject(EquipoService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  equipos = signal<EquipoWithRelations[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Paginación
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Filtros
  searchTerm = signal('');
  selectedEstatus = signal<EquipoEstatus | null>(null);
  selectedSupervisorId = signal<string | null>(null);

  // Catálogos para filtros
  supervisores = signal<any[]>([]);

  // Equipo seleccionado para acciones
  selectedEquipo = signal<EquipoWithRelations | null>(null);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadCatalogos();
    this.loadEquipos();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  private loadCatalogos(): void {
    // Cargar usuarios que pueden ser supervisores
    this.userService.getUsers({ estatus: 'Activo' }, { page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.supervisores.set(response.data);
      }
    });
  }

  loadEquipos(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: EquipoFilters = {};
    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedEstatus()) filters.estatus = this.selectedEstatus()!;
    if (this.selectedSupervisorId()) filters.supervisor_id = this.selectedSupervisorId()!;

    const pagination: PaginationOptions = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: 'nombre',
      sortOrder: 'asc'
    };

    this.equipoService.getEquipos(filters, pagination).subscribe({
      next: (response) => {
        this.equipos.set(response.data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading equipos:', err);
        this.error.set('Error al cargar equipos');
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de equipos');
      }
    });
  }

  // ============================================================================
  // Métodos de filtrado y búsqueda
  // ============================================================================

  onSearch(): void {
    this.currentPage.set(1);
    this.loadEquipos();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadEquipos();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedEstatus.set(null);
    this.selectedSupervisorId.set(null);
    this.currentPage.set(1);
    this.loadEquipos();
  }

  // ============================================================================
  // Paginación
  // ============================================================================

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadEquipos();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadEquipos();
  }

  // ============================================================================
  // Acciones sobre equipos
  // ============================================================================

  viewEquipo(equipo: EquipoWithRelations): void {
    this.router.navigate(['/equipos', equipo.id]);
  }

  editEquipo(equipo: EquipoWithRelations): void {
    this.router.navigate(['/equipos/editar', equipo.id]);
  }

  openDeactivateModal(content: any, equipo: EquipoWithRelations): void {
    this.selectedEquipo.set(equipo);
    this.modalService.open(content, { centered: true });
  }

  confirmDeactivate(): void {
    const equipo = this.selectedEquipo();
    if (!equipo) return;

    this.equipoService.deactivateEquipo(equipo.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`Equipo ${equipo.nombre} desactivado correctamente`);
          this.loadEquipos();
        } else {
          this.notificationService.error(response.error || 'Error al desactivar equipo');
        }
        this.modalService.dismissAll();
      },
      error: () => {
        this.notificationService.error('Error al desactivar equipo');
        this.modalService.dismissAll();
      }
    });
  }

  activateEquipo(equipo: EquipoWithRelations): void {
    this.equipoService.activateEquipo(equipo.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`Equipo ${equipo.nombre} activado correctamente`);
          this.loadEquipos();
        } else {
          this.notificationService.error(response.error || 'Error al activar equipo');
        }
      },
      error: () => {
        this.notificationService.error('Error al activar equipo');
      }
    });
  }

  // ============================================================================
  // Helpers de UI
  // ============================================================================

  getEstatusBadgeClass(estatus: EquipoEstatus): string {
    return estatus === 'Activo' ? 'badge bg-success' : 'badge bg-secondary';
  }

  getMemberCountBadgeClass(count: number): string {
    if (count === 0) return 'badge bg-light text-dark';
    if (count < 3) return 'badge bg-warning text-dark';
    return 'badge bg-info';
  }
}
