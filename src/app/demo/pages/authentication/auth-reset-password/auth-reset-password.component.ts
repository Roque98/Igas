// angular import
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Field, form, minLength, required } from '@angular/forms/signals';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { SupabaseService } from 'src/app/core/services/supabase.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ErrorMessages, getErrorMessage } from 'src/app/core/helpers/error-messages';

@Component({
  selector: 'app-auth-reset-password',
  imports: [CommonModule, RouterModule, SharedModule, Field],
  templateUrl: './auth-reset-password.component.html',
  styleUrls: ['./auth-reset-password.component.scss']
})
export class AuthResetPasswordComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  submitted = signal(false);
  error = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  loading = signal(false);
  sessionLoading = signal(true);
  sessionError = signal(false);

  resetPasswordModel = signal<{ password: string; confirmPassword: string }>({
    password: '',
    confirmPassword: ''
  });

  resetPasswordForm = form(this.resetPasswordModel, (schemaPath) => {
    required(schemaPath.password, { message: ErrorMessages.required('Contraseña') });
    minLength(schemaPath.password, 8, { message: ErrorMessages.minLength('Contraseña', 8) });
    required(schemaPath.confirmPassword, { message: ErrorMessages.required('Confirmar contraseña') });
  });

  async ngOnInit() {
    // Wait a bit for Supabase to process the hash token from the URL
    // Supabase automatically handles the session from the recovery link
    setTimeout(async () => {
      const { data } = await this.supabase.getSession();

      if (data.session) {
        // Session established successfully
        this.sessionLoading.set(false);
        console.log('Password reset session established');
      } else {
        // No session - possibly invalid or expired token
        this.sessionError.set(true);
        this.sessionLoading.set(false);
        console.error('No session found for password reset');
      }
    }, 1000); // Give Supabase 1 second to process the hash token
  }

  async onSubmit(event: Event) {
    this.submitted.set(true);
    this.error.set('');
    event.preventDefault();

    // Validate form
    if (
      this.resetPasswordForm.password().errors().length > 0 ||
      this.resetPasswordForm.confirmPassword().errors().length > 0
    ) {
      return;
    }

    // Check if passwords match
    const { password, confirmPassword } = this.resetPasswordModel();
    if (password !== confirmPassword) {
      this.error.set(ErrorMessages.passwordMismatch());
      return;
    }

    this.loading.set(true);

    try {
      const { error } = await this.supabase.updatePassword(password);

      if (error) {
        this.error.set(getErrorMessage(error));
        console.error('Password update error:', error);
      } else {
        console.log('Password updated successfully');

        // Show success notification
        this.notificationService.success('Tu contraseña ha sido actualizada correctamente.');

        // Redirect to dashboard
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.error.set(getErrorMessage(err));
      console.error('Unexpected error:', err);
    } finally {
      this.loading.set(false);
    }
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }
}
