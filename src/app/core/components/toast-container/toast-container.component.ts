import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss']
})
export class ToastContainerComponent implements OnInit {
  private notificationService = inject(NotificationService);
  toasts: Toast[] = [];

  ngOnInit(): void {
    this.notificationService.toast$.subscribe((toast) => {
      this.toasts.push(toast);

      // Auto-remove toast after duration
      if (toast.duration) {
        setTimeout(() => {
          this.remove(toast);
        }, toast.duration);
      }
    });
  }

  remove(toast: Toast): void {
    this.toasts = this.toasts.filter((t) => t !== toast);
  }

  getToastClass(type: Toast['type']): string {
    const baseClasses = 'toast fade show';
    switch (type) {
      case 'success':
        return `${baseClasses} bg-success text-white`;
      case 'error':
        return `${baseClasses} bg-danger text-white`;
      case 'warning':
        return `${baseClasses} bg-warning text-dark`;
      case 'info':
        return `${baseClasses} bg-info text-white`;
      default:
        return baseClasses;
    }
  }

  getToastIcon(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'feather icon-check-circle';
      case 'error':
        return 'feather icon-x-circle';
      case 'warning':
        return 'feather icon-alert-triangle';
      case 'info':
        return 'feather icon-info';
      default:
        return 'feather icon-bell';
    }
  }

  getToastTitle(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'Éxito';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      case 'info':
        return 'Información';
      default:
        return 'Notificación';
    }
  }
}
