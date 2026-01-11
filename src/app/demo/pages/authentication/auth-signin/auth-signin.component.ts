// angular import
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { email, Field, form, minLength, required } from '@angular/forms/signals';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { SupabaseService } from 'src/app/core/services/supabase.service';

@Component({
  selector: 'app-auth-signin',
  imports: [CommonModule, RouterModule, SharedModule, Field],
  templateUrl: './auth-signin.component.html',
  styleUrls: ['./auth-signin.component.scss']
})
export class AuthSigninComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  private readonly REMEMBER_EMAIL_KEY = 'igas_remember_email';

  submitted = signal(false);
  error = signal('');
  showPassword = signal(false);
  loading = signal(false);
  rememberMe = signal(true);

  loginModal = signal<{ email: string; password: string }>({
    email: '',
    password: ''
  });

  loginForm = form(this.loginModal, (schemaPath) => {
    required(schemaPath.email, { message: 'El correo electrónico es obligatorio' });
    email(schemaPath.email, { message: 'Ingresa un correo electrónico válido' });
    required(schemaPath.password, { message: 'La contraseña es obligatoria' });
    minLength(schemaPath.password, 8, { message: 'La contraseña debe tener al menos 8 caracteres' });
  });

  ngOnInit() {
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
        this.error.set(error.message);
        console.error('Login error:', error);
      } else if (data.user) {
        console.log('User logged in successfully:', data.user);

        // Handle remember me
        if (this.rememberMe()) {
          this.saveEmail(credentials.email);
        } else {
          this.clearSavedEmail();
        }

        // Redirect to dashboard
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.error.set('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
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
