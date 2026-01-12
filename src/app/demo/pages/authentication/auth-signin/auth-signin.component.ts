// angular import
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { email, Field, form, minLength, required } from '@angular/forms/signals';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { SupabaseService } from 'src/app/core/services/supabase.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ErrorMessages, getErrorMessage } from 'src/app/core/helpers/error-messages';

@Component({
  selector: 'app-auth-signin',
  imports: [CommonModule, RouterModule, SharedModule, Field],
  templateUrl: './auth-signin.component.html',
  styleUrls: ['./auth-signin.component.scss']
})
export class AuthSigninComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  private readonly REMEMBER_EMAIL_KEY = 'igas_remember_email';

  submitted = signal(false);
  error = signal('');
  showPassword = signal(false);
  loading = signal(false);
  rememberMe = signal(true);
  inactivityMessage = signal('');

  loginModal = signal<{ email: string; password: string }>({
    email: '',
    password: ''
  });

  loginForm = form(this.loginModal, (schemaPath) => {
    required(schemaPath.email, { message: ErrorMessages.required('Correo electrónico') });
    email(schemaPath.email, { message: ErrorMessages.email() });
    required(schemaPath.password, { message: ErrorMessages.required('Contraseña') });
    minLength(schemaPath.password, 8, { message: ErrorMessages.minLength('Contraseña', 8) });
  });

  ngOnInit() {
    // Check if session expired due to inactivity
    this.route.queryParams.subscribe((params) => {
      if (params['reason'] === 'inactivity') {
        this.inactivityMessage.set(
          'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.'
        );
        // Remove query param after reading
        this.router.navigate([], {
          queryParams: {},
          replaceUrl: true
        });
      }
    });

    // Load saved email if exists
    const savedEmail = this.getSavedEmail();
    if (savedEmail) {
      this.loginModal.set({
        email: savedEmail,
        password: ''
      });
      this.rememberMe.set(true);
    }
  }

  async onSubmit(event: Event) {
    this.submitted.set(true);
    this.error.set('');
    event.preventDefault();

    // Validate form
    if (this.loginForm.email().invalid() || this.loginForm.password().errors().length > 0) {
      return;
    }

    this.loading.set(true);

    try {
      const credentials = this.loginModal();
      const { data, error } = await this.supabase.signIn(credentials.email, credentials.password);

      if (error) {
        this.error.set(getErrorMessage(error));
        console.error('Login error:', error);
      } else if (data.user) {
        console.log('User logged in successfully:', data.user);

        // Handle remember me
        if (this.rememberMe()) {
          this.saveEmail(credentials.email);
        } else {
          this.clearSavedEmail();
        }

        // Show success notification
        this.notificationService.success('¡Bienvenido! Has iniciado sesión correctamente.');

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

  private saveEmail(email: string): void {
    try {
      localStorage.setItem(this.REMEMBER_EMAIL_KEY, email);
    } catch (error) {
      console.error('Error saving email to localStorage:', error);
    }
  }

  private getSavedEmail(): string | null {
    try {
      return localStorage.getItem(this.REMEMBER_EMAIL_KEY);
    } catch (error) {
      console.error('Error reading email from localStorage:', error);
      return null;
    }
  }

  private clearSavedEmail(): void {
    try {
      localStorage.removeItem(this.REMEMBER_EMAIL_KEY);
    } catch (error) {
      console.error('Error clearing email from localStorage:', error);
    }
  }
}
