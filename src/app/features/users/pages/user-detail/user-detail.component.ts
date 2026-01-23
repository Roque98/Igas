// ============================================================================
// User Detail Component
// ============================================================================
// Componente para ver el detalle de un usuario (vista administrador)
// ============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModalModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ProfileWithRelations, ProfileEstatus, Disponibilidad } from 'src/app/core/models';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    NgbModalModule,
    SharedModule
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss']
})
export class UserDetailComponent implements OnInit {
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  user = signal<ProfileWithRelations | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(id);
    } else {
      this.error.set('ID de usuario no proporcionado');
      this.loading.set(false);
    }
  }

  // ============================================================================
  // Carga de datos
  // ============================================================================

  private loadUser(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.userService.getUserById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.user.set(response.data);
        } else {
          this.error.set('Usuario no encontrado');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar usuario');
        this.loading.set(false);
      }
    });
  }

  // ============================================================================
  // Acciones
  // ============================================================================

  editUser(): void {
    const user = this.user();
    if (user) {
      this.router.navigate(['/usuarios/editar', user.id]);
    }
  }

  openDeactivateModal(content: any): void {
    this.modalService.open(content, { centered: true });
  }

  confirmDeactivate(): void {
    const user = this.user();
    if (!user) return;

    this.userService.deactivateUser(user.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Usuario desactivado correctamente');
          this.loadUser(user.id);
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

  activateUser(): void {
    const user = this.user();
    if (!user) return;

    this.userService.activateUser(user.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Usuario activado correctamente');
          this.loadUser(user.id);
        } else {
          this.notificationService.error(response.error || 'Error al activar usuario');
        }
      },
      error: () => {
        this.notificationService.error('Error al activar usuario');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/usuarios']);
  }

  // ============================================================================
  // Helpers de UI
  // ============================================================================

  getAvatarUrl(): string {
    return this.user()?.avatar_url || 'assets/images/user/avatar-1.jpg';
  }

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
}
