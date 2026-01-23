// ============================================================================
// Notification Preferences Component
// ============================================================================
// Configuración de preferencias de notificaciones por usuario
// ============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { NotificationPushService } from 'src/app/core/services/notification-push.service';
import { NotificationService as ToastService } from 'src/app/core/services/notification.service';
import {
  PreferenciasPorCategoria,
  PreferenciaNotificacionConTipo,
  NOTIFICATION_CATEGORY_ICONS
} from 'src/app/core/models';

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SharedModule, NgbTooltipModule],
  templateUrl: './notification-preferences.component.html',
  styleUrls: ['./notification-preferences.component.scss']
})
export class NotificationPreferencesComponent implements OnInit {
  private notificationPushService = inject(NotificationPushService);
  private toastService = inject(ToastService);

  // Estado
  loading = signal(true);
  saving = signal<string | null>(null);
  preferencias = signal<PreferenciasPorCategoria[]>([]);

  // Iconos de categorías
  categoryIcons = NOTIFICATION_CATEGORY_ICONS;

  ngOnInit(): void {
    this.loadPreferencias();
  }

  loadPreferencias(): void {
    this.loading.set(true);

    this.notificationPushService.getPreferenciasAgrupadas().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.preferencias.set(response.data);
        } else {
          this.toastService.error('Error al cargar las preferencias');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading preferences:', err);
        this.toastService.error('Error al cargar las preferencias');
        this.loading.set(false);
      }
    });
  }

  onPreferenciaChange(pref: PreferenciaNotificacionConTipo, field: 'push' | 'email'): void {
    const newPush = field === 'push' ? !pref.recibir_push : pref.recibir_push;
    const newEmail = field === 'email' ? !pref.recibir_email : pref.recibir_email;

    this.saving.set(pref.tipo_codigo);

    this.notificationPushService.updatePreferencia(
      pref.tipo_codigo,
      newPush,
      newEmail
    ).subscribe({
      next: (response) => {
        if (response.success) {
          // Actualizar el estado local
          this.preferencias.update(cats =>
            cats.map(cat => ({
              ...cat,
              preferencias: cat.preferencias.map(p =>
                p.tipo_codigo === pref.tipo_codigo
                  ? { ...p, recibir_push: newPush, recibir_email: newEmail }
                  : p
              )
            }))
          );
        } else {
          this.toastService.error('Error al guardar la preferencia');
        }
        this.saving.set(null);
      },
      error: () => {
        this.toastService.error('Error al guardar la preferencia');
        this.saving.set(null);
      }
    });
  }

  toggleAllPush(categoria: PreferenciasPorCategoria, enable: boolean): void {
    categoria.preferencias.forEach(pref => {
      if (pref.recibir_push !== enable) {
        this.onPreferenciaChange(pref, 'push');
      }
    });
  }

  toggleAllEmail(categoria: PreferenciasPorCategoria, enable: boolean): void {
    categoria.preferencias.forEach(pref => {
      if (pref.recibir_email !== enable) {
        this.onPreferenciaChange(pref, 'email');
      }
    });
  }

  getCategoryIcon(categoria: string): string {
    return this.categoryIcons[categoria as keyof typeof this.categoryIcons] || 'bell';
  }

  isSaving(tipoCodigo: string): boolean {
    return this.saving() === tipoCodigo;
  }

  resetToDefaults(): void {
    this.preferencias().forEach(cat => {
      cat.preferencias.forEach(pref => {
        if (pref.recibir_push !== pref.default_push || pref.recibir_email !== pref.default_email) {
          this.notificationPushService.updatePreferencia(
            pref.tipo_codigo,
            pref.default_push,
            pref.default_email
          ).subscribe({
            next: () => {
              this.preferencias.update(cats =>
                cats.map(c => ({
                  ...c,
                  preferencias: c.preferencias.map(p =>
                    p.tipo_codigo === pref.tipo_codigo
                      ? { ...p, recibir_push: pref.default_push, recibir_email: pref.default_email }
                      : p
                  )
                }))
              );
            }
          });
        }
      });
    });

    this.toastService.success('Preferencias restauradas a valores por defecto');
  }
}
