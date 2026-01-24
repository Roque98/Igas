// ============================================================================
// Firma Digital Component
// ============================================================================
// Canvas HTML5 para captura de firma digital
// ============================================================================

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

export interface FirmaData {
  firma_base64: string;
  nombre_firmante: string;
  puesto_firmante?: string;
}

@Component({
  selector: 'app-firma-digital',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbTooltipModule],
  template: `
    <div class="firma-digital">
      @if (!firmaExistente()) {
        <!-- Datos del firmante -->
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label">Nombre del firmante <span class="text-danger">*</span></label>
            <input type="text" class="form-control" [(ngModel)]="nombreFirmante"
                   placeholder="Nombre completo" [disabled]="disabled()">
          </div>
          <div class="col-md-6">
            <label class="form-label">Puesto</label>
            <input type="text" class="form-control" [(ngModel)]="puestoFirmante"
                   placeholder="Puesto o cargo" [disabled]="disabled()">
          </div>
        </div>

        <!-- Canvas de firma -->
        <div class="firma-container" [class.disabled]="disabled()">
          <label class="form-label">Firma <span class="text-danger">*</span></label>
          <div class="canvas-wrapper">
            <canvas #firmaCanvas
                    [width]="canvasWidth"
                    [height]="canvasHeight"
                    (mousedown)="startDrawing($event)"
                    (mousemove)="draw($event)"
                    (mouseup)="stopDrawing()"
                    (mouseleave)="stopDrawing()"
                    (touchstart)="startDrawingTouch($event)"
                    (touchmove)="drawTouch($event)"
                    (touchend)="stopDrawing()">
            </canvas>
            @if (!hasFirma()) {
              <div class="canvas-placeholder">
                <i class="feather icon-edit-2"></i>
                <span>Firme aquí</span>
              </div>
            }
          </div>
          <div class="d-flex justify-content-between mt-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="limpiarFirma()" [disabled]="disabled()">
              <i class="feather icon-trash-2 me-1"></i>Limpiar
            </button>
            <small class="text-muted">Dibuje su firma usando el mouse o touch</small>
          </div>
        </div>

        <!-- Botón de confirmar -->
        <div class="mt-4">
          <button type="button" class="btn btn-success w-100" (click)="confirmarFirma()"
                  [disabled]="!canConfirm() || disabled() || saving()">
            @if (saving()) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            }
            <i class="feather icon-check me-1"></i>Confirmar Firma
          </button>
        </div>
      } @else {
        <!-- Firma existente -->
        <div class="firma-existente text-center">
          <img [src]="firmaExistente()" class="img-fluid mb-3" style="max-height: 200px; border: 1px solid #dee2e6; border-radius: 8px;">
          <div class="mb-2">
            <strong>{{ nombreFirmanteExistente() }}</strong>
            @if (puestoFirmanteExistente()) {
              <br><small class="text-muted">{{ puestoFirmanteExistente() }}</small>
            }
          </div>
          <small class="text-muted">
            <i class="feather icon-check-circle text-success me-1"></i>
            Firmado el {{ formatDate(fechaFirma()) }}
          </small>
        </div>
      }
    </div>
  `,
  styles: [`
    .firma-container.disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .canvas-wrapper {
      position: relative;
      border: 2px dashed #dee2e6;
      border-radius: 8px;
      background: #fafafa;
      cursor: crosshair;
    }

    canvas {
      display: block;
      touch-action: none;
    }

    .canvas-placeholder {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #adb5bd;
      pointer-events: none;

      i {
        font-size: 2rem;
        display: block;
        margin-bottom: 8px;
      }
    }

    .firma-existente {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
  `]
})
export class FirmaDigitalComponent implements AfterViewInit {
  @ViewChild('firmaCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() set existingFirma(value: string | undefined) {
    this.firmaExistente.set(value || null);
  }
  @Input() set existingNombre(value: string | undefined) {
    this.nombreFirmanteExistente.set(value || '');
  }
  @Input() set existingPuesto(value: string | undefined) {
    this.puestoFirmanteExistente.set(value || '');
  }
  @Input() set existingFecha(value: string | undefined) {
    this.fechaFirma.set(value || '');
  }
  @Input() set isDisabled(value: boolean) {
    this.disabled.set(value);
  }
  @Input() set isSaving(value: boolean) {
    this.saving.set(value);
  }

  @Output() firmaConfirmada = new EventEmitter<FirmaData>();

  // Estado
  firmaExistente = signal<string | null>(null);
  nombreFirmanteExistente = signal('');
  puestoFirmanteExistente = signal('');
  fechaFirma = signal('');
  disabled = signal(false);
  saving = signal(false);
  hasFirma = signal(false);

  // Datos del formulario
  nombreFirmante = '';
  puestoFirmante = '';

  // Canvas
  canvasWidth = 400;
  canvasHeight = 200;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      this.ctx = canvas.getContext('2d');
      if (this.ctx) {
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
      }

      // Ajustar tamaño al contenedor
      const wrapper = canvas.parentElement;
      if (wrapper) {
        this.canvasWidth = wrapper.clientWidth;
        canvas.width = this.canvasWidth;
      }
    }
  }

  // Mouse events
  startDrawing(event: MouseEvent): void {
    if (this.disabled()) return;
    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing || !this.ctx || this.disabled()) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    this.hasFirma.set(true);
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  // Touch events
  startDrawingTouch(event: TouchEvent): void {
    event.preventDefault();
    if (this.disabled()) return;

    this.isDrawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    this.lastX = touch.clientX - rect.left;
    this.lastY = touch.clientY - rect.top;
  }

  drawTouch(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.ctx || this.disabled()) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
    this.hasFirma.set(true);
  }

  limpiarFirma(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.hasFirma.set(false);
    }
  }

  canConfirm(): boolean {
    return this.hasFirma() && this.nombreFirmante.trim().length > 0;
  }

  confirmarFirma(): void {
    if (!this.canConfirm()) return;

    const canvas = this.canvasRef.nativeElement;
    const firma_base64 = canvas.toDataURL('image/png');

    this.firmaConfirmada.emit({
      firma_base64,
      nombre_firmante: this.nombreFirmante.trim(),
      puesto_firmante: this.puestoFirmante.trim() || undefined
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
