// ============================================================================
// User Profile Component
// ============================================================================
// Componente para ver y editar el perfil del usuario actual
// ============================================================================

import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbNavModule, NgbModalModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { UserService } from 'src/app/core/services/user.service';
import { SupabaseService } from 'src/app/core/services/supabase.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ProfileWithRelations, Disponibilidad } from 'src/app/core/models';
import {
  strongPassword,
  noWhitespace,
  passwordMatch,
  calculatePasswordStrength,
  getPasswordStrengthMessage
} from 'src/app/core/validators';
import { getErrorMessage } from 'src/app/core/helpers/error-messages';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbNavModule,
    NgbModalModule,
    SharedModule
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private supabaseService = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  profile = signal<ProfileWithRelations | null>(null);
  loading = signal(true);
  activeTab = signal(1);

  // Estados de formularios
  savingProfile = signal(false);
  savingPassword = signal(false);
  uploadingAvatar = signal(false);

  // Password strength
  passwordStrength = signal(0);
  passwordStrengthInfo = computed(() => getPasswordStrengthMessage(this.passwordStrength()));

  // Password visibility toggles
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Formularios
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // Opciones de disponibilidad
  disponibilidadOptions: Disponibilidad[] = ['En línea', 'Ocupado', 'Fuera de turno'];

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.initForms();
    this.loadProfile();
  }

  // ============================================================================
  // Inicialización
  // ============================================================================

  private initForms(): void {
    this.profileForm = this.fb.group({
      nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      disponibilidad: ['']
    });

    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8), strongPassword(), noWhitespace()]],
      confirm_password: ['', [Validators.required]]
    }, {
      validators: passwordMatch('new_password', 'confirm_password')
    });

    // Observar cambios en password para calcular fortaleza
    this.passwordForm.get('new_password')?.valueChanges.subscribe(value => {
      this.passwordStrength.set(calculatePasswordStrength(value || ''));
    });
  }

  private loadProfile(): void {
    this.loading.set(true);

    this.userService.getCurrentUserProfile().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.profile.set(response.data);
          this.populateProfileForm(response.data);
        } else {
          this.notificationService.error('Error al cargar perfil');
        }
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cargar perfil');
        this.loading.set(false);
      }
    });
  }

  private populateProfileForm(profile: ProfileWithRelations): void {
    this.profileForm.patchValue({
      nombre_completo: profile.nombre_completo,
      telefono: profile.telefono || '',
      disponibilidad: profile.disponibilidad
    });
  }

  // ============================================================================
  // Acciones del perfil
  // ============================================================================

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormAsTouched(this.profileForm);
      return;
    }

    this.savingProfile.set(true);

    const formData = this.profileForm.value;

    this.userService.updateCurrentUserProfile({
      nombre_completo: formData.nombre_completo,
      telefono: formData.telefono || undefined,
      disponibilidad: formData.disponibilidad
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Perfil actualizado correctamente');
          this.loadProfile();
        } else {
          this.notificationService.error(response.error || 'Error al actualizar perfil');
        }
        this.savingProfile.set(false);
      },
      error: () => {
        this.notificationService.error('Error al actualizar perfil');
        this.savingProfile.set(false);
      }
    });
  }

  // ============================================================================
  // Cambio de contraseña
  // ============================================================================

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.markFormAsTouched(this.passwordForm);
      return;
    }

    this.savingPassword.set(true);

    const formData = this.passwordForm.value;

    this.supabaseService.updatePassword(formData.new_password).then(({ error }) => {
      if (error) {
        this.notificationService.error(getErrorMessage(error));
      } else {
        this.notificationService.success('Contraseña actualizada correctamente');
        this.passwordForm.reset();
        this.passwordStrength.set(0);
      }
      this.savingPassword.set(false);
    });
  }

  // ============================================================================
  // Gestión de Avatar
  // ============================================================================

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      this.notificationService.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.notificationService.error('La imagen no debe superar 2MB');
      return;
    }

    this.uploadAvatar(file);
  }

  private uploadAvatar(file: File): void {
    this.uploadingAvatar.set(true);

    this.userService.uploadAvatar(file).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Avatar actualizado correctamente');
          this.loadProfile();
        } else {
          this.notificationService.error(response.error || 'Error al subir avatar');
        }
        this.uploadingAvatar.set(false);
      },
      error: () => {
        this.notificationService.error('Error al subir avatar');
        this.uploadingAvatar.set(false);
      }
    });
  }

  openDeleteAvatarModal(content: any): void {
    this.modalService.open(content, { centered: true });
  }

  confirmDeleteAvatar(): void {
    this.userService.deleteAvatar().subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Avatar eliminado correctamente');
          this.loadProfile();
        } else {
          this.notificationService.error(response.error || 'Error al eliminar avatar');
        }
        this.modalService.dismissAll();
      },
      error: () => {
        this.notificationService.error('Error al eliminar avatar');
        this.modalService.dismissAll();
      }
    });
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  getAvatarUrl(): string {
    return this.profile()?.avatar_url || 'assets/images/user/avatar-1.jpg';
  }

  getDisponibilidadClass(disponibilidad: Disponibilidad): string {
    switch (disponibilidad) {
      case 'En línea':
        return 'badge bg-success';
      case 'Ocupado':
        return 'badge bg-warning text-dark';
      case 'Fuera de turno':
        return 'badge bg-secondary';
      default:
        return 'badge bg-light';
    }
  }

  private markFormAsTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      form.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['minlength']) {
      return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    if (field.errors['strongPassword']) {
      return 'Debe contener mayúscula, minúscula y número';
    }
    if (field.errors['whitespace']) return 'No se permiten espacios';
    if (field.errors['pattern']) return 'Formato inválido';

    return 'Campo inválido';
  }

  hasPasswordMismatch(): boolean {
    return this.passwordForm.hasError('passwordMatch') &&
           this.passwordForm.get('confirm_password')?.touched === true;
  }

  toggleCurrentPassword(): void {
    this.showCurrentPassword.update(v => !v);
  }

  toggleNewPassword(): void {
    this.showNewPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }
}
