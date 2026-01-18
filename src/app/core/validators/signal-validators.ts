// ============================================================================
// Signal Validators
// ============================================================================
// Validadores personalizados compatibles con @angular/forms/signals
// ============================================================================

import { Validator, ValidatorMessages } from '@angular/forms/signals';
import { ErrorMessages } from '../helpers/error-messages';

/**
 * Validador de fortaleza de contraseña para @angular/forms/signals
 * Valida que la contraseña cumpla con:
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 */
export function strongPassword<Value>(
  value: () => Value,
  messages?: ValidatorMessages<Value>
): Validator<Value> {
  return {
    message: messages?.message ?? ErrorMessages.strongPassword(),
    validate: () => {
      const val = String(value() ?? '');

      if (!val) {
        return true;
      }

      const hasUpperCase = /[A-Z]/.test(val);
      const hasLowerCase = /[a-z]/.test(val);
      const hasNumber = /[0-9]/.test(val);

      return hasUpperCase && hasLowerCase && hasNumber;
    }
  };
}

/**
 * Validador de contraseña no común para @angular/forms/signals
 */
export function notCommonPassword<Value>(
  value: () => Value,
  messages?: ValidatorMessages<Value>
): Validator<Value> {
  const commonPasswords = [
    'password', 'password123', '12345678', '123456789', '12345',
    'qwerty', 'abc123', 'password1', '1234567890', '123123',
    'admin', 'letmein', 'welcome', 'monkey', '1234',
    'password!', 'Passw0rd', 'passw0rd', 'Password1', 'Password123'
  ];

  return {
    message: messages?.message ?? ErrorMessages.commonPassword(),
    validate: () => {
      const val = String(value() ?? '').toLowerCase();

      if (!val) {
        return true;
      }

      return !commonPasswords.some(common => val === common.toLowerCase());
    }
  };
}

/**
 * Validador de espacios en blanco para @angular/forms/signals
 */
export function noWhitespace<Value>(
  value: () => Value,
  messages?: ValidatorMessages<Value>
): Validator<Value> {
  return {
    message: messages?.message ?? ErrorMessages.whitespace(),
    validate: () => {
      const val = String(value() ?? '');

      if (!val) {
        return true;
      }

      return !/\s/.test(val);
    }
  };
}

/**
 * Validador de formato de email mejorado para @angular/forms/signals
 */
export function emailFormat<Value>(
  value: () => Value,
  messages?: ValidatorMessages<Value>
): Validator<Value> {
  return {
    message: messages?.message ?? ErrorMessages.emailFormat(),
    validate: () => {
      const val = String(value() ?? '');

      if (!val) {
        return true;
      }

      // Patrón mejorado para validar emails
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailPattern.test(val)) {
        return false;
      }

      // Validar que no tenga espacios
      if (/\s/.test(val)) {
        return false;
      }

      // Validar que el dominio tenga al menos un punto
      const domain = val.split('@')[1];
      if (domain && !domain.includes('.')) {
        return false;
      }

      return true;
    }
  };
}

/**
 * Validador de longitud máxima de email para @angular/forms/signals
 */
export function emailMaxLength<Value>(
  value: () => Value,
  maxLength: number = 254,
  messages?: ValidatorMessages<Value>
): Validator<Value> {
  return {
    message: messages?.message ?? ErrorMessages.emailMaxLength(),
    validate: () => {
      const val = String(value() ?? '');

      if (!val) {
        return true;
      }

      return val.length <= maxLength;
    }
  };
}

/**
 * Validador de email corporativo para @angular/forms/signals
 * @param allowedDomains Lista de dominios permitidos
 */
export function corporateEmail<Value>(
  value: () => Value,
  allowedDomains: string[],
  messages?: ValidatorMessages<Value>
): Validator<Value> {
  return {
    message: messages?.message ?? ErrorMessages.corporateEmail(allowedDomains),
    validate: () => {
      const val = String(value() ?? '').toLowerCase();

      if (!val) {
        return true;
      }

      const domain = val.split('@')[1];

      if (!domain) {
        return false;
      }

      return allowedDomains.some(allowedDomain =>
        domain === allowedDomain.toLowerCase()
      );
    }
  };
}

/**
 * Validador de carácter especial en contraseña para @angular/forms/signals
 */
export function hasSpecialCharacter<Value>(
  value: () => Value,
  messages?: ValidatorMessages<Value>
): Validator<Value> {
  return {
    message: messages?.message ?? ErrorMessages.specialCharacter(),
    validate: () => {
      const val = String(value() ?? '');

      if (!val) {
        return true;
      }

      return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val);
    }
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
 * Obtiene el mensaje y clase de fortaleza de contraseña
 * @param strength Nivel de fortaleza (0-100)
 * @returns Objeto con mensaje y clase CSS
 */
export function getPasswordStrengthInfo(strength: number): {
  message: string;
  class: string;
  color: string;
} {
  if (strength === 0) {
    return { message: '', class: '', color: '' };
  } else if (strength < 40) {
    return { message: 'Débil', class: 'text-danger', color: '#dc3545' };
  } else if (strength < 70) {
    return { message: 'Media', class: 'text-warning', color: '#ffc107' };
  } else {
    return { message: 'Fuerte', class: 'text-success', color: '#28a745' };
  }
}
