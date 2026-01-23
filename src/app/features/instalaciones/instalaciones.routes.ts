// ============================================================================
// Instalaciones Routes
// ============================================================================

import { Routes } from '@angular/router';

export const INSTALACIONES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'lista',
    pathMatch: 'full'
  },
  {
    path: 'lista',
    loadComponent: () =>
      import('./pages/instalacion-list/instalacion-list.component').then(c => c.InstalacionListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/instalacion-form/instalacion-form.component').then(c => c.InstalacionFormComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/instalacion-detail/instalacion-detail.component').then(c => c.InstalacionDetailComponent)
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/instalacion-form/instalacion-form.component').then(c => c.InstalacionFormComponent)
  }
];
