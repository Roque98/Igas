// ============================================================================
// Equipos Module Routes
// ============================================================================
// Configuración de rutas para el módulo de gestión de equipos/áreas
// ============================================================================

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const EQUIPOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/equipo-list/equipo-list.component').then(c => c.EquipoListComponent),
    title: 'Equipos - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/equipo-form/equipo-form.component').then(c => c.EquipoFormComponent),
    title: 'Nuevo Equipo - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./pages/equipo-form/equipo-form.component').then(c => c.EquipoFormComponent),
    title: 'Editar Equipo - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/equipo-detail/equipo-detail.component').then(c => c.EquipoDetailComponent),
    title: 'Detalle Equipo - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  }
];
