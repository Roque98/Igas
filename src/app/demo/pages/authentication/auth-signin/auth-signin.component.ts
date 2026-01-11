// angular import
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
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
export class AuthSigninComponent {
  private cd = inject(ChangeDetectorRef);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  submitted = signal(false);
  error = signal('');
  showPassword = signal(false);
  loading = signal(false);

  loginModal = signal<{ email: string; password: string }>({
    email: '',
    password: ''
  });

  loginForm = form(this.loginModal, (schemaPath) => {
    required(schemaPath.email, { message: 'Email is required' });
    email(schemaPath.email, { message: 'Enter a valid email address' });
    required(schemaPath.password, { message: 'Password is required' });
    minLength(schemaPath.password, 8, { message: 'Password must be at least 8 characters' });
  });

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
        // Redirect to dashboard
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.error.set('An unexpected error occurred. Please try again.');
      console.error('Unexpected error:', err);
    } finally {
      this.loading.set(false);
      this.cd.detectChanges();
    }
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }
}
