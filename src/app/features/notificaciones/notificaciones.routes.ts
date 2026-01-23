// ============================================================================
// Notificaciones Routes
// ============================================================================

import { Routes } from '@angular/router';

export const NOTIFICACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/notification-center/notification-center.component').then(
        (c) => c.NotificationCenterComponent
      )
  },
  {
    path: 'preferencias',
    loadComponent: () =>
      import('./pages/notification-preferences/notification-preferences.component').then(
        (c) => c.NotificationPreferencesComponent
      )
  }
];
