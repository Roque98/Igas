// ============================================================================
// Mantenimiento Detail Component
// ============================================================================
// Detalle de mantenimiento con checklist y evidencias
// ============================================================================

import { Component, OnInit, inject, signal, TemplateRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbNavModule, NgbTooltipModule, NgbModalModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { MantenimientoService } from 'src/app/core/services/mantenimiento.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  MantenimientoCompleto,
  MantenimientoChecklist,
  MantenimientoEvidencia,
  MantenimientoResultado,
  EvidenciaTipo,
  RESULTADO_CONFIG
} from 'src/app/core/models';
import { ChecklistExecutionComponent, ChecklistItem, ChecklistItemExecuteEvent, ChecklistItemEvidenciaEvent } from '../../components/checklist-execution/checklist-execution.component';
import { EvidenciasUploadComponent, Evidencia, EvidenciaUploadEvent } from '../../components/evidencias-upload/evidencias-upload.component';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-mantenimiento-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbNavModule,
    NgbTooltipModule,
    NgbModalModule,
    SharedModule,
    ChecklistExecutionComponent,
    EvidenciasUploadComponent
  ],
  templateUrl: './mantenimiento-detail.component.html',
  styleUrls: ['./mantenimiento-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenimientoDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private mantenimientoService = inject(MantenimientoService);
  private notificationService = inject(NotificationService);
  private modalService = inject(NgbModal);

  // Estado
  mantenimiento = signal<MantenimientoCompleto | null>(null);
  checklist = signal<MantenimientoChecklist[]>([]);
  evidencias = signal<MantenimientoEvidencia[]>([]);

  loading = signal(true);
  loadingChecklist = signal(false);
  loadingEvidencias = signal(false);
  error = signal<string | null>(null);

  activeTab = signal(1);
  mantenimientoId = signal<string | null>(null);

  // Finalizar mantenimiento
  finalizarResultado = signal<MantenimientoResultado>('Completado');
  finalizarObservaciones = signal('');
  finalizarRecomendaciones = signal('');
  savingFinalizar = signal(false);

  // Upload evidencia
  uploadingEvidencia = signal(false);
  currentChecklistItemId = signal<string | null>(null);

  // Modal reference
  private activeModal: NgbModalRef | null = null;

  // Constantes
  resultadoConfig = RESULTADO_CONFIG;
  resultados: MantenimientoResultado[] = ['Completado', 'Parcial', 'Requiere acción', 'No realizado'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.mantenimientoId.set(id);
      this.loadMantenimiento(id);
    } else {
      this.error.set('ID de mantenimiento no válido');
      this.loading.set(false);
    }
  }

  private loadMantenimiento(id: string): void {
    this.loading.set(true);
    this.mantenimientoService.getMantenimientoById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.mantenimiento.set(response.data);
          this.loadChecklist(id);
          this.loadEvidencias(id);
        } else {
          this.error.set('Mantenimiento no encontrado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading mantenimiento:', err); }
        this.error.set('Error al cargar el mantenimiento');
        this.loading.set(false);
        this.notificationService.error('Error al cargar el mantenimiento');
      }
    });
  }

  loadChecklist(id: string): void {
    this.loadingChecklist.set(true);
    this.mantenimientoService.getChecklist(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.checklist.set(response.data);
        }
        this.loadingChecklist.set(false);
      },
      error: () => this.loadingChecklist.set(false)
    });
  }

  loadEvidencias(id: string): void {
    this.loadingEvidencias.set(true);
    this.mantenimientoService.getEvidencias(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.evidencias.set(response.data);
        }
        this.loadingEvidencias.set(false);
      },
      error: () => this.loadingEvidencias.set(false)
    });
  }

  // Navegación
  goBack(): void {
    this.router.navigate(['/mantenimientos', 'lista']);
  }

  editMantenimiento(): void {
    const id = this.mantenimientoId();
    if (id) {
      this.router.navigate(['/mantenimientos', id, 'editar']);
    }
  }

  // Iniciar mantenimiento
  iniciarMantenimiento(): void {
    const id = this.mantenimientoId();
    if (!id) return;

    this.mantenimientoService.iniciarMantenimiento(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Mantenimiento iniciado');
          this.loadMantenimiento(id);
        } else {
          this.notificationService.error(response.error || 'Error al iniciar');
        }
      },
      error: () => this.notificationService.error('Error al iniciar el mantenimiento')
    });
  }

  // Checklist
  get checklistItems(): ChecklistItem[] {
    return this.checklist().map(c => ({
      id: c.id,
      descripcion: c.descripcion,
      orden: c.orden,
      obligatorio: c.obligatorio,
      completado: c.completado,
      completado_at: c.completado_at,
      notas: c.notas,
      requiere_evidencia: c.requiere_evidencia,
      tiene_evidencia: c.tiene_evidencia
    }));
  }

  onChecklistItemExecuted(event: ChecklistItemExecuteEvent): void {
    this.mantenimientoService.ejecutarChecklistItem(event.itemId, {
      completado: event.completado,
      notas: event.notas
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          const id = this.mantenimientoId();
          if (id) {
            this.loadChecklist(id);
            this.loadMantenimiento(id); // Para actualizar contadores
          }
        } else {
          this.notificationService.error('Error al actualizar item');
        }
      }
    });
  }

  onChecklistUploadEvidencia(event: ChecklistItemEvidenciaEvent): void {
    this.currentChecklistItemId.set(event.itemId);
    // Cambiar a pestaña de evidencias
    this.activeTab.set(3);
  }

  // Evidencias
  get evidenciasList(): Evidencia[] {
    return this.evidencias().map(e => ({
      id: e.id,
      tipo: e.tipo,
      nombre_archivo: e.nombre_archivo,
      url: e.url,
      descripcion: e.descripcion,
      created_at: e.created_at
    }));
  }

  onUploadEvidencia(event: EvidenciaUploadEvent): void {
    const id = this.mantenimientoId();
    if (!id) return;

    this.uploadingEvidencia.set(true);
    this.mantenimientoService.subirEvidencia(
      id,
      event.file,
      event.tipo,
      event.checklistItemId || this.currentChecklistItemId() || undefined,
      event.descripcion
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Evidencia subida');
          this.loadEvidencias(id);
          this.loadChecklist(id);
          this.currentChecklistItemId.set(null);
        } else {
          this.notificationService.error(response.error || 'Error al subir');
        }
        this.uploadingEvidencia.set(false);
      },
      error: () => {
        this.notificationService.error('Error al subir evidencia');
        this.uploadingEvidencia.set(false);
      }
    });
  }

  onDeleteEvidencia(evidenciaId: string): void {
    this.mantenimientoService.eliminarEvidencia(evidenciaId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Evidencia eliminada');
          const id = this.mantenimientoId();
          if (id) this.loadEvidencias(id);
        } else {
          this.notificationService.error('Error al eliminar');
        }
      }
    });
  }

  // Finalizar mantenimiento
  openFinalizarModal(content: TemplateRef<unknown>): void {
    this.finalizarResultado.set('Completado');
    this.finalizarObservaciones.set('');
    this.finalizarRecomendaciones.set('');
    this.activeModal = this.modalService.open(content, { centered: true, size: 'lg' });
  }

  confirmFinalizar(): void {
    const id = this.mantenimientoId();
    if (!id) return;

    this.savingFinalizar.set(true);
    this.mantenimientoService.finalizarMantenimiento(id, {
      resultado: this.finalizarResultado(),
      observaciones: this.finalizarObservaciones() || undefined,
      recomendaciones: this.finalizarRecomendaciones() || undefined
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Mantenimiento finalizado');
          this.activeModal?.close();
          this.loadMantenimiento(id);
        } else {
          this.notificationService.error(response.error || 'Error al finalizar');
        }
        this.savingFinalizar.set(false);
      },
      error: () => {
        this.notificationService.error('Error al finalizar el mantenimiento');
        this.savingFinalizar.set(false);
      }
    });
  }

  // Generar ticket
  generarTicket(): void {
    const id = this.mantenimientoId();
    if (!id) return;

    this.mantenimientoService.generarTicketPorResultado(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notificationService.success('Ticket generado');
          this.router.navigate(['/tickets', response.data]);
        } else {
          this.notificationService.error(response.error || 'Error al generar ticket');
        }
      },
      error: () => this.notificationService.error('Error al generar ticket')
    });
  }

  // Helpers
  getChecklistProgress(): number {
    const mtn = this.mantenimiento();
    if (!mtn || !mtn.checklist_total || mtn.checklist_total === 0) return 0;
    return Math.round((mtn.checklist_completados || 0) / mtn.checklist_total * 100);
  }

  canFinalizar(): boolean {
    const mtn = this.mantenimiento();
    if (!mtn || mtn.estatus_es_final) return false;

    // Verificar que todos los obligatorios estén completados
    const obligatoriosPendientes = this.checklist().filter(c => c.obligatorio && !c.completado);
    return obligatoriosPendientes.length === 0;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(dateString: string | undefined): string {
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

  formatTime(timeString: string | undefined): string {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  }
}
