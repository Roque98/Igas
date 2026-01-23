// ============================================================================
// Equipo Form Component
// ============================================================================
// Componente para crear y editar equipos/áreas
// ============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { EquipoService } from 'src/app/core/services/equipo.service';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { EquipoWithRelations, ProfileWithRelations } from 'src/app/core/models';

@Component({
  selector: 'app-equipo-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './equipo-form.component.html',
  styleUrls: ['./equipo-form.component.scss']
})
export class EquipoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private equipoService = inject(EquipoService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  isEditMode = signal(false);
  equipoId = signal<string | null>(null);
  loadingData = signal(true);
  submitting = signal(false);

  // Catálogos
  supervisores = signal<ProfileWithRelations[]>([]);

  // Equipo actual (para edición)
  currentEquipo = signal<EquipoWithRelations | null>(null);

  // Formulario
  equipoForm!: FormGroup;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.initForm();
    this.loadCatalogos();
    this.checkEditMode();
  }

  // ============================================================================
  // Inicialización
  // ============================================================================

  private initForm(): void {
    this.equipoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      supervisor_id: [''],
      estatus: ['Activo', [Validators.required]]
    });
  }

  private loadCatalogos(): void {
    // Cargar usuarios activos que pueden ser supervisores
    this.userService.getUsers({ estatus: 'Activo' }, { page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.supervisores.set(response.data);
      }
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.equipoId.set(id);
      this.loadEquipoData(id);
    } else {
      this.loadingData.set(false);
    }
  }

  private loadEquipoData(id: string): void {
    this.loadingData.set(true);

    this.equipoService.getEquipoById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentEquipo.set(response.data);
          this.populateForm(response.data);
        } else {
          this.notificationService.error('Equipo no encontrado');
          this.router.navigate(['/equipos']);
        }
        this.loadingData.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cargar datos del equipo');
        this.router.navigate(['/equipos']);
        this.loadingData.set(false);
      }
    });
  }

  private populateForm(equipo: EquipoWithRelations): void {
    this.equipoForm.patchValue({
      nombre: equipo.nombre,
      descripcion: equipo.descripcion || '',
      supervisor_id: equipo.supervisor_id || '',
      estatus: equipo.estatus
    });
  }

  // ============================================================================
  // Acciones del formulario
  // ============================================================================

  onSubmit(): void {
    if (this.equipoForm.invalid) {
      this.markFormAsTouched();
      this.notificationService.warning('Por favor, corrija los errores del formulario');
      return;
    }

    this.submitting.set(true);

    if (this.isEditMode()) {
      this.updateEquipo();
    } else {
      this.createEquipo();
    }
  }

  private createEquipo(): void {
    const formData = this.equipoForm.value;

    this.equipoService.createEquipo({
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      supervisor_id: formData.supervisor_id || undefined,
      estatus: formData.estatus
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Equipo creado correctamente');
          this.router.navigate(['/equipos']);
        } else {
          this.notificationService.error(response.error || 'Error al crear equipo');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Error creating equipo:', err);
        this.notificationService.error('Error al crear equipo');
        this.submitting.set(false);
      }
    });
  }

  private updateEquipo(): void {
    const equipoId = this.equipoId();
    if (!equipoId) return;

    const formData = this.equipoForm.value;

    this.equipoService.updateEquipo(equipoId, {
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      supervisor_id: formData.supervisor_id || null,
      estatus: formData.estatus
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Equipo actualizado correctamente');
          this.router.navigate(['/equipos']);
        } else {
          this.notificationService.error(response.error || 'Error al actualizar equipo');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Error updating equipo:', err);
        this.notificationService.error('Error al actualizar equipo');
        this.submitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/equipos']);
  }

  // ============================================================================
  // Helpers de validación
  // ============================================================================

  private markFormAsTouched(): void {
    Object.keys(this.equipoForm.controls).forEach(key => {
      this.equipoForm.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.equipoForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.equipoForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['minlength']) {
      return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    if (field.errors['maxlength']) {
      return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }

    return 'Campo inválido';
  }
}
