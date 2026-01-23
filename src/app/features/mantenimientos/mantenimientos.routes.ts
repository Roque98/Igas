// ============================================================================
// Mantenimientos Routes
// ============================================================================

import { Routes } from '@angular/router';

export const MANTENIMIENTOS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'lista',
    pathMatch: 'full'
  },
  {
    path: 'lista',
    loadComponent: () =>
      import('./pages/mantenimiento-list/mantenimiento-list.component').then(c => c.MantenimientoListComponent)
  },
  {
    path: 'calendario',
    loadComponent: () =>
      import('./pages/mantenimiento-calendar/mantenimiento-calendar.component').then(c => c.MantenimientoCalendarComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/mantenimiento-form/mantenimiento-form.component').then(c => c.MantenimientoFormComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/mantenimiento-detail/mantenimiento-detail.component').then(c => c.MantenimientoDetailComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/mantenimiento-form/mantenimiento-form.component').then(c => c.MantenimientoFormComponent)
  }
];
