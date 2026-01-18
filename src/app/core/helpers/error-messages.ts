// ============================================================================
// Error Messages Helper
// ============================================================================
// Mensajes de error amigables en español para validaciones
// ============================================================================

export const ErrorMessages = {
  // Errores de validación de campos
  required: (fieldName: string) => `El campo ${fieldName} es obligatorio`,
  email: () => 'Ingresa un correo electrónico válido',
  minLength: (fieldName: string, minLength: number) =>
    `${fieldName} debe tener al menos ${minLength} caracteres`,
  maxLength: (fieldName: string, maxLength: number) =>
    `${fieldName} no puede tener más de ${maxLength} caracteres`,
  pattern: (fieldName: string) => `${fieldName} no tiene el formato correcto`,
  passwordMismatch: () => 'Las contraseñas no coinciden',

  // Errores de validación de contraseñas mejorados
  strongPassword: () => 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  commonPassword: () => 'Esta contraseña es muy común. Por favor, elige una contraseña más segura',
  specialCharacter: () => 'La contraseña debe contener al menos un carácter especial (!@#$%^&*)',

  // Errores de validación de email mejorados
  emailFormat: () => 'El formato del correo electrónico no es válido',
  emailMaxLength: () => 'El correo electrónico es demasiado largo',
  corporateEmail: (domains: string[]) => `El correo debe pertenecer a uno de estos dominios: ${domains.join(', ')}`,
  whitespace: () => 'Este campo no puede contener espacios en blanco',

  // Errores de autenticación
  invalidCredentials: () => 'Correo o contraseña incorrectos. Por favor, verifica tus datos.',
  userNotFound: () => 'No existe una cuenta con este correo electrónico.',
  invalidEmail: () => 'El correo electrónico no tiene un formato válido.',
  weakPassword: () => 'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.',
  emailInUse: () => 'Este correo electrónico ya está registrado.',
  tooManyRequests: () => 'Demasiados intentos fallidos. Por favor, intenta de nuevo más tarde.',
  userBlocked: (minutes: number) =>
    `Tu cuenta ha sido bloqueada temporalmente por seguridad. Intenta de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
  remainingAttempts: (attempts: number) =>
    `Credenciales incorrectas. Te ${attempts === 1 ? 'queda' : 'quedan'} ${attempts} ${attempts === 1 ? 'intento' : 'intentos'} antes de que tu cuenta sea bloqueada temporalmente.`,
  samePassword: () => 'La nueva contraseña debe ser diferente a la contraseña actual.',
  passwordReused: () => 'No puedes reutilizar una contraseña reciente. Por favor, elige una contraseña diferente.',

  // Errores de red
  networkError: () => 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.',
  serverError: () => 'Error del servidor. Por favor, intenta más tarde.',
  timeout: () => 'La solicitud tardó demasiado. Por favor, intenta nuevamente.',

  // Errores de sesión
  sessionExpired: () => 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
  invalidToken: () => 'El enlace de recuperación es inválido o ha expirado.',
  unauthorized: () => 'No tienes permisos para acceder a este recurso.',

  // Errores de datos
  notFound: () => 'El recurso solicitado no fue encontrado.',
  duplicateData: () => 'Ya existe un registro con estos datos.',
  invalidData: () => 'Los datos proporcionados no son válidos.',

  // Mensajes genéricos
  unknownError: () => 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente.',
  formInvalid: () => 'Por favor, corrige los errores en el formulario antes de continuar.',
};

// ============================================================================
// Error Message Mapper
// ============================================================================
// Mapea errores de Supabase/Angular a mensajes amigables
// ============================================================================

export function getErrorMessage(error: any): string {
  // Si el error es un string, retornarlo directamente
  if (typeof error === 'string') {
    return error;
  }

  // Errores de Supabase Auth
  if (error?.message) {
    const message = error.message.toLowerCase();

    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      return ErrorMessages.invalidCredentials();
    }

    if (message.includes('user not found') || message.includes('user_not_found')) {
      return ErrorMessages.userNotFound();
    }

    if (message.includes('invalid email') || message.includes('email')) {
      return ErrorMessages.invalidEmail();
    }

    if (message.includes('password') && message.includes('weak')) {
      return ErrorMessages.weakPassword();
    }

    if (message.includes('password') && message.includes('different from the old')) {
      return ErrorMessages.samePassword();
    }

    if (message.includes('password') && message.includes('reused')) {
      return ErrorMessages.passwordReused();
    }

    if (message.includes('email already in use') || message.includes('user_already_exists')) {
      return ErrorMessages.emailInUse();
    }

    if (message.includes('too many requests') || message.includes('rate_limit')) {
      return ErrorMessages.tooManyRequests();
    }

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorMessages.networkError();
    }

    if (message.includes('timeout')) {
      return ErrorMessages.timeout();
    }

    if (message.includes('session') && message.includes('expired')) {
      return ErrorMessages.sessionExpired();
    }

    if (message.includes('invalid token') || message.includes('token expired')) {
      return ErrorMessages.invalidToken();
    }

    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorMessages.unauthorized();
    }

    if (message.includes('not found')) {
      return ErrorMessages.notFound();
    }

    // Si no hay mapeo específico, retornar el mensaje original
    return error.message;
  }

  // Error HTTP
  if (error?.status) {
    switch (error.status) {
      case 400:
        return ErrorMessages.invalidData();
      case 401:
        return ErrorMessages.unauthorized();
      case 403:
        return ErrorMessages.unauthorized();
      case 404:
        return ErrorMessages.notFound();
      case 409:
        return ErrorMessages.duplicateData();
      case 500:
        return ErrorMessages.serverError();
      case 503:
        return ErrorMessages.serverError();
      default:
        return ErrorMessages.unknownError();
    }
  }

  // Error desconocido
  return ErrorMessages.unknownError();
}

// ============================================================================
// Validation Message Mapper
// ============================================================================
// Mensajes para validaciones de formularios
// ============================================================================

export function getValidationMessage(fieldName: string, errorType: string, errorValue?: any): string {
  switch (errorType) {
    case 'required':
      return ErrorMessages.required(fieldName);
    case 'email':
      return ErrorMessages.email();
    case 'minlength':
      return ErrorMessages.minLength(fieldName, errorValue?.requiredLength || 0);
    case 'maxlength':
      return ErrorMessages.maxLength(fieldName, errorValue?.requiredLength || 0);
    case 'pattern':
      return ErrorMessages.pattern(fieldName);
    case 'passwordMismatch':
      return ErrorMessages.passwordMismatch();
    case 'strongPassword':
      return ErrorMessages.strongPassword();
    case 'commonPassword':
      return ErrorMessages.commonPassword();
    case 'specialCharacter':
      return ErrorMessages.specialCharacter();
    case 'emailFormat':
      return ErrorMessages.emailFormat();
    case 'emailMaxLength':
      return ErrorMessages.emailMaxLength();
    case 'whitespace':
      return ErrorMessages.whitespace();
    case 'corporateEmail':
      return ErrorMessages.corporateEmail(errorValue?.allowedDomains || []);
    default:
      return `${fieldName} no es válido`;
  }
}
