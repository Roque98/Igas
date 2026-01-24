// ============================================================================
// Caso Detail Component
// ============================================================================
// Componente para mostrar el detalle de un caso con bitácora y acciones
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModalModule, NgbModal, NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { CasoService } from 'src/app/core/services/caso.service';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  CasoConSLA,
  CasoBitacora,
  CasoAdjunto,
  EstatusCaso,
  ProfileBasic,
  AREAS_DESTINO,
  MOTIVOS_ESCALAMIENTO,
  CASO_BITACORA_TIPOS
} from 'src/app/core/models';
import {
  SemaforoBadgeComponent,
  PrioridadBadgeComponent,
  ProgressBarSLAComponent
} from '../../../tickets/components';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-caso-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbModalModule,
    NgbTooltipModule,
    NgbDropdownModule,
    SharedModule,
    SemaforoBadgeComponent,
    PrioridadBadgeComponent,
    ProgressBarSLAComponent
  ],
  templateUrl: './caso-detail.component.html',
  styleUrls: ['./caso-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CasoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private casoService = inject(CasoService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  caso = signal<CasoConSLA | null>(null);
  bitacora = signal<CasoBitacora[]>([]);
  adjuntos = signal<CasoAdjunto[]>([]);
  loading = signal(true);
  loadingBitacora = signal(false);
  error = signal<string | null>(null);

  // Catálogos
  estatus = signal<EstatusCaso[]>([]);
  usuarios = signal<ProfileBasic[]>([]);

  // Modales
  nuevaNota = signal('');
  nuevoEstatusId = signal<string | null>(null);
  notaCambioEstatus = signal('');
  nuevoResponsableId = signal<string | null>(null);
  motivoAsignacion = signal('');
  numeroCasoExterno = signal('');
  notasResolucion = signal('');
  motivoRegreso = signal('');
  savingAction = signal(false);

  // Computed
  casoId = computed(() => this.route.snapshot.paramMap.get('id') || '');

  // Constantes
  areasDestino = AREAS_DESTINO;
  motivosEscalamiento = MOTIVOS_ESCALAMIENTO;
  bitacoraTipos = CASO_BITACORA_TIPOS;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadCaso();
    this.loadCatalogos();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  private loadCatalogos(): void {
    // Cargar estatus
    this.casoService.getEstatus().subscribe({
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

  loadCaso(): void {
    this.loading.set(true);
    this.error.set(null);

    const id = this.casoId();
    if (!id) {
      this.error.set('ID de caso no válido');
      this.loading.set(false);
      return;
    }

    this.casoService.getCasoById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.caso.set(response.data);
          this.loadBitacora();
          this.loadAdjuntos();
        } else {
          this.error.set(response.error || 'Caso no encontrado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading caso:', err); }
        this.error.set('Error al cargar el caso');
        this.loading.set(false);
      }
    });
  }

  loadBitacora(): void {
    this.loadingBitacora.set(true);
    const id = this.casoId();

    this.casoService.getCasoBitacora(id).subscribe({
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
    const id = this.casoId();

    this.casoService.getCasoAdjuntos(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.adjuntos.set(response.data);
        }
      }
    });
  }

  // ============================================================================
  // Acciones - Cambiar Estatus
  // ============================================================================

  openCambiarEstatusModal(content: any): void {
    this.nuevoEstatusId.set(this.caso()?.estatus_id || null);
    this.notaCambioEstatus.set('');
    this.modalService.open(content, { centered: true });
  }

  confirmCambiarEstatus(): void {
    const estatusId = this.nuevoEstatusId();
    if (!estatusId) return;

    this.savingAction.set(true);

    this.casoService.cambiarEstatus(this.casoId(), {
      estatus_id: estatusId,
      nota: this.notaCambioEstatus() || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Estatus actualizado correctamente');
          this.loadCaso();
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

  // ============================================================================
  // Acciones - Asignar
  // ============================================================================

  openAsignarModal(content: any): void {
    this.nuevoResponsableId.set(this.caso()?.responsable_id || null);
    this.motivoAsignacion.set('');
    this.modalService.open(content, { centered: true });
  }

  confirmAsignar(): void {
    const responsableId = this.nuevoResponsableId();
    if (!responsableId) return;

    this.savingAction.set(true);

    this.casoService.asignarCaso(this.casoId(), responsableId, this.motivoAsignacion() || undefined).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Caso asignado correctamente');
          this.loadCaso();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al asignar caso');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al asignar caso');
        this.savingAction.set(false);
      }
    });
  }

  // ============================================================================
  // Acciones - Agregar Nota
  // ============================================================================

  openAgregarNotaModal(content: any): void {
    this.nuevaNota.set('');
    this.modalService.open(content, { centered: true });
  }

  confirmAgregarNota(): void {
    const nota = this.nuevaNota();
    if (!nota.trim()) return;

    this.savingAction.set(true);

    this.casoService.agregarNota(this.casoId(), nota).subscribe({
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
  // Acciones - Número de Caso Externo
  // ============================================================================

  openNumeroCasoModal(content: any): void {
    this.numeroCasoExterno.set(this.caso()?.numero_caso_externo || '');
    this.modalService.open(content, { centered: true });
  }

  confirmNumeroCaso(): void {
    const numero = this.numeroCasoExterno();
    if (!numero.trim()) return;

    this.savingAction.set(true);

    this.casoService.registrarNumeroCasoExterno(this.casoId(), numero).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Número de caso externo registrado');
          this.loadCaso();
          this.loadBitacora();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al registrar número');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al registrar número');
        this.savingAction.set(false);
      }
    });
  }

  // ============================================================================
  // Acciones - Marcar Listo para Validar
  // ============================================================================

  openMarcarListoModal(content: any): void {
    this.notasResolucion.set('');
    this.modalService.open(content, { centered: true });
  }

  confirmMarcarListo(): void {
    const notas = this.notasResolucion();
    if (!notas.trim()) {
      this.notificationService.warning('Ingresa las notas de resolución');
      return;
    }

    this.savingAction.set(true);

    this.casoService.marcarListoParaValidar(this.casoId(), { notas_resolucion: notas }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Caso marcado como listo para validar');
          this.loadCaso();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al marcar caso');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al marcar caso');
        this.savingAction.set(false);
      }
    });
  }

  // ============================================================================
  // Acciones - Regresar a Soporte
  // ============================================================================

  openRegresarSoporteModal(content: any): void {
    this.motivoRegreso.set('');
    this.modalService.open(content, { centered: true });
  }

  confirmRegresarSoporte(): void {
    const motivo = this.motivoRegreso();
    if (!motivo.trim()) {
      this.notificationService.warning('Ingresa el motivo del regreso');
      return;
    }

    this.savingAction.set(true);

    this.casoService.regresarASoporte(this.casoId(), { motivo }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Caso regresado a soporte');
          this.loadCaso();
          this.modalService.dismissAll();
        } else {
          this.notificationService.error(response.error || 'Error al regresar caso');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al regresar caso');
        this.savingAction.set(false);
      }
    });
  }

  // ============================================================================
  // Acciones - Cerrar Caso
  // ============================================================================

  cerrarCaso(): void {
    if (!confirm('¿Estás seguro de cerrar este caso?')) return;

    this.savingAction.set(true);

    this.casoService.cerrarCaso(this.casoId(), { resultado: 'Cerrado' }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Caso cerrado correctamente');
          this.loadCaso();
        } else {
          this.notificationService.error(response.error || 'Error al cerrar caso');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cerrar caso');
        this.savingAction.set(false);
      }
    });
  }

  // ============================================================================
  // Acciones - Adjuntos
  // ============================================================================

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

    this.casoService.subirAdjunto(this.casoId(), file).subscribe({
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
    this.router.navigate(['/casos']);
  }

  getAreaColor(area: string): string {
    const found = AREAS_DESTINO.find(a => a.value === area);
    return found?.color || '#6c757d';
  }

  getMotivoInfo(motivo: string): { label: string; icon: string } {
    const found = MOTIVOS_ESCALAMIENTO.find(m => m.value === motivo);
    return found || { label: motivo, icon: 'help-circle' };
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
    return this.bitacoraTipos[tipo]?.icon || 'activity';
  }

  getBitacoraColor(tipo: string): string {
    return this.bitacoraTipos[tipo]?.color || '#6c757d';
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

  canMarkAsReady(): boolean {
    const c = this.caso();
    return !!c && !c.estatus_es_final && c.estatus_nombre !== 'Listo para validar';
  }

  canReturnToSupport(): boolean {
    const c = this.caso();
    return !!c && !c.estatus_es_final;
  }

  canClose(): boolean {
    const c = this.caso();
    return !!c && !c.estatus_es_final;
  }
}
