// ============================================================================
// Checklist Execution Component
// ============================================================================
// Componente reutilizable para ejecutar checklist de mantenimientos/instalaciones
// ============================================================================

import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';

export interface ChecklistItem {
  id: string;
  descripcion: string;
  orden: number;
  obligatorio: boolean;
  completado: boolean;
  completado_at?: string;
  notas?: string;
  requiere_evidencia: boolean;
  tiene_evidencia: boolean;
  modulo_nombre?: string; // Para instalaciones
}

export interface ChecklistItemExecuteEvent {
  itemId: string;
  completado: boolean;
  notas?: string;
}

export interface ChecklistItemEvidenciaEvent {
  itemId: string;
  descripcion: string;
}

@Component({
  selector: 'app-checklist-execution',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    NgbCollapseModule
  ],
  template: `
    <div class="checklist-execution">
      <!-- Progress -->
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-muted">
            Progreso: {{ completados() }} de {{ total() }} items
            @if (obligatoriosRestantes() > 0) {
              <span class="text-danger ms-2">({{ obligatoriosRestantes() }} obligatorios pendientes)</span>
            }
          </span>
          <span class="badge" [class]="progressClass()">{{ porcentaje() }}%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar" [class]="progressBarClass()" role="progressbar"
               [style.width.%]="porcentaje()">
          </div>
        </div>
      </div>

      <!-- Agrupado por módulo (si aplica) -->
      @if (agrupadoPorModulo()) {
        @for (grupo of itemsAgrupados(); track grupo.modulo) {
          <div class="card mb-3">
            <div class="card-header py-2 cursor-pointer" (click)="toggleGrupo(grupo.modulo)">
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-medium">
                  <i class="feather icon-box me-2"></i>{{ grupo.modulo }}
                </span>
                <span class="badge bg-light-secondary">
                  {{ grupo.completados }}/{{ grupo.total }}
                </span>
              </div>
            </div>
            <div [ngbCollapse]="gruposColapsados()[grupo.modulo]">
              <div class="card-body p-0">
                <ng-container *ngTemplateOutlet="itemsTemplate; context: { items: grupo.items }"></ng-container>
              </div>
            </div>
          </div>
        }
      } @else {
        <ng-container *ngTemplateOutlet="itemsTemplate; context: { items: items() }"></ng-container>
      }

      <!-- Template de items -->
      <ng-template #itemsTemplate let-items="items">
        <ul class="list-group list-group-flush">
          @for (item of items; track item.id) {
            <li class="list-group-item">
              <div class="d-flex align-items-start">
                <!-- Checkbox -->
                <div class="form-check me-3 mt-1">
                  <input type="checkbox" class="form-check-input"
                         [id]="'check-' + item.id"
                         [checked]="item.completado"
                         [disabled]="disabled()"
                         (change)="onCheckChange(item, $event)">
                </div>

                <!-- Contenido -->
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-start">
                    <label class="form-check-label mb-0" [for]="'check-' + item.id"
                           [class.text-decoration-line-through]="item.completado"
                           [class.text-muted]="item.completado">
                      {{ item.descripcion }}
                      @if (item.obligatorio) {
                        <span class="text-danger">*</span>
                      }
                    </label>
                    <div class="d-flex gap-1">
                      @if (item.requiere_evidencia) {
                        <span class="badge"
                              [class.bg-success]="item.tiene_evidencia"
                              [class.bg-secondary]="!item.tiene_evidencia"
                              ngbTooltip="Requiere evidencia">
                          <i class="feather icon-camera"></i>
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Notas expandibles -->
                  @if (item.completado && item.notas) {
                    <div class="mt-2 p-2 bg-light rounded small">
                      <strong>Notas:</strong> {{ item.notas }}
                    </div>
                  }

                  <!-- Input de notas (si está expandido) -->
                  @if (expandedItemId() === item.id && !item.completado) {
                    <div class="mt-2">
                      <textarea class="form-control form-control-sm" rows="2"
                                placeholder="Agregar notas (opcional)"
                                [(ngModel)]="currentNotas"></textarea>
                      <div class="d-flex gap-2 mt-2">
                        <button type="button" class="btn btn-sm btn-primary"
                                (click)="confirmCheck(item)">
                          <i class="feather icon-check me-1"></i>Confirmar
                        </button>
                        @if (item.requiere_evidencia && !item.tiene_evidencia) {
                          <button type="button" class="btn btn-sm btn-outline-secondary"
                                  (click)="onUploadEvidencia(item)">
                            <i class="feather icon-upload me-1"></i>Subir Evidencia
                          </button>
                        }
                        <button type="button" class="btn btn-sm btn-outline-secondary"
                                (click)="cancelCheck()">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  }

                  <!-- Fecha de completado -->
                  @if (item.completado && item.completado_at) {
                    <small class="text-muted d-block mt-1">
                      <i class="feather icon-check-circle me-1"></i>
                      Completado el {{ formatDate(item.completado_at) }}
                    </small>
                  }
                </div>
              </div>
            </li>
          }
        </ul>
      </ng-template>
    </div>
  `,
  styles: [`
    .cursor-pointer { cursor: pointer; }
    .form-check-input:checked + .form-check-label { text-decoration: line-through; }
  `]
})
export class ChecklistExecutionComponent {
  @Input() set checklistItems(value: ChecklistItem[]) {
    this.items.set(value || []);
  }
  @Input() set isDisabled(value: boolean) {
    this.disabled.set(value);
  }
  @Input() showModuleGroups = false;

