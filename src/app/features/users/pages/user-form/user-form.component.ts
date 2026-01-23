// ============================================================================
// User Form Component
// ============================================================================
// Componente para crear y editar usuarios
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  emailFormat,
  strongPassword,
  noWhitespace,
  calculatePasswordStrength,
  getPasswordStrengthMessage
} from 'src/app/core/validators';
import { ProfileWithRelations } from 'src/app/core/models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  isEditMode = signal(false);
  userId = signal<string | null>(null);
  loading = signal(false);
  loadingData = signal(true);
  submitting = signal(false);

  // Catálogos
  roles = signal<any[]>([]);
  equipos = signal<any[]>([]);
  horarios = signal<any[]>([]);

  // Usuario actual (para edición)
  currentUser = signal<ProfileWithRelations | null>(null);

  // Password strength
  passwordStrength = signal(0);
  passwordStrengthInfo = computed(() => getPasswordStrengthMessage(this.passwordStrength()));

  // Formulario
  userForm!: FormGroup;

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
    this.userForm = this.fb.group({
      nombre_completo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      email: ['', [Validators.required, emailFormat()]],
      password: ['', [Validators.required, Validators.minLength(8), strongPassword(), noWhitespace()]],
      rol_id: ['', [Validators.required]],
      area_equipo_id: [''],
      telefono: ['', [Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      turno_horario_id: ['']
    });

    // Observar cambios en password para calcular fortaleza
    this.userForm.get('password')?.valueChanges.subscribe(value => {
      this.passwordStrength.set(calculatePasswordStrength(value || ''));
    });
  }

  private loadCatalogos(): void {
    // Cargar roles, equipos y horarios en paralelo
    this.userService.getRoles().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.roles.set(response.data);
        }
      }
    });

    this.userService.getEquipos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.equipos.set(response.data);
        }
      }
    });

    this.userService.getHorarios().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.horarios.set(response.data);
        }
      }
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.userId.set(id);
      this.loadUserData(id);
      // En modo edición, el password no es requerido
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    } else {
      this.loadingData.set(false);
    }
  }

  private loadUserData(id: string): void {
    this.loadingData.set(true);

    this.userService.getUserById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
          this.populateForm(response.data);
        } else {
          this.notificationService.error('Usuario no encontrado');
          this.router.navigate(['/usuarios']);
        }
        this.loadingData.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cargar datos del usuario');
        this.router.navigate(['/usuarios']);
        this.loadingData.set(false);
      }
    });
  }

  private populateForm(user: ProfileWithRelations): void {
    this.userForm.patchValue({
      nombre_completo: user.nombre_completo,
      email: user.email,
      rol_id: user.rol_id,
      area_equipo_id: user.area_equipo_id || '',
      telefono: user.telefono || '',
      turno_horario_id: user.turno_horario_id || ''
    });
  }

  // ============================================================================
  // Acciones del formulario
  // ============================================================================

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormAsTouched();
      this.notificationService.warning('Por favor, corrija los errores del formulario');
      return;
    }

    this.submitting.set(true);

    if (this.isEditMode()) {
      this.updateUser();
    } else {
      this.createUser();
    }
  }

  private createUser(): void {
    const formData = this.userForm.value;

    this.userService.createUser({
      email: formData.email,
      password: formData.password,
      nombre_completo: formData.nombre_completo,
      rol_id: formData.rol_id,
      area_equipo_id: formData.area_equipo_id || undefined,
      telefono: formData.telefono || undefined,
      turno_horario_id: formData.turno_horario_id || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Usuario creado correctamente');
          this.router.navigate(['/usuarios']);
        } else {
          this.notificationService.error(response.error || 'Error al crear usuario');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Error creating user:', err);
        this.notificationService.error('Error al crear usuario');
        this.submitting.set(false);
      }
    });
  }

  private updateUser(): void {
    const userId = this.userId();
    if (!userId) return;

    const formData = this.userForm.value;

    this.userService.updateUser(userId, {
      nombre_completo: formData.nombre_completo,
      rol_id: formData.rol_id,
      area_equipo_id: formData.area_equipo_id || undefined,
      telefono: formData.telefono || undefined,
      turno_horario_id: formData.turno_horario_id || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Usuario actualizado correctamente');
          this.router.navigate(['/usuarios']);
        } else {
          this.notificationService.error(response.error || 'Error al actualizar usuario');
        }
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Error updating user:', err);
        this.notificationService.error('Error al actualizar usuario');
        this.submitting.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/usuarios']);
  }

  // ============================================================================
  // Helpers de validación
  // ============================================================================

  private markFormAsTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      this.userForm.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['minlength']) {
      return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    if (field.errors['maxlength']) {
      return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    if (field.errors['emailFormat']) return 'Email inválido';
    if (field.errors['strongPassword']) {
      return 'Debe contener mayúscula, minúscula y número';
    }
    if (field.errors['whitespace']) return 'No se permiten espacios';
    if (field.errors['pattern']) return 'Formato inválido';

    return 'Campo inválido';
  }
}
