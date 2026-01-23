// ============================================================================
// Ticket Detail Component
// ============================================================================
// Componente para mostrar el detalle de un ticket con bitácora y acciones
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModalModule, NgbModal, NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { TicketService } from 'src/app/core/services/ticket.service';
import { CasoService } from 'src/app/core/services/caso.service';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  TicketConSLA,
  TicketBitacora,
  TicketAdjunto,
  EstatusTicket,
  ProfileBasic,
  AreaDestino,
  MotivoEscalamiento,
  AREAS_DESTINO,
  MOTIVOS_ESCALAMIENTO
} from 'src/app/core/models';
import {
  SemaforoBadgeComponent,
  PrioridadBadgeComponent,
  EstatusBadgeComponent,
  ProgressBarSLAComponent
} from '../../components';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbModalModule,
    NgbTooltipModule,
    NgbDropdownModule,
    SharedModule,
    SemaforoBadgeComponent,
    PrioridadBadgeComponent,
    EstatusBadgeComponent,
    ProgressBarSLAComponent
  ],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.scss']
})
export class TicketDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private casoService = inject(CasoService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  ticket = signal<TicketConSLA | null>(null);
  bitacora = signal<TicketBitacora[]>([]);
  adjuntos = signal<TicketAdjunto[]>([]);
  loading = signal(true);
  loadingBitacora = signal(false);
  error = signal<string | null>(null);

  // Catálogos
  estatus = signal<EstatusTicket[]>([]);
  usuarios = signal<ProfileBasic[]>([]);

  // Modales
  nuevaNota = signal('');
  nuevoEstatusId = signal<string | null>(null);
  notaCambioEstatus = signal('');
  nuevoResponsableId = signal<string | null>(null);
  motivoAsignacion = signal('');
  savingAction = signal(false);

  // Escalamiento
  escalarAreaDestino = signal<AreaDestino | null>(null);
  escalarMotivo = signal<MotivoEscalamiento | null>(null);
  escalarDescripcion = signal('');
  escalarFechaCompromiso = signal('');
  areasDestino = AREAS_DESTINO;
  motivosEscalamiento = MOTIVOS_ESCALAMIENTO;

  // Computed
  ticketId = computed(() => this.route.snapshot.paramMap.get('id') || '');

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadTicket();
    this.loadCatalogos();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  private loadCatalogos(): void {
    // Cargar estatus
    this.ticketService.getEstatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.estatus.set(response.data);
        }
      }
    });

    // Cargar usuarios para asignación
    this.userService.getUsers({ estatus: 'Activo' }, { page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.usuarios.set(response.data.map(u => ({
          id: u.id,
          nombre_completo: u.nombre_completo,
          avatar_url: u.avatar_url,
          email: u.email
        })));
      }
    });
  }

  loadTicket(): void {
    this.loading.set(true);
    this.error.set(null);

    const id = this.ticketId();
    if (!id) {
      this.error.set('ID de ticket no válido');
      this.loading.set(false);
      return;
    }

    this.ticketService.getTicketById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.ticket.set(response.data);
          this.loadBitacora();
          this.loadAdjuntos();
        } else {
          this.error.set(response.error || 'Ticket no encontrado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading ticket:', err);
        this.error.set('Error al cargar el ticket');
        this.loading.set(false);
      }
    });
  }

  loadBitacora(): void {
    this.loadingBitacora.set(true);
    const id = this.ticketId();

    this.ticketService.getTicketBitacora(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.bitacora.set(response.data);
        }
        this.loadingBitacora.set(false);
      },
      error: () => {
        this.loadingBitacora.set(false);
      }
    });
  }

  loadAdjuntos(): void {
    const id = this.ticketId();

    this.ticketService.getTicketAdjuntos(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.adjuntos.set(response.data);
        }
      }
    });
  }

  // ============================================================================
  // Acciones
  // ============================================================================

  openCambiarEstatusModal(content: any): void {
    this.nuevoEstatusId.set(this.ticket()?.estatus_id || null);
    this.notaCambioEstatus.set('');
    this.modalService.open(content, { centered: true });
  }

  confirmCambiarEstatus(): void {
    const estatusId = this.nuevoEstatusId();
    if (!estatusId) return;

    this.savingAction.set(true);

    this.ticketService.cambiarEstatus(this.ticketId(), {
      estatus_id: estatusId,
      nota: this.notaCambioEstatus() || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Estatus actualizado correctamente');
          this.loadTicket();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al cambiar estatus');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cambiar estatus');
        this.savingAction.set(false);
      }
    });
  }

  openAsignarModal(content: any): void {
    this.nuevoResponsableId.set(this.ticket()?.responsable_id || null);
    this.motivoAsignacion.set('');
    this.modalService.open(content, { centered: true });
  }

  confirmAsignar(): void {
    const responsableId = this.nuevoResponsableId();
    if (!responsableId) return;

    this.savingAction.set(true);

    this.ticketService.asignarTicket(this.ticketId(), {
      usuario_id: responsableId,
      motivo: this.motivoAsignacion() || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Ticket asignado correctamente');
          this.loadTicket();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al asignar ticket');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al asignar ticket');
        this.savingAction.set(false);
      }
    });
  }

  openAgregarNotaModal(content: any): void {
    this.nuevaNota.set('');
    this.modalService.open(content, { centered: true });
  }

  confirmAgregarNota(): void {
    const nota = this.nuevaNota();
    if (!nota.trim()) return;

    this.savingAction.set(true);

    this.ticketService.agregarNota(this.ticketId(), {
      mensaje: nota,
      es_publico: true
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Nota agregada correctamente');
          this.loadBitacora();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al agregar nota');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al agregar nota');
        this.savingAction.set(false);
      }
    });
  }

  // ============================================================================
  // Escalamiento
  // ============================================================================

  openEscalarModal(content: any): void {
    this.escalarAreaDestino.set(null);
    this.escalarMotivo.set(null);
    this.escalarDescripcion.set(this.ticket()?.descripcion || '');
    this.escalarFechaCompromiso.set('');
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  confirmEscalar(): void {
    const areaDestino = this.escalarAreaDestino();
    const motivo = this.escalarMotivo();

    if (!areaDestino || !motivo) {
      this.notificationService.warning('Selecciona área destino y motivo');
      return;
    }

    this.savingAction.set(true);

    this.casoService.escalarTicket({
      ticket_id: this.ticketId(),
      area_destino: areaDestino,
      motivo: motivo,
      descripcion: this.escalarDescripcion() || undefined,
      fecha_compromiso: this.escalarFechaCompromiso() || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Ticket escalado correctamente. Se ha creado el caso.');
          this.loadTicket();
          this.modalService.dismissAll();

          // Navegar al caso creado
          if (response.data?.id) {
            this.router.navigate(['/casos', response.data.id]);
          }
        } else {
          this.notificationService.error(response.error || 'Error al escalar ticket');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al escalar ticket');
        this.savingAction.set(false);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
      this.notificationService.error('El archivo excede el tamaño máximo de 5MB');
      return;
    }

    this.savingAction.set(true);

    this.ticketService.subirAdjunto(this.ticketId(), file).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Archivo adjuntado correctamente');
          this.loadAdjuntos();
          this.loadBitacora();
        } else {
          this.notificationService.error(response.error || 'Error al subir archivo');
        }
        this.savingAction.set(false);
        input.value = '';
      },
      error: () => {
        this.notificationService.error('Error al subir archivo');
        this.savingAction.set(false);
        input.value = '';
      }
    });
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  goBack(): void {
    this.router.navigate(['/tickets/lista']);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatRelativeTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return this.formatDate(dateString);
  }

  getBitacoraIcon(tipo: string): string {
    const icons: Record<string, string> = {
      'nota': 'message-square',
      'cambio_estatus': 'refresh-cw',
      'asignacion': 'user-check',
      'adjunto': 'paperclip',
      'escalamiento': 'trending-up'
    };
    return icons[tipo] || 'activity';
  }

  getBitacoraColor(tipo: string): string {
    const colors: Record<string, string> = {
      'nota': '#04a9f5',
      'cambio_estatus': '#a389d4',
      'asignacion': '#1de9b6',
      'adjunto': '#f4c22b',
      'escalamiento': '#f44236'
    };
    return colors[tipo] || '#6c757d';
  }

  getFileIcon(tipo: string | undefined): string {
    if (!tipo) return 'file';
    if (tipo.startsWith('image/')) return 'image';
    if (tipo.includes('pdf')) return 'file-text';
    if (tipo.includes('word') || tipo.includes('document')) return 'file-text';
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return 'grid';
    return 'file';
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
