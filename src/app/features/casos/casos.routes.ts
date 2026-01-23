// ============================================================================
// Casos Module Routes
// ============================================================================
// Configuración de rutas para el módulo de gestión de casos (escalamientos)
// ============================================================================

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const CASOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/caso-dashboard/caso-dashboard.component').then(c => c.CasoDashboardComponent),
    title: 'Dashboard Casos - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  },
  {
    path: 'lista',
    loadComponent: () => import('./pages/caso-list/caso-list.component').then(c => c.CasoListComponent),
    title: 'Lista de Casos - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/caso-detail/caso-detail.component').then(c => c.CasoDetailComponent),
    title: 'Detalle Caso - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  }
];
