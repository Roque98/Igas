// ============================================================================
// Pendientes List Component
// ============================================================================
// Lista y gestión de pendientes de instalación
// ============================================================================

import { Component, Input, Output, EventEmitter, signal, TemplateRef, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbTooltipModule, NgbModalModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { InstalacionPendiente, PendientePrioridad, PRIORIDAD_PENDIENTE_CONFIG } from 'src/app/core/models';

export interface CreatePendienteEvent {
  descripcion: string;
  prioridad: PendientePrioridad;
  responsable?: string;
  fecha_compromiso?: string;
}

export interface ResolverPendienteEvent {
  pendienteId: string;
  notas_resolucion?: string;
}

@Component({
  selector: 'app-pendientes-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbTooltipModule,
    NgbModalModule
  ],
  template: `
    <div class="pendientes-list">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">
          <i class="feather icon-alert-circle me-2"></i>
          Pendientes
          @if (pendientesAbiertos().length > 0) {
            <span class="badge bg-warning ms-1">{{ pendientesAbiertos().length }}</span>
          }
        </h6>
        @if (!disabled()) {
          <button type="button" class="btn btn-sm btn-primary" (click)="openCreateModal(createModal)">
            <i class="feather icon-plus me-1"></i>Agregar
          </button>
        }
      </div>

      <!-- Lista de pendientes -->
      @if (pendientes().length === 0) {
        <div class="text-center text-muted py-4">
          <i class="feather icon-check-circle" style="font-size: 2rem;"></i>
          <p class="mb-0 mt-2">No hay pendientes</p>
        </div>
      } @else {
        <!-- Pendientes abiertos -->
        @if (pendientesAbiertos().length > 0) {
          <h6 class="small text-muted mb-2">Abiertos ({{ pendientesAbiertos().length }})</h6>
          <ul class="list-group mb-3">
            @for (p of pendientesAbiertos(); track p.id) {
              <li class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 mb-1">
                      <span class="badge" [style.backgroundColor]="prioridadConfig[p.prioridad].color">
                        {{ p.prioridad }}
                      </span>
                      <span>{{ p.descripcion }}</span>
                    </div>
                    <div class="small text-muted">
                      @if (p.responsable) {
                        <span class="me-3">
                          <i class="feather icon-user me-1"></i>{{ p.responsable }}
                        </span>
                      }
                      @if (p.fecha_compromiso) {
                        <span [class.text-danger]="isOverdue(p.fecha_compromiso)">
                          <i class="feather icon-calendar me-1"></i>{{ formatDate(p.fecha_compromiso) }}
                        </span>
                      }
                    </div>
                    @if (p.ticket_folio) {
                      <a [routerLink]="['/tickets', p.ticket_id]" class="small text-info" (click)="$event.stopPropagation()">
                        <i class="feather icon-external-link me-1"></i>{{ p.ticket_folio }}
                      </a>
                    }
                  </div>
                  @if (!disabled()) {
                    <div class="d-flex gap-1">
                      <button type="button" class="btn btn-sm btn-outline-success"
                              ngbTooltip="Resolver" (click)="openResolverModal(resolverModal, p)">
                        <i class="feather icon-check"></i>
                      </button>
                      @if (!p.ticket_id) {
                        <button type="button" class="btn btn-sm btn-outline-warning"
                                ngbTooltip="Generar ticket" (click)="onGenerarTicket(p)">
                          <i class="feather icon-file-plus"></i>
                        </button>
                      }
                    </div>
                  }
                </div>
              </li>
            }
          </ul>
        }

        <!-- Pendientes resueltos -->
        @if (pendientesResueltos().length > 0) {
          <h6 class="small text-muted mb-2">Resueltos ({{ pendientesResueltos().length }})</h6>
          <ul class="list-group">
            @for (p of pendientesResueltos(); track p.id) {
              <li class="list-group-item bg-light">
                <div class="d-flex align-items-center">
                  <i class="feather icon-check-circle text-success me-2"></i>
                  <div class="flex-grow-1">
                    <span class="text-decoration-line-through text-muted">{{ p.descripcion }}</span>
                    @if (p.notas_resolucion) {
                      <small class="d-block text-muted mt-1">{{ p.notas_resolucion }}</small>
                    }
                  </div>
                  <small class="text-muted">{{ formatDate(p.resuelto_at!) }}</small>
                </div>
              </li>
            }
          </ul>
        }
      }

      <!-- Modal crear pendiente -->
      <ng-template #createModal let-modal>
        <div class="modal-header">
          <h5 class="modal-title">Agregar Pendiente</h5>
          <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Descripción <span class="text-danger">*</span></label>
            <textarea class="form-control" rows="2" [(ngModel)]="newDescripcion"
                      placeholder="Describa el pendiente..."></textarea>
          </div>
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Prioridad</label>
              <select class="form-select" [(ngModel)]="newPrioridad">
                @for (p of prioridades; track p) {
                  <option [value]="p">{{ p }}</option>
                }
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Fecha compromiso</label>
              <input type="date" class="form-control" [(ngModel)]="newFechaCompromiso">
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Responsable</label>
            <input type="text" class="form-control" [(ngModel)]="newResponsable"
                   placeholder="Nombre del responsable">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary" (click)="confirmCreate(); modal.close()"
                  [disabled]="!newDescripcion.trim()">
            Agregar Pendiente
          </button>
        </div>
      </ng-template>

      <!-- Modal resolver pendiente -->
      <ng-template #resolverModal let-modal>
        <div class="modal-header">
          <h5 class="modal-title">Resolver Pendiente</h5>
          <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
        </div>
        <div class="modal-body">
          <p>
            <strong>{{ pendienteSeleccionado()?.descripcion }}</strong>
          </p>
          <div class="mb-3">
            <label class="form-label">Notas de resolución (opcional)</label>
            <textarea class="form-control" rows="2" [(ngModel)]="resolverNotas"
                      placeholder="Cómo se resolvió el pendiente..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">
            Cancelar
          </button>
          <button type="button" class="btn btn-success" (click)="confirmResolver(); modal.close()">
            <i class="feather icon-check me-1"></i>Marcar como Resuelto
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .list-group-item {
      transition: background-color 0.2s;
    }
  `]
})
export class PendientesListComponent {
  private modalService = inject(NgbModal);

