// angular import
import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { email, Field, form, minLength, required } from '@angular/forms/signals';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { ErrorMessages } from 'src/app/core/helpers/error-messages';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-auth-signup',
  imports: [CommonModule, RouterModule, SharedModule, Field],
  templateUrl: './auth-signup.component.html',
  styleUrls: ['./auth-signup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
    required(schemaPath.email, { message: ErrorMessages.required('Correo electrónico') });
    email(schemaPath.email, { message: ErrorMessages.email() });
    required(schemaPath.password, { message: ErrorMessages.required('Contraseña') });
    minLength(schemaPath.password, 8, { message: ErrorMessages.minLength('Contraseña', 8) });
    required(schemaPath.username, { message: ErrorMessages.required('Nombre de usuario') });
  });

  onSubmit(event: Event) {
    this.submitted.set(true);
    this.error.set('');
    event.preventDefault();
    const credentials = this.registerModel();
    if (!environment.production) { console.log('register user logged in with:', credentials); }
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }
}
