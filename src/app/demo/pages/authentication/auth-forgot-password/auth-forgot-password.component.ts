// angular import
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { email, Field, form, required } from '@angular/forms/signals';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { SupabaseService } from 'src/app/core/services/supabase.service';

@Component({
  selector: 'app-auth-forgot-password',
  imports: [CommonModule, RouterModule, SharedModule, Field],
  templateUrl: './auth-forgot-password.component.html',
  styleUrls: ['./auth-forgot-password.component.scss']
})
export class AuthForgotPasswordComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  submitted = signal(false);
  error = signal('');
  success = signal(false);
  loading = signal(false);

  forgotPasswordModel = signal<{ email: string }>({
    email: ''
  });

  forgotPasswordForm = form(this.forgotPasswordModel, (schemaPath) => {
    required(schemaPath.email, { message: 'El correo electrónico es obligatorio' });
    email(schemaPath.email, { message: 'Ingresa un correo electrónico válido' });
  });

  async onSubmit(event: Event) {
    this.submitted.set(true);
    this.error.set('');
    this.success.set(false);
    event.preventDefault();

    // Validate form
    if (this.forgotPasswordForm.email().invalid()) {
      return;
    }

    this.loading.set(true);

    try {
      const { email } = this.forgotPasswordModel();
      const { error } = await this.supabase.resetPassword(email);

      if (error) {
        this.error.set(error.message);
        console.error('Password reset error:', error);
      } else {
        this.success.set(true);
        console.log('Password reset email sent successfully');
      }
    } catch (err: any) {
      this.error.set('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
      console.error('Unexpected error:', err);
    } finally {
      this.loading.set(false);
    }
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}
