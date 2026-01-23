import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private notificationService = inject(NotificationService);

  handleError(error: Error | HttpErrorResponse): void {
    let errorMessage: string;
    let showToast = true;

    if (error instanceof HttpErrorResponse) {
      // HTTP errors are handled by the interceptor
      // We only log them here
      showToast = false;
      errorMessage = `HTTP Error: ${error.status} - ${error.statusText}`;
    } else {
      // Client-side or application errors
      errorMessage = error.message || 'Ha ocurrido un error inesperado';
      console.error('Application Error:', error);
    }

    // Log to console (in production, you might want to send to a logging service)
    console.error('Global Error Handler:', {
      message: errorMessage,
      error: error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly notification
    if (showToast) {
      this.notificationService.error(
        'Ha ocurrido un error. Por favor, recarga la página o contacta al soporte.'
      );
    }

    // In development, rethrow to see the error in console
    if (!this.isProduction()) {
      throw error;
    }
  }

  private isProduction(): boolean {
    // You can check environment here
    return false; // For now, always show errors in console
  }
}
