// ============================================================================
// Instalacion Detail Component
// ============================================================================
// Vista detallada de una instalación con tabs
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbNavModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { InstalacionService } from 'src/app/core/services/instalacion.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  InstalacionCompleta,
  InstalacionModulo,
  InstalacionChecklist,
  InstalacionPendiente,
  InstalacionEvidencia,
  ESTATUS_INSTALACION_CONFIG
} from 'src/app/core/models';

import { ChecklistExecutionComponent, ChecklistItemExecuteEvent } from '../../../mantenimientos/components/checklist-execution/checklist-execution.component';
import { EvidenciasUploadComponent, EvidenciaUploadEvent } from '../../../mantenimientos/components/evidencias-upload/evidencias-upload.component';
import { PendientesListComponent, CreatePendienteEvent, ResolverPendienteEvent } from '../../components/pendientes-list/pendientes-list.component';
import { FirmaDigitalComponent, FirmaData } from '../../components/firma-digital/firma-digital.component';

@Component({
  selector: 'app-instalacion-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbNavModule,
    NgbTooltipModule,
    SharedModule,
    ChecklistExecutionComponent,
    EvidenciasUploadComponent,
    PendientesListComponent,
    FirmaDigitalComponent
  ],
  templateUrl: './instalacion-detail.component.html',
  styleUrls: ['./instalacion-detail.component.scss']
})
export class InstalacionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private instalacionService = inject(InstalacionService);
  private notificationService = inject(NotificationService);

  // Estado
  loading = signal(false);
  actionLoading = signal(false);
  loadingChecklist = signal(false);
  loadingPendientes = signal(false);
  loadingEvidencias = signal(false);
  savingFirma = signal(false);

  // Datos
  instalacion = signal<InstalacionCompleta | null>(null);
  modulos = signal<InstalacionModulo[]>([]);
  checklistItems = signal<InstalacionChecklist[]>([]);
  pendientes = signal<InstalacionPendiente[]>([]);
  evidencias = signal<InstalacionEvidencia[]>([]);

  // UI
  activeTab = 'general';

  // Computed
  pendientesAbiertos = computed(() =>
    this.pendientes().filter(p => !p.resuelto).length
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInstalacion(id);
    } else {
      this.router.navigate(['/instalaciones']);
    }
  }

  private loadInstalacion(id: string): void {
    this.loading.set(true);

    this.instalacionService.getInstalacionById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.instalacion.set(response.data);
          this.loadRelatedData(id);
        } else {
          this.notificationService.error('Instalación no encontrada');
          this.router.navigate(['/instalaciones']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cargar la instalación');
        this.loading.set(false);
        this.router.navigate(['/instalaciones']);
      }
    });
  }

  private loadRelatedData(id: string): void {
    this.loadModulos(id);
    this.loadChecklist(id);
    this.loadPendientes(id);
    this.loadEvidencias(id);
  }

  private loadModulos(id: string): void {
    this.instalacionService.getModulos(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.modulos.set(response.data);
        }
      }
    });
  }

  private loadChecklist(id: string): void {
    this.loadingChecklist.set(true);
    this.instalacionService.getChecklist(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.checklistItems.set(response.data);
        }
        this.loadingChecklist.set(false);
      },
      error: () => {
        this.loadingChecklist.set(false);
      }
    });
  }

  private loadPendientes(id: string): void {
    this.loadingPendientes.set(true);
    this.instalacionService.getPendientes(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.pendientes.set(response.data);
        }
        this.loadingPendientes.set(false);
      },
      error: () => {
        this.loadingPendientes.set(false);
      }
    });
  }

  private loadEvidencias(id: string): void {
    this.loadingEvidencias.set(true);
    this.instalacionService.getEvidencias(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.evidencias.set(response.data);
        }
        this.loadingEvidencias.set(false);
      },
      error: () => {
        this.loadingEvidencias.set(false);
      }
    });
  }

  // Permisos
  canEdit(): boolean {
    const estatus = this.instalacion()?.estatus_nombre;
    return estatus !== 'Cerrada';
  }

  canExecuteChecklist(): boolean {
    const estatus = this.instalacion()?.estatus_nombre;
    return estatus === 'En proceso' || estatus === 'Pendientes';
  }

  canManagePendientes(): boolean {
    const estatus = this.instalacion()?.estatus_nombre;
    return estatus === 'En proceso' || estatus === 'Pendientes';
  }

  canUploadEvidencias(): boolean {
    const estatus = this.instalacion()?.estatus_nombre;
    return estatus !== 'Cerrada';
  }

  canCaptureFirma(): boolean {
    const estatus = this.instalacion()?.estatus_nombre;
    return estatus === 'En proceso' && !this.instalacion()?.firma_cliente_url;
  }

  // Acciones de estado
  iniciarInstalacion(): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.actionLoading.set(true);
    this.instalacionService.cambiarEstatus(id, 'En proceso').subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Instalación iniciada');
          this.loadInstalacion(id);
        } else {
          this.notificationService.error(response.error || 'Error al iniciar');
        }
        this.actionLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al iniciar la instalación');
        this.actionLoading.set(false);
      }
    });
  }

  marcarConPendientes(): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.actionLoading.set(true);
    this.instalacionService.cambiarEstatus(id, 'Pendientes').subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Instalación marcada con pendientes');
          this.loadInstalacion(id);
        } else {
          this.notificationService.error(response.error || 'Error al cambiar estatus');
        }
        this.actionLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cambiar estatus');
        this.actionLoading.set(false);
      }
    });
  }

  reanudarInstalacion(): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.actionLoading.set(true);
    this.instalacionService.cambiarEstatus(id, 'En proceso').subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Instalación reanudada');
          this.loadInstalacion(id);
        } else {
          this.notificationService.error(response.error || 'Error al reanudar');
        }
        this.actionLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al reanudar la instalación');
        this.actionLoading.set(false);
      }
    });
  }

  cerrarInstalacion(): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    if (!confirm('¿Está seguro de cerrar esta instalación? Esta acción no se puede deshacer.')) {
      return;
    }

    this.actionLoading.set(true);
    this.instalacionService.cerrarInstalacion(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Instalación cerrada exitosamente');
          this.loadInstalacion(id);
        } else {
          this.notificationService.error(response.error || 'Error al cerrar');
        }
        this.actionLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cerrar la instalación');
        this.actionLoading.set(false);
      }
    });
  }

  // Checklist
  onChecklistItemExecuted(event: ChecklistItemExecuteEvent): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.instalacionService.ejecutarChecklistItem(event.itemId, {
      completado: event.completado,
      notas: event.notas
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadChecklist(id);
          this.loadInstalacion(id);
        } else {
          this.notificationService.error(response.error || 'Error al actualizar item');
        }
      },
      error: () => {
        this.notificationService.error('Error al actualizar el checklist');
      }
    });
  }

  // Pendientes
  onCreatePendiente(event: CreatePendienteEvent): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.instalacionService.createPendiente(id, {
      descripcion: event.descripcion,
      prioridad: event.prioridad,
      responsable: event.responsable,
      fecha_compromiso: event.fecha_compromiso
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Pendiente agregado');
          this.loadPendientes(id);
          this.loadInstalacion(id);
        } else {
          this.notificationService.error(response.error || 'Error al agregar pendiente');
        }
      },
      error: () => {
        this.notificationService.error('Error al agregar el pendiente');
      }
    });
  }

  onResolverPendiente(event: ResolverPendienteEvent): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.instalacionService.resolverPendiente(event.pendienteId, { notas_resolucion: event.notas_resolucion }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Pendiente resuelto');
          this.loadPendientes(id);
          this.loadInstalacion(id);
        } else {
          this.notificationService.error(response.error || 'Error al resolver pendiente');
        }
      },
      error: () => {
        this.notificationService.error('Error al resolver el pendiente');
      }
    });
  }

  onGenerarTicket(pendienteId: string): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.instalacionService.generarTicketDesdePendiente(pendienteId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notificationService.success('Ticket generado exitosamente');
          this.loadPendientes(id);
          // Navigate to the new ticket
          this.router.navigate(['/tickets', response.data]);
        } else {
          this.notificationService.error(response.error || 'Error al generar ticket');
        }
      },
      error: () => {
        this.notificationService.error('Error al generar el ticket');
      }
    });
  }

  // Evidencias
  onUploadEvidencia(event: EvidenciaUploadEvent): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.instalacionService.subirEvidencia(id, event.file, event.tipo, event.descripcion).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Evidencia subida exitosamente');
          this.loadEvidencias(id);
        } else {
          this.notificationService.error(response.error || 'Error al subir evidencia');
        }
      },
      error: () => {
        this.notificationService.error('Error al subir la evidencia');
      }
    });
  }

  onDeleteEvidencia(evidenciaId: string): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.instalacionService.eliminarEvidencia(evidenciaId).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Evidencia eliminada');
          this.loadEvidencias(id);
        } else {
          this.notificationService.error(response.error || 'Error al eliminar evidencia');
        }
      },
      error: () => {
        this.notificationService.error('Error al eliminar la evidencia');
      }
    });
  }

  // Firma
  onFirmaConfirmada(firma: FirmaData): void {
    const id = this.instalacion()?.id;
    if (!id) return;

    this.savingFirma.set(true);
    this.instalacionService.firmarInstalacion(id, {
      firma_base64: firma.firma_base64,
      nombre_firmante: firma.nombre_firmante,
      puesto_firmante: firma.puesto_firmante
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Firma guardada exitosamente');
          this.loadInstalacion(id);
        } else {
          this.notificationService.error(response.error || 'Error al guardar firma');
        }
        this.savingFirma.set(false);
      },
      error: () => {
        this.notificationService.error('Error al guardar la firma');
        this.savingFirma.set(false);
      }
    });
  }

  // Helpers
  getEstatusColor(estatus: string): string {
    return ESTATUS_INSTALACION_CONFIG[estatus as keyof typeof ESTATUS_INSTALACION_CONFIG]?.color || '#6c757d';
  }

  getChecklistProgress(): number {
    const total = this.instalacion()?.checklist_total || 0;
    const completed = this.instalacion()?.checklist_completados || 0;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
