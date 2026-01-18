// angular import
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { email, Field, form, required } from '@angular/forms/signals';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { SupabaseService } from 'src/app/core/services/supabase.service';
import { ErrorMessages, getErrorMessage } from 'src/app/core/helpers/error-messages';
import { emailFormat as validateEmailFormat, noWhitespace as validateNoWhitespace } from 'src/app/core/validators/custom-validators';

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
    // Validaciones de email
    required(schemaPath.email, { message: ErrorMessages.required('Correo electrónico') });
    email(schemaPath.email, { message: ErrorMessages.email() });
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

    const { email } = this.forgotPasswordModel();

    // Validaciones adicionales de email
    const emailFormatError = validateEmailFormat()({ value: email } as any);
    if (emailFormatError) {
      this.error.set(ErrorMessages.emailFormat());
      return;
    }

    const noWhitespaceError = validateNoWhitespace()({ value: email } as any);
    if (noWhitespaceError) {
      this.error.set(ErrorMessages.whitespace());
      return;
    }

    this.loading.set(true);

    try {
      const { email } = this.forgotPasswordModel();
      const { error } = await this.supabase.resetPassword(email);

      if (error) {
        this.error.set(getErrorMessage(error));
        console.error('Password reset error:', error);
      } else {
        this.success.set(true);
        console.log('Password reset email sent successfully');
      }
    } catch (err: any) {
      this.error.set(getErrorMessage(err));
      console.error('Unexpected error:', err);
    } finally {
      this.loading.set(false);
    }
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}