  @Input() set pendientesList(value: InstalacionPendiente[]) {
    this.pendientes.set(value || []);
  }
  @Input() set isDisabled(value: boolean) {
    this.disabled.set(value);
  }

  @Output() createPendiente = new EventEmitter<CreatePendienteEvent>();
  @Output() resolverPendiente = new EventEmitter<ResolverPendienteEvent>();
  @Output() generarTicket = new EventEmitter<string>();

  pendientes = signal<InstalacionPendiente[]>([]);
  disabled = signal(false);
  pendienteSeleccionado = signal<InstalacionPendiente | null>(null);

  // Form fields
  newDescripcion = '';
  newPrioridad: PendientePrioridad = 'Media';
  newResponsable = '';
  newFechaCompromiso = '';
  resolverNotas = '';

  prioridades: PendientePrioridad[] = ['Alta', 'Media', 'Baja'];
  prioridadConfig = PRIORIDAD_PENDIENTE_CONFIG;

  private activeModal: NgbModalRef | null = null;

  pendientesAbiertos(): InstalacionPendiente[] {
    return this.pendientes().filter(p => !p.resuelto);
  }

  pendientesResueltos(): InstalacionPendiente[] {
    return this.pendientes().filter(p => p.resuelto);
  }

  openCreateModal(content: TemplateRef<unknown>): void {
    this.newDescripcion = '';
    this.newPrioridad = 'Media';
    this.newResponsable = '';
    this.newFechaCompromiso = '';
    this.activeModal = this.modalService.open(content, { centered: true });
  }

  confirmCreate(): void {
    if (!this.newDescripcion.trim()) return;

    this.createPendiente.emit({
      descripcion: this.newDescripcion.trim(),
      prioridad: this.newPrioridad,
      responsable: this.newResponsable.trim() || undefined,
      fecha_compromiso: this.newFechaCompromiso || undefined
    });
  }

  openResolverModal(content: TemplateRef<unknown>, pendiente: InstalacionPendiente): void {
    this.pendienteSeleccionado.set(pendiente);
    this.resolverNotas = '';
    this.activeModal = this.modalService.open(content, { centered: true });
  }

  confirmResolver(): void {
    const pendiente = this.pendienteSeleccionado();
    if (!pendiente) return;

    this.resolverPendiente.emit({
      pendienteId: pendiente.id,
      notas_resolucion: this.resolverNotas.trim() || undefined
    });
  }

  onGenerarTicket(pendiente: InstalacionPendiente): void {
    if (confirm('¿Generar un ticket para este pendiente?')) {
      this.generarTicket.emit(pendiente.id);
    }
  }

  isOverdue(fecha: string): boolean {
    return new Date(fecha) < new Date();
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short'
    });
  }
}
