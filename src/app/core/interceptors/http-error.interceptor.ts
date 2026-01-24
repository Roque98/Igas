import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = '';

      // Format error message
      errorMessage = notificationService.formatHttpError(error);

      // Log error for debugging
      if (!environment.production) {
        console.error('HTTP Error:', {
          status: error.status,
          message: errorMessage,
          url: error.url,
          error: error.error,
          timestamp: new Date().toISOString()
        });
      }

      // Handle specific status codes
      switch (error.status) {
        case 401:
          // Unauthorized - redirect to login
          notificationService.error('Sesión expirada. Por favor inicia sesión nuevamente.');
          router.navigate(['/login']);
          break;

        case 403:
          // Forbidden
          notificationService.error('No tienes permisos para realizar esta acción.');
          break;

        case 404:
          // Not Found
          notificationService.warning('El recurso solicitado no fue encontrado.');
          break;

        case 500:
        case 502:
        case 503:
          // Server errors
          notificationService.error('Error en el servidor. Por favor intenta más tarde.');
          break;

        case 0:
          // Network error
          notificationService.error('No se pudo conectar con el servidor. Verifica tu conexión.');
          break;

        default:
          // Other errors
          notificationService.error(errorMessage);
      }

      // Re-throw the error so services can handle it if needed
      return throwError(() => error);
    })
  );
};
