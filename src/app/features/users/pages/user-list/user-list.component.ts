// ============================================================================
// User List Component
// ============================================================================
// Componente para listar usuarios con filtros, búsqueda y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbPaginationModule, NgbModalModule, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  ProfileWithRelations,
  UserFilters,
  PaginationOptions,
  ProfileEstatus,
  Disponibilidad
} from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-user-list',
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
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  users = signal<ProfileWithRelations[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Paginación
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Filtros
  searchTerm = signal('');
  selectedRolId = signal<string | null>(null);
  selectedEquipoId = signal<string | null>(null);
  selectedEstatus = signal<ProfileEstatus | null>(null);

  // Catálogos para filtros
  roles = signal<any[]>([]);
  equipos = signal<any[]>([]);

  // Usuario seleccionado para acciones
  selectedUser = signal<ProfileWithRelations | null>(null);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadCatalogos();
    this.loadUsers();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  private loadCatalogos(): void {
    this.userService.getRoles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.roles.set(response.data);
        }
      }
    });

    this.userService.getEquipos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.equipos.set(response.data);
        }
      }
    });
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: UserFilters = {};
    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedRolId()) filters.rol_id = this.selectedRolId()!;
    if (this.selectedEquipoId()) filters.area_equipo_id = this.selectedEquipoId()!;
    if (this.selectedEstatus()) filters.estatus = this.selectedEstatus()!;

    const pagination: PaginationOptions = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: 'nombre_completo',
      sortOrder: 'asc'
    };

    this.userService.getUsers(filters, pagination).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading users:', err); }
        this.error.set('Error al cargar usuarios');
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de usuarios');
      }
    });
  }

  // ============================================================================
  // Métodos de filtrado y búsqueda
  // ============================================================================

  onSearch(): void {
    this.currentPage.set(1);
    this.loadUsers();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedRolId.set(null);
    this.selectedEquipoId.set(null);
    this.selectedEstatus.set(null);
    this.currentPage.set(1);
    this.loadUsers();
  }

  // ============================================================================
  // Paginación
  // ============================================================================

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadUsers();
  }

  // ============================================================================
  // Acciones sobre usuarios
  // ============================================================================

  viewUser(user: ProfileWithRelations): void {
    this.router.navigate(['/usuarios', user.id]);
  }

  editUser(user: ProfileWithRelations): void {
    this.router.navigate(['/usuarios/editar', user.id]);
  }

  openDeactivateModal(content: any, user: ProfileWithRelations): void {
    this.selectedUser.set(user);
    this.modalService.open(content, { centered: true });
  }

  confirmDeactivate(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.userService.deactivateUser(user.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`Usuario ${user.nombre_completo} desactivado correctamente`);
          this.loadUsers();
        } else {
          this.notificationService.error(response.error || 'Error al desactivar usuario');
        }
        this.modalService.dismissAll();
      },
      error: () => {
        this.notificationService.error('Error al desactivar usuario');
        this.modalService.dismissAll();
      }
    });
  }

  activateUser(user: ProfileWithRelations): void {
    this.userService.activateUser(user.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`Usuario ${user.nombre_completo} activado correctamente`);
          this.loadUsers();
        } else {
          this.notificationService.error(response.error || 'Error al activar usuario');
        }
      },
      error: () => {
        this.notificationService.error('Error al activar usuario');
      }
    });
  }

  // ============================================================================
  // Exportación CSV
  // ============================================================================

  exporting = signal(false);

  async exportToCSV(): Promise<void> {
    this.exporting.set(true);
    try {
      const users = await this.userService.getAllUsersForExport();

      if (users.length === 0) {
        this.notificationService.warning('No hay usuarios para exportar');
        return;
      }

      // Definir columnas
      const headers = [
        'Nombre Completo',
        'Email',
        'Teléfono',
        'Rol',
        'Equipo',
        'Horario',
        'Estatus',
        'Disponibilidad',
        'Fecha de Creación'
      ];

      // Convertir datos
      const rows = users.map(user => [
        user.nombre_completo || '',
        user.email || '',
        user.telefono || '',
        user.rol?.nombre || 'Sin rol',
        user.equipo?.nombre || 'Sin equipo',
        user.horario?.nombre || 'Sin horario',
        user.estatus || '',
        user.disponibilidad || '',
        user.created_at ? new Date(user.created_at).toLocaleDateString('es-MX') : ''
      ]);

      // Crear contenido CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map(cell => {
            // Escapar comillas y envolver en comillas si contiene coma o comilla
            const escaped = String(cell).replace(/"/g, '""');
            return /[,"\n]/.test(escaped) ? `"${escaped}"` : escaped;
          }).join(',')
        )
      ].join('\n');

      // Crear y descargar archivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.notificationService.success(`Se exportaron ${users.length} usuarios correctamente`);
    } catch (error) {
      if (!environment.production) { console.error('Error exporting users:', error); }
      this.notificationService.error('Error al exportar usuarios');
    } finally {
      this.exporting.set(false);
    }
  }

  // ============================================================================
  // Helpers de UI
  // ============================================================================

  getEstatusBadgeClass(estatus: ProfileEstatus): string {
    return estatus === 'Activo' ? 'badge bg-success' : 'badge bg-secondary';
  }

  getDisponibilidadBadgeClass(disponibilidad: Disponibilidad): string {
    switch (disponibilidad) {
      case 'En línea':
        return 'badge bg-success';
      case 'Ocupado':
        return 'badge bg-warning text-dark';
      case 'Fuera de turno':
        return 'badge bg-secondary';
      default:
        return 'badge bg-light text-dark';
    }
  }

  getAvatarUrl(user: ProfileWithRelations): string {
    return user.avatar_url || 'assets/images/user/avatar-1.jpg';
  }
}
