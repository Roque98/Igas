// ============================================================================
// Evidencias Upload Component
// ============================================================================
// Componente reutilizable para gestionar evidencias (fotos/documentos)
// ============================================================================

import { Component, Input, Output, EventEmitter, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule, NgbModalModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { EvidenciaTipo, EVIDENCIA_TIPO_CONFIG } from 'src/app/core/models';

export interface Evidencia {
  id: string;
  tipo: EvidenciaTipo;
  nombre_archivo: string;
  url?: string;
  descripcion?: string;
  created_at: string;
}

export interface EvidenciaUploadEvent {
  file: File;
  tipo: EvidenciaTipo;
  descripcion?: string;
  checklistItemId?: string;
}

@Component({
  selector: 'app-evidencias-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    NgbModalModule
  ],
  template: `
    <div class="evidencias-upload">
      <!-- Header con botón de subir -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">
          <i class="feather icon-image me-2"></i>
          Evidencias ({{ evidencias().length }})
        </h6>
        @if (!disabled()) {
          <button type="button" class="btn btn-sm btn-primary" (click)="openUploadModal(uploadModal)">
            <i class="feather icon-upload me-1"></i>Subir
          </button>
        }
      </div>

      <!-- Lista de evidencias -->
      @if (evidencias().length === 0) {
        <div class="text-center text-muted py-4">
          <i class="feather icon-image" style="font-size: 2rem;"></i>
          <p class="mb-0 mt-2">No hay evidencias</p>
        </div>
      } @else {
        <div class="row g-3">
          @for (ev of evidencias(); track ev.id) {
            <div class="col-6 col-md-4 col-lg-3">
              <div class="card h-100 evidencia-card">
                <!-- Preview -->
                <div class="evidencia-preview" (click)="openPreview(ev, previewModal)">
                  @if (isImage(ev.tipo)) {
                    <img [src]="ev.url" [alt]="ev.nombre_archivo" class="img-fluid">
                  } @else {
                    <div class="file-icon">
                      <i [class]="getIconClass(ev.tipo)"></i>
                    </div>
                  }
                </div>
                <!-- Info -->
                <div class="card-body p-2">
                  <p class="mb-1 small text-truncate" [ngbTooltip]="ev.nombre_archivo">
                    {{ ev.nombre_archivo }}
                  </p>
                  <small class="text-muted">{{ formatDate(ev.created_at) }}</small>
                </div>
                <!-- Actions -->
                @if (!disabled()) {
                  <div class="card-footer p-2 d-flex justify-content-end gap-1">
                    <button type="button" class="btn btn-sm btn-icon btn-outline-primary"
                            ngbTooltip="Descargar" (click)="download(ev)">
                      <i class="feather icon-download"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-icon btn-outline-danger"
                            ngbTooltip="Eliminar" (click)="confirmDelete(ev)">
                      <i class="feather icon-trash-2"></i>
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal de subir -->
      <ng-template #uploadModal let-modal>
        <div class="modal-header">
          <h5 class="modal-title">Subir Evidencia</h5>
          <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
        </div>
        <div class="modal-body">
          <!-- Tipo -->
          <div class="mb-3">
            <label class="form-label">Tipo de archivo</label>
            <select class="form-select" [(ngModel)]="uploadTipo">
              @for (tipo of tiposEvidencia; track tipo) {
                <option [value]="tipo">{{ getTipoLabel(tipo) }}</option>
              }
            </select>
          </div>

          <!-- Archivo -->
          <div class="mb-3">
            <label class="form-label">Archivo</label>
            <input type="file" class="form-control" #fileInput
                   [accept]="getAcceptTypes()"
                   (change)="onFileSelected($event)">
            @if (selectedFile()) {
              <small class="text-muted">
                {{ selectedFile()?.name }} ({{ formatFileSize(selectedFile()?.size || 0) }})
              </small>
            }
          </div>

          <!-- Descripción -->
          <div class="mb-3">
            <label class="form-label">Descripción (opcional)</label>
            <input type="text" class="form-control" [(ngModel)]="uploadDescripcion"
                   placeholder="Descripción de la evidencia">
          </div>

          <!-- Preview -->
          @if (previewUrl()) {
            <div class="text-center">
              <img [src]="previewUrl()" class="img-fluid rounded" style="max-height: 200px;">
            </div>
          }
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary" [disabled]="!selectedFile() || uploading()"
                  (click)="upload(); modal.close()">
            @if (uploading()) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            }
            Subir
          </button>
        </div>
      </ng-template>

      <!-- Modal de preview -->
      <ng-template #previewModal let-modal>
        <div class="modal-header">
          <h5 class="modal-title">{{ previewEvidencia()?.nombre_archivo }}</h5>
          <button type="button" class="btn-close" (click)="modal.dismiss()"></button>
        </div>
        <div class="modal-body text-center">
          @if (previewEvidencia() && isImage(previewEvidencia()!.tipo)) {
            <img [src]="previewEvidencia()!.url" class="img-fluid">
          } @else {
            <div class="py-5">
              <i [class]="getIconClass(previewEvidencia()?.tipo || 'otro')" style="font-size: 4rem;"></i>
              <p class="mt-3">{{ previewEvidencia()?.nombre_archivo }}</p>
              <a [href]="previewEvidencia()?.url" target="_blank" class="btn btn-primary">
                <i class="feather icon-external-link me-1"></i>Abrir archivo
              </a>
            </div>
          }
          @if (previewEvidencia()?.descripcion) {
            <p class="mt-3 text-muted">{{ previewEvidencia()!.descripcion }}</p>
          }
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .evidencia-card {
      transition: transform 0.2s;
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    }
    .evidencia-preview {
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
      cursor: pointer;
      overflow: hidden;
      img { object-fit: cover; width: 100%; height: 100%; }
    }
    .file-icon {
      font-size: 3rem;
      color: #6c757d;
    }
    .btn-icon {
      width: 28px;
      height: 28px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class EvidenciasUploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Input() set evidenciasList(value: Evidencia[]) {
    this.evidencias.set(value || []);
  }
  @Input() set isDisabled(value: boolean) {
    this.disabled.set(value);
  }
  @Input() checklistItemId?: string;

  @Output() uploadFile = new EventEmitter<EvidenciaUploadEvent>();
  @Output() deleteFile = new EventEmitter<string>();

  private modalService = new NgbModal();

  evidencias = signal<Evidencia[]>([]);
  disabled = signal(false);
  uploading = signal(false);
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  previewEvidencia = signal<Evidencia | null>(null);

  uploadTipo: EvidenciaTipo = 'foto';
  uploadDescripcion = '';

  tiposEvidencia: EvidenciaTipo[] = ['foto', 'documento', 'video', 'otro'];
  tipoConfig = EVIDENCIA_TIPO_CONFIG;

  constructor(private ngbModal: NgbModal) {
    this.modalService = ngbModal;
  }

  openUploadModal(content: any): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.uploadTipo = 'foto';
    this.uploadDescripcion = '';
    this.modalService.open(content, { centered: true });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile.set(file);

      // Auto-detect tipo
      if (file.type.startsWith('image/')) {
        this.uploadTipo = 'foto';
        // Preview
        const reader = new FileReader();
        reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf' || file.type.includes('document')) {
        this.uploadTipo = 'documento';
        this.previewUrl.set(null);
      } else if (file.type.startsWith('video/')) {
        this.uploadTipo = 'video';
        this.previewUrl.set(null);
      } else {
        this.uploadTipo = 'otro';
        this.previewUrl.set(null);
      }
    }
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.uploadFile.emit({
      file,
      tipo: this.uploadTipo,
      descripcion: this.uploadDescripcion || undefined,
      checklistItemId: this.checklistItemId
    });

    // Reset después de emitir
    setTimeout(() => {
      this.uploading.set(false);
      this.selectedFile.set(null);
      this.previewUrl.set(null);
      this.uploadDescripcion = '';
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
    }, 500);
  }

  openPreview(ev: Evidencia, content: any): void {
    this.previewEvidencia.set(ev);
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  download(ev: Evidencia): void {
    if (ev.url) {
      window.open(ev.url, '_blank');
    }
  }

  confirmDelete(ev: Evidencia): void {
    if (confirm(`¿Eliminar "${ev.nombre_archivo}"?`)) {
      this.deleteFile.emit(ev.id);
    }
  }

  isImage(tipo: EvidenciaTipo): boolean {
    return tipo === 'foto';
  }

  getIconClass(tipo: EvidenciaTipo): string {
    return this.tipoConfig[tipo]?.icon || 'feather icon-file';
  }

  getTipoLabel(tipo: EvidenciaTipo): string {
    return this.tipoConfig[tipo]?.label || tipo;
  }

  getAcceptTypes(): string {
    switch (this.uploadTipo) {
      case 'foto': return 'image/*';
      case 'documento': return '.pdf,.doc,.docx,.xls,.xlsx';
      case 'video': return 'video/*';
      default: return '*/*';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short'
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
