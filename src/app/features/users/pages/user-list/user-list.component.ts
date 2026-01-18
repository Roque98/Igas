// ============================================================================
// User List Component
// ============================================================================
// Componente para listar usuarios con filtros, búsqueda y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
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
    this.userService.getRoles().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.roles.set(response.data);
        }
      }
    });

    this.userService.getEquipos().subscribe({
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

    this.userService.getUsers(filters, pagination).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
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

    this.userService.deactivateUser(user.id).subscribe({
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
    this.userService.activateUser(user.id).subscribe({
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