  @Output() itemExecuted = new EventEmitter<ChecklistItemExecuteEvent>();
  @Output() uploadEvidencia = new EventEmitter<ChecklistItemEvidenciaEvent>();

  items = signal<ChecklistItem[]>([]);
  disabled = signal(false);
  expandedItemId = signal<string | null>(null);
  currentNotas = '';
  gruposColapsados = signal<Record<string, boolean>>({});

  total = computed(() => this.items().length);
  completados = computed(() => this.items().filter(i => i.completado).length);
  porcentaje = computed(() => {
    const t = this.total();
    return t > 0 ? Math.round((this.completados() / t) * 100) : 0;
  });
  obligatoriosRestantes = computed(() =>
    this.items().filter(i => i.obligatorio && !i.completado).length
  );

  agrupadoPorModulo = computed(() =>
    this.showModuleGroups && this.items().some(i => i.modulo_nombre)
  );

  itemsAgrupados = computed(() => {
    if (!this.agrupadoPorModulo()) return [];

    const grupos = new Map<string, { items: ChecklistItem[]; completados: number; total: number }>();

    this.items().forEach(item => {
      const modulo = item.modulo_nombre || 'General';
      if (!grupos.has(modulo)) {
        grupos.set(modulo, { items: [], completados: 0, total: 0 });
      }
      const grupo = grupos.get(modulo)!;
      grupo.items.push(item);
      grupo.total++;
      if (item.completado) grupo.completados++;
    });

    return Array.from(grupos.entries()).map(([modulo, data]) => ({
      modulo,
      ...data
    }));
  });

  progressClass(): string {
    const p = this.porcentaje();
    if (p === 100) return 'bg-success';
    if (p >= 70) return 'bg-primary';
    if (p >= 30) return 'bg-warning';
    return 'bg-secondary';
  }

  progressBarClass(): string {
    const p = this.porcentaje();
    if (p === 100) return 'bg-success';
    if (p >= 70) return 'bg-primary';
    if (p >= 30) return 'bg-warning';
    return 'bg-secondary';
  }

  toggleGrupo(modulo: string): void {
    this.gruposColapsados.update(g => ({
      ...g,
      [modulo]: !g[modulo]
    }));
  }

  onCheckChange(item: ChecklistItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      // Expandir para agregar notas
      this.expandedItemId.set(item.id);
      this.currentNotas = '';
    } else {
      // Desmarcar directamente
      this.itemExecuted.emit({
        itemId: item.id,
        completado: false,
        notas: undefined
      });
    }
  }

  confirmCheck(item: ChecklistItem): void {
    this.itemExecuted.emit({
      itemId: item.id,
      completado: true,
      notas: this.currentNotas || undefined
    });
    this.expandedItemId.set(null);
    this.currentNotas = '';
  }

  cancelCheck(): void {
    this.expandedItemId.set(null);
    this.currentNotas = '';
  }

  onUploadEvidencia(item: ChecklistItem): void {
    this.uploadEvidencia.emit({
      itemId: item.id,
      descripcion: item.descripcion
    });
  }

  formatDate(dateString: string): string {
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
