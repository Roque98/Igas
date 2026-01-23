// ============================================================================
// Horarios Module Routes
// ============================================================================
// Configuración de rutas para el módulo de gestión de horarios/turnos
// ============================================================================

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const HORARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/horario-list/horario-list.component').then(c => c.HorarioListComponent),
    title: 'Horarios - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/horario-form/horario-form.component').then(c => c.HorarioFormComponent),
    title: 'Nuevo Horario - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./pages/horario-form/horario-form.component').then(c => c.HorarioFormComponent),
    title: 'Editar Horario - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/horario-detail/horario-detail.component').then(c => c.HorarioDetailComponent),
    title: 'Detalle Horario - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  }
];
