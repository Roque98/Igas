// ============================================================================
// Equipo Detail Component
// ============================================================================
// Componente para ver detalles de un equipo y gestionar sus miembros
// ============================================================================

import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModalModule, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { EquipoService } from 'src/app/core/services/equipo.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { EquipoWithRelations, EquipoMember } from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-equipo-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbModalModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './equipo-detail.component.html',
  styleUrls: ['./equipo-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EquipoDetailComponent implements OnInit {
  private equipoService = inject(EquipoService);
  private destroyRef = inject(DestroyRef);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  equipo = signal<EquipoWithRelations | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Miembros
  miembros = signal<EquipoMember[]>([]);
  loadingMiembros = signal(false);

  // Usuarios sin equipo (para asignar)
  unassignedUsers = signal<EquipoMember[]>([]);
  loadingUnassigned = signal(false);
  selectedUserId = signal<string | null>(null);

  // Miembro seleccionado para remover
  selectedMember = signal<EquipoMember | null>(null);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadEquipo();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  private loadEquipo(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/equipos']);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.equipoService.getEquipoById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.equipo.set(response.data);
          this.miembros.set(response.data.miembros || []);
        } else {
          this.error.set('Equipo no encontrado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading equipo:', err); }
        this.error.set('Error al cargar el equipo');
        this.loading.set(false);
      }
    });
  }

  private reloadMiembros(): void {
    const equipoId = this.equipo()?.id;
    if (!equipoId) return;

    this.loadingMiembros.set(true);

    this.equipoService.getEquipoMembers(equipoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.miembros.set(response.data);
        }
        this.loadingMiembros.set(false);
      },
      error: () => {
        this.loadingMiembros.set(false);
      }
    });
  }

  loadUnassignedUsers(): void {
    this.loadingUnassigned.set(true);

    this.equipoService.getUnassignedUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.unassignedUsers.set(response.data);
        }
        this.loadingUnassigned.set(false);
      },
      error: () => {
        this.loadingUnassigned.set(false);
      }
    });
  }

  // ============================================================================
  // Gestión de miembros
  // ============================================================================

  openAddMemberModal(content: any): void {
    this.selectedUserId.set(null);
    this.loadUnassignedUsers();
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  confirmAddMember(): void {
    const equipoId = this.equipo()?.id;
    const userId = this.selectedUserId();

    if (!equipoId || !userId) {
      this.notificationService.warning('Seleccione un usuario');
      return;
    }

    this.equipoService.assignMember(userId, equipoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Usuario asignado al equipo');
          this.reloadMiembros();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al asignar usuario');
        }
      },
      error: () => {
        this.notificationService.error('Error al asignar usuario');
      }
    });
  }

  openRemoveMemberModal(content: any, member: EquipoMember): void {
    this.selectedMember.set(member);
    this.modalService.open(content, { centered: true });
  }

  confirmRemoveMember(): void {
    const member = this.selectedMember();
    if (!member) return;

    this.equipoService.removeMember(member.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success(`${member.nombre_completo} removido del equipo`);
          this.reloadMiembros();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al remover miembro');
        }
      },
      error: () => {
        this.notificationService.error('Error al remover miembro');
      }
    });
  }

  // ============================================================================
  // Navegación
  // ============================================================================

  editEquipo(): void {
    const id = this.equipo()?.id;
    if (id) {
      this.router.navigate(['/equipos/editar', id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/equipos']);
  }

  // ============================================================================
  // Helpers de UI
  // ============================================================================

  getAvatarUrl(member: EquipoMember): string {
    return member.avatar_url || 'assets/images/user/avatar-1.jpg';
  }

  getDisponibilidadClass(disponibilidad?: string): string {
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
