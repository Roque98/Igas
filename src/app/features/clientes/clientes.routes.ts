// ============================================================================
// Clientes Module Routes
// ============================================================================
// Configuración de rutas para el módulo de gestión de clientes
// ============================================================================

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const CLIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/cliente-list/cliente-list.component').then(c => c.ClienteListComponent),
    title: 'Clientes - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/cliente-form/cliente-form.component').then(c => c.ClienteFormComponent),
    title: 'Nuevo Cliente - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/cliente-detail/cliente-detail.component').then(c => c.ClienteDetailComponent),
    title: 'Detalle Cliente - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  },
  {
    path: ':id/editar',
    loadComponent: () => import('./pages/cliente-form/cliente-form.component').then(c => c.ClienteFormComponent),
    title: 'Editar Cliente - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  }
];
