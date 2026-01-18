// ============================================================================
// Users Module Routes
// ============================================================================
// Configuración de rutas para el módulo de gestión de usuarios
// ============================================================================

import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/user-list/user-list.component').then(c => c.UserListComponent),
    title: 'Usuarios - iGAS Helpdesk'
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/user-form/user-form.component').then(c => c.UserFormComponent),
    title: 'Nuevo Usuario - iGAS Helpdesk'
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./pages/user-form/user-form.component').then(c => c.UserFormComponent),
    title: 'Editar Usuario - iGAS Helpdesk'
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/user-profile/user-profile.component').then(c => c.UserProfileComponent),
    title: 'Mi Perfil - iGAS Helpdesk'
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/user-detail/user-detail.component').then(c => c.UserDetailComponent),
    title: 'Detalle Usuario - iGAS Helpdesk'
  }
];
