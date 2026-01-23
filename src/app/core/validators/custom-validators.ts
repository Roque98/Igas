// ============================================================================
// Custom Validators
// ============================================================================
// Validadores personalizados para formularios de autenticación
// ============================================================================

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador de fortaleza de contraseña
 * Valida que la contraseña cumpla con los siguientes criterios:
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 * - Al menos 8 caracteres (este criterio se valida por separado con minLength)
 */
export function strongPassword(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null; // No validar si está vacío (required se encarga de eso)
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumber;

    return passwordValid ? null : { strongPassword: true };
  };
}

/**
 * Validador de formato de email mejorado
 * Valida que el email tenga un formato válido y dominio común
 */
export function emailFormat(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    // Patrón mejorado para validar emails
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailPattern.test(value)) {
      return { emailFormat: true };
    }

    // Validar que no tenga espacios
    if (/\s/.test(value)) {
      return { emailFormat: true };
    }

    // Validar que el dominio tenga al menos un punto
    const domain = value.split('@')[1];
    if (domain && !domain.includes('.')) {
      return { emailFormat: true };
    }

    return null;
  };
}

/**
 * Validador de coincidencia de contraseñas
 * Valida que dos campos de contraseña coincidan
 * @param passwordField Nombre del campo de contraseña
 * @param confirmPasswordField Nombre del campo de confirmación
 */
export function passwordMatch(passwordField: string, confirmPasswordField: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const password = formGroup.get(passwordField);
    const confirmPassword = formGroup.get(confirmPasswordField);

    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.value === '') {
      return null; // No validar si está vacío
    }

    return password.value === confirmPassword.value ? null : { passwordMatch: false };
  };
}

/**
 * Validador de espacios en blanco
 * Valida que el campo no contenga espacios en blanco
 */
export function noWhitespace(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasWhitespace = /\s/.test(value);

    return hasWhitespace ? { whitespace: true } : null;
  };
}

/**
 * Validador de caracteres especiales en contraseña (opcional)
 * Valida que la contraseña contenga al menos un carácter especial
 */
export function hasSpecialCharacter(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

    return hasSpecial ? null : { specialCharacter: true };
  };
}

/**
 * Calcula el nivel de fortaleza de una contraseña
 * @param password La contraseña a evaluar
 * @returns Número entre 0 y 100 indicando la fortaleza
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;

  // Longitud
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  // Mayúsculas
  if (/[A-Z]/.test(password)) strength += 15;

  // Minúsculas
  if (/[a-z]/.test(password)) strength += 15;

  // Números
  if (/[0-9]/.test(password)) strength += 15;

  // Caracteres especiales
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 10;

  return Math.min(strength, 100);
}

/**
 * Obtiene el mensaje de fortaleza de contraseña
 * @param strength Nivel de fortaleza (0-100)
 * @returns Objeto con mensaje y clase CSS
 */
export function getPasswordStrengthMessage(strength: number): { message: string; class: string } {
  if (strength === 0) {
    return { message: '', class: '' };
  } else if (strength < 40) {
    return { message: 'Débil', class: 'text-danger' };
  } else if (strength < 70) {
    return { message: 'Media', class: 'text-warning' };
  } else {
    return { message: 'Fuerte', class: 'text-success' };
  }
}

/**
 * Validador de email corporativo (opcional)
 * Valida que el email pertenezca a dominios corporativos específicos
 * @param allowedDomains Lista de dominios permitidos (ej: ['empresa.com', 'corp.empresa.com'])
 */
export function corporateEmail(allowedDomains: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const email = value.toLowerCase();
    const domain = email.split('@')[1];

    if (!domain) {
      return { corporateEmail: true };
    }

    const isAllowed = allowedDomains.some(allowedDomain =>
      domain === allowedDomain.toLowerCase()
    );

    return isAllowed ? null : { corporateEmail: true };
  };
}

/**
 * Validador de longitud máxima de email
 * Algunos sistemas tienen límites en la longitud del email
 */
export function emailMaxLength(maxLength: number = 254): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    return value.length <= maxLength ? null : { emailMaxLength: { maxLength, actualLength: value.length } };
  };
}

/**
 * Validador para prevenir contraseñas comunes
 * Valida que la contraseña no sea una de las más comunes
 */
export function notCommonPassword(): ValidatorFn {
  const commonPasswords = [
    'password', 'password123', '12345678', '123456789', '12345',
    'qwerty', 'abc123', 'password1', '1234567890', '123123',
    'admin', 'letmein', 'welcome', 'monkey', '1234',
    'password!', 'Passw0rd', 'passw0rd', 'Password1', 'Password123'
  ];

  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value?.toLowerCase();

    if (!value) {
      return null;
    }

    const isCommon = commonPasswords.some(common => value === common.toLowerCase());

    return isCommon ? { commonPassword: true } : null;
  };
}
