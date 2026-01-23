// ============================================================================
// Users Module Routes
// ============================================================================
// Configuración de rutas para el módulo de gestión de usuarios
// ============================================================================

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/user-list/user-list.component').then(c => c.UserListComponent),
    title: 'Usuarios - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/user-form/user-form.component').then(c => c.UserFormComponent),
    title: 'Nuevo Usuario - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./pages/user-form/user-form.component').then(c => c.UserFormComponent),
    title: 'Editar Usuario - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] }
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/user-profile/user-profile.component').then(c => c.UserProfileComponent),
    title: 'Mi Perfil - iGAS Helpdesk'
    // No roleGuard - todos los usuarios autenticados pueden ver su propio perfil
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/user-detail/user-detail.component').then(c => c.UserDetailComponent),
    title: 'Detalle Usuario - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  }
];
