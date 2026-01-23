// ============================================================================
// Horario Form Component
// ============================================================================
// Componente para crear y editar horarios/turnos
// ============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { HorarioService } from 'src/app/core/services/horario.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { HorarioWithCount, DIAS_SEMANA_NOMBRES } from 'src/app/core/models';

@Component({
  selector: 'app-horario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './horario-form.component.html',
  styleUrls: ['./horario-form.component.scss']
})
export class HorarioFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private horarioService = inject(HorarioService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  isEditMode = signal(false);
  horarioId = signal<string | null>(null);
  loadingData = signal(true);
  submitting = signal(false);

  // Horario actual (para edición)
  currentHorario = signal<HorarioWithCount | null>(null);

  // Días de la semana para checkboxes
  diasSemana = [
    { value: 1, label: 'Lunes', short: 'Lun' },
    { value: 2, label: 'Martes', short: 'Mar' },
    { value: 3, label: 'Miércoles', short: 'Mié' },
    { value: 4, label: 'Jueves', short: 'Jue' },
    { value: 5, label: 'Viernes', short: 'Vie' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
    { value: 0, label: 'Domingo', short: 'Dom' }
  ];

  // Estado de los checkboxes de días
  selectedDias = signal<Set<number>>(new Set([1, 2, 3, 4, 5])); // Lun-Vie por defecto

  // Formulario
  horarioForm!: FormGroup;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.initForm();
    this.checkEditMode();
  }

  // ============================================================================
  // Inicialización
  // ============================================================================

  private initForm(): void {
    this.horarioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      hora_inicio: ['08:00', [Validators.required]],
      hora_fin: ['17:00', [Validators.required]],
      es_horario_habil: [true],
      estatus: ['Activo', [Validators.required]]
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.horarioId.set(id);
      this.loadHorarioData(id);
    } else {
      this.loadingData.set(false);
    }
  }

  private loadHorarioData(id: string): void {
    this.loadingData.set(true);

    this.horarioService.getHorarioById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentHorario.set(response.data);
          this.populateForm(response.data);
        } else {
          this.notificationService.error('Horario no encontrado');
          this.router.navigate(['/horarios']);
        }
        this.loadingData.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cargar datos del horario');
        this.router.navigate(['/horarios']);
        this.loadingData.set(false);
      }
    });
  }

  private populateForm(horario: HorarioWithCount): void {
    this.horarioForm.patchValue({
      nombre: horario.nombre,
      descripcion: horario.descripcion || '',
      hora_inicio: horario.hora_inicio.slice(0, 5), // "HH:MM:SS" -> "HH:MM"
      hora_fin: horario.hora_fin.slice(0, 5),
      es_horario_habil: horario.es_horario_habil,
      estatus: horario.estatus
    });

    // Cargar días seleccionados (convertir strings a números si es necesario)
    const diasNumeros = horario.dias_semana.map(d => typeof d === 'string' ? parseInt(d, 10) : d);
    this.selectedDias.set(new Set(diasNumeros));
  }

  // ============================================================================
  // Gestión de días de la semana
  // ============================================================================

  toggleDia(dia: number): void {
    const current = this.selectedDias();
    const newSet = new Set(current);

    if (newSet.has(dia)) {
      newSet.delete(dia);
    } else {
      newSet.add(dia);
    }

    this.selectedDias.set(newSet);
  }

  isDiaSelected(dia: number): boolean {
    return this.selectedDias().has(dia);
  }

  selectLunesViernes(): void {
    this.selectedDias.set(new Set([1, 2, 3, 4, 5]));
  }

  selectTodosDias(): void {
    this.selectedDias.set(new Set([0, 1, 2, 3, 4, 5, 6]));
  }

  clearDias(): void {
    this.selectedDias.set(new Set());
  }

  // ============================================================================
  // Acciones del formulario
  // ============================================================================

  onSubmit(): void {
    if (this.horarioForm.invalid) {
      this.markFormAsTouched();
      this.notificationService.warning('Por favor, corrija los errores del formulario');
      return;
    }

    if (this.selectedDias().size === 0) {
      this.notificationService.warning('Debe seleccionar al menos un día de la semana');
      return;
    }

    this.submitting.set(true);

    if (this.isEditMode()) {
      this.updateHorario();
    } else {
      this.createHorario();
    }
  }

  private createHorario(): void {
    const formData = this.horarioForm.value;

    this.horarioService.createHorario({
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      hora_inicio: formData.hora_inicio + ':00', // "HH:MM" -> "HH:MM:00"
      hora_fin: formData.hora_fin + ':00',
      dias_semana: Array.from(this.selectedDias()),
      es_horario_habil: formData.es_horario_habil,
      estatus: formData.estatus
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Horario creado correctamente');
          this.router.navigate(['/horarios']);
        } else {
          this.notificationService.error(response.error || 'Error al crear horario');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Error creating horario:', err);
        this.notificationService.error('Error al crear horario');
        this.submitting.set(false);
      }
    });
  }

  private updateHorario(): void {
    const horarioId = this.horarioId();
    if (!horarioId) return;

    const formData = this.horarioForm.value;

    this.horarioService.updateHorario(horarioId, {
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      hora_inicio: formData.hora_inicio.length === 5 ? formData.hora_inicio + ':00' : formData.hora_inicio,
      hora_fin: formData.hora_fin.length === 5 ? formData.hora_fin + ':00' : formData.hora_fin,
      dias_semana: Array.from(this.selectedDias()),
      es_horario_habil: formData.es_horario_habil,
      estatus: formData.estatus
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Horario actualizado correctamente');
          this.router.navigate(['/horarios']);
        } else {
          this.notificationService.error(response.error || 'Error al actualizar horario');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Error updating horario:', err);
        this.notificationService.error('Error al actualizar horario');
        this.submitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/horarios']);
  }

  // ============================================================================
  // Helpers de validación
  // ============================================================================

  private markFormAsTouched(): void {
    Object.keys(this.horarioForm.controls).forEach(key => {
      this.horarioForm.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.horarioForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.horarioForm.get(fieldName);
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
