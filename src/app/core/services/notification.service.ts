import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastSubject = new Subject<Toast>();
  public toast$ = this.toastSubject.asObservable();

  success(message: string, duration: number = 5000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 7000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration: number = 6000): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration: number = 5000): void {
    this.show(message, 'info', duration);
  }

  private show(message: string, type: Toast['type'], duration: number): void {
    const toast: Toast = {
      message,
      type,
      duration,
      timestamp: Date.now()
    };
    this.toastSubject.next(toast);
  }

  /**
   * Format HTTP error messages to be user-friendly
   */
  formatHttpError(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }

    if (error.error?.error) {
      return error.error.error;
    }

    if (error.message) {
      return error.message;
    }

    switch (error.status) {
      case 0:
        return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      case 400:
        return 'La solicitud contiene datos inválidos.';
      case 401:
        return 'No estás autenticado. Por favor inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El recurso solicitado no fue encontrado.';
      case 500:
        return 'Error interno del servidor. Por favor intenta más tarde.';
      case 503:
        return 'El servicio no está disponible en este momento.';
      default:
        return `Error inesperado: ${error.statusText || 'Error desconocido'}`;
    }
  }
}
