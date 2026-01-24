// ============================================================================
// Ticket Form Component
// ============================================================================
// Componente para crear y editar tickets
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { TicketService } from 'src/app/core/services/ticket.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  TicketConSLA,
  CategoriaServicio,
  CanalContacto,
  Prioridad,
  CreateTicketDTO
} from 'src/app/core/models';
import { PrioridadBadgeComponent } from '../../components';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    SharedModule,
    PrioridadBadgeComponent
  ],
  templateUrl: './ticket-form.component.html',
  styleUrls: ['./ticket-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketService = inject(TicketService);
  private notificationService = inject(NotificationService);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);
  ticket = signal<TicketConSLA | null>(null);

  // Catálogos
  categorias = signal<CategoriaServicio[]>([]);
  canales = signal<CanalContacto[]>([]);

  // Prioridades disponibles
  prioridades: { value: Prioridad; label: string }[] = [
    { value: 'Crítica', label: 'Crítica - Requiere atención inmediata' },
    { value: 'Alta', label: 'Alta - Impacto significativo' },
    { value: 'Media', label: 'Media - Impacto moderado' },
    { value: 'Baja', label: 'Baja - Sin urgencia' }
  ];

  // Archivos seleccionados para adjuntar
  selectedFiles = signal<File[]>([]);

  // Form
  ticketForm!: FormGroup;

  // Computed
  ticketId = computed(() => this.route.snapshot.paramMap.get('id'));
  pageTitle = computed(() => this.isEditMode() ? 'Editar Ticket' : 'Nuevo Ticket');

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.initForm();
    this.loadCatalogos();

    const id = this.ticketId();
    if (id) {
      this.isEditMode.set(true);
      this.loadTicket(id);
    }
  }

  // ============================================================================
  // Inicialización
  // ============================================================================

  private initForm(): void {
    this.ticketForm = this.fb.group({
      titulo: ['', [Validators.maxLength(200)]],
      descripcion: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
      categoria_id: ['', [Validators.required]],
      prioridad: ['Media', [Validators.required]],
      canal: ['Portal', [Validators.required]],
      cliente_id: [''],  // TODO: Agregar selector de cliente
      sucursal_id: ['']  // TODO: Agregar selector de sucursal
    });
  }

  private loadCatalogos(): void {
    // Cargar categorías
    this.ticketService.getCategorias().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categorias.set(response.data);
        }
      }
    });

    // Cargar canales
    this.ticketService.getCanales().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.canales.set(response.data);
        }
      }
    });
  }

  private loadTicket(id: string): void {
    this.loading.set(true);

    this.ticketService.getTicketById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.ticket.set(response.data);
          this.patchForm(response.data);
        } else {
          this.notificationService.error('Ticket no encontrado');
          this.router.navigate(['/tickets/lista']);
        }
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cargar el ticket');
        this.loading.set(false);
        this.router.navigate(['/tickets/lista']);
      }
    });
  }

  private patchForm(ticket: TicketConSLA): void {
    this.ticketForm.patchValue({
      titulo: ticket.titulo || '',
      descripcion: ticket.descripcion,
      categoria_id: ticket.categoria_id,
      prioridad: ticket.prioridad,
      canal: ticket.canal,
      cliente_id: ticket.cliente_id || '',
      sucursal_id: ticket.sucursal_id || ''
    });
  }

  // ============================================================================
  // Manejo de archivos
  // ============================================================================

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newFiles = Array.from(input.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];

    const validFiles = newFiles.filter(file => {
      if (file.size > maxSize) {
        this.notificationService.warning(`${file.name} excede el tamaño máximo de 5MB`);
        return false;
      }
      // Allow common types
      const isValid = allowedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type);
      if (!isValid && !file.name.match(/\.(txt|log|doc|docx|xls|xlsx)$/i)) {
        this.notificationService.warning(`${file.name} no es un tipo de archivo permitido`);
        return false;
      }
      return true;
    });

    this.selectedFiles.update(files => [...files, ...validFiles]);
    input.value = '';
  }

  removeFile(index: number): void {
    this.selectedFiles.update(files => files.filter((_, i) => i !== index));
  }

  getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.includes('pdf')) return 'file-text';
    return 'file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ============================================================================
  // Guardado
  // ============================================================================

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      this.markFormAsTouched();
      this.notificationService.warning('Por favor completa todos los campos requeridos');
      return;
    }

    this.saving.set(true);

    if (this.isEditMode()) {
      this.updateTicket();
    } else {
      this.createTicket();
    }
  }

  private createTicket(): void {
    const formValue = this.ticketForm.value;

    const ticketData: CreateTicketDTO = {
      titulo: formValue.titulo || undefined,
      descripcion: formValue.descripcion,
      categoria_id: formValue.categoria_id,
      prioridad: formValue.prioridad,
      canal: formValue.canal
    };

    // Solo agregar cliente/sucursal si tienen valor
    if (formValue.cliente_id) {
      ticketData.cliente_id = formValue.cliente_id;
    }
    if (formValue.sucursal_id) {
      ticketData.sucursal_id = formValue.sucursal_id;
    }

    this.ticketService.createTicket(ticketData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (response) => {
        if (response.success && response.data) {
          // Subir archivos adjuntos si hay
          if (this.selectedFiles().length > 0) {
            await this.uploadFiles(response.data.id);
          }

          this.notificationService.success('Ticket creado correctamente');
          this.router.navigate(['/tickets', response.data.id]);
        } else {
          this.notificationService.error(response.error || 'Error al crear el ticket');
        }
        this.saving.set(false);
      },
      error: () => {
        this.notificationService.error('Error al crear el ticket');
        this.saving.set(false);
      }
    });
  }

  private updateTicket(): void {
    const id = this.ticketId();
    if (!id) return;

    const formValue = this.ticketForm.value;

    this.ticketService.updateTicket(id, {
      titulo: formValue.titulo || undefined,
      descripcion: formValue.descripcion,
      categoria_id: formValue.categoria_id,
      prioridad: formValue.prioridad,
      canal: formValue.canal
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (response) => {
        if (response.success) {
          // Subir archivos adjuntos si hay nuevos
          if (this.selectedFiles().length > 0) {
            await this.uploadFiles(id);
          }

          this.notificationService.success('Ticket actualizado correctamente');
          this.router.navigate(['/tickets', id]);
        } else {
          this.notificationService.error(response.error || 'Error al actualizar el ticket');
        }
        this.saving.set(false);
      },
      error: () => {
        this.notificationService.error('Error al actualizar el ticket');
        this.saving.set(false);
      }
    });
  }

  private async uploadFiles(ticketId: string): Promise<void> {
    const files = this.selectedFiles();
    for (const file of files) {
      await this.ticketService.subirAdjunto(ticketId, file).toPromise();
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private markFormAsTouched(): void {
    Object.keys(this.ticketForm.controls).forEach(key => {
      this.ticketForm.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.ticketForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.ticketForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  cancel(): void {
    if (this.isEditMode() && this.ticketId()) {
      this.router.navigate(['/tickets', this.ticketId()]);
    } else {
      this.router.navigate(['/tickets/lista']);
    }
  }
}
