// ============================================================================
// Logger Service
// ============================================================================
// Servicio centralizado de logging que solo muestra mensajes en desarrollo
// ============================================================================

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly isProduction = environment.production;

  /**
   * Log de debug - solo en desarrollo
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log informativo - solo en desarrollo
   */
  log(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.log(message, ...args);
    }
  }

  /**
   * Log de advertencia - solo en desarrollo
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.warn(message, ...args);
    }
  }

  /**
   * Log de error - solo en desarrollo
   * En producción, podrías enviar a un servicio de monitoreo
   */
  error(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.error(message, ...args);
    }
    // TODO: En producción, considerar enviar a servicio de monitoreo
    // como Sentry, LogRocket, etc.
  }

  /**
   * Log con nivel configurable
   */
  logWithLevel(level: LogLevel, message: string, ...args: unknown[]): void {
    switch (level) {
      case 'debug':
        this.debug(message, ...args);
        break;
      case 'info':
        this.log(message, ...args);
        break;
      case 'warn':
        this.warn(message, ...args);
        break;
      case 'error':
        this.error(message, ...args);
        break;
    }
  }

  /**
   * Log de grupo (para debugging complejo)
   */
  group(label: string, fn: () => void): void {
    if (!this.isProduction) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  }

  /**
   * Log de tabla (para arrays/objetos)
   */
  table(data: unknown): void {
    if (!this.isProduction) {
      console.table(data);
    }
  }

  /**
   * Medir tiempo de ejecución
   */
  time(label: string): void {
    if (!this.isProduction) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (!this.isProduction) {
      console.timeEnd(label);
    }
  }
}

// ============================================================================
// Función helper para uso sin inyección (casos especiales)
// ============================================================================

/**
 * Logger estático para usar en contextos donde no hay inyección de dependencias
 * Ejemplo: funciones puras, guards funcionales, etc.
 */
export const logger = {
  log: (message: string, ...args: unknown[]): void => {
    if (!environment.production) {
      console.log(message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]): void => {
    if (!environment.production) {
      console.warn(message, ...args);
    }
  },
  error: (message: string, ...args: unknown[]): void => {
    if (!environment.production) {
      console.error(message, ...args);
    }
  },
  debug: (message: string, ...args: unknown[]): void => {
    if (!environment.production) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
};
