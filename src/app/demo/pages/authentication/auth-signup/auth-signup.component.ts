// angular import
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { email, Field, form, minLength, required } from '@angular/forms/signals';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-auth-signup',
  imports: [CommonModule, RouterModule, SharedModule, Field],
  templateUrl: './auth-signup.component.html',
  styleUrls: ['./auth-signup.component.scss']
})
export class AuthSignupComponent {

  submitted = signal(false);
  error = signal('');
  showPassword = signal(false);

  registerModel = signal<{ email: string; password: string; username: string }>({
    email: '',
    password: '',
    username: ''
  });

  registerForm = form(this.registerModel, (schemaPath) => {
    required(schemaPath.email, { message: 'El correo electrónico es obligatorio' });
    email(schemaPath.email, { message: 'Ingresa un correo electrónico válido' });
    required(schemaPath.password, { message: 'La contraseña es obligatoria' });
    minLength(schemaPath.password, 8, { message: 'La contraseña debe tener al menos 8 caracteres' });
    required(schemaPath.username, { message: 'El nombre de usuario es obligatorio' });
  });

  onSubmit(event: Event) {
    this.submitted.set(true);
    this.error.set('');
    event.preventDefault();
    const credentials = this.registerModel();
    console.log('register user logged in with:', credentials);
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }
}
