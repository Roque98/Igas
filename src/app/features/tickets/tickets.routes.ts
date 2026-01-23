// ============================================================================
// Tickets Module Routes
// ============================================================================
// Configuración de rutas para el módulo de gestión de tickets de soporte
// ============================================================================

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const TICKETS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/ticket-dashboard/ticket-dashboard.component').then(c => c.TicketDashboardComponent),
    title: 'Dashboard Tickets - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  },
  {
    path: 'lista',
    loadComponent: () => import('./pages/ticket-list/ticket-list.component').then(c => c.TicketListComponent),
    title: 'Tickets - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/ticket-form/ticket-form.component').then(c => c.TicketFormComponent),
    title: 'Nuevo Ticket - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/ticket-detail/ticket-detail.component').then(c => c.TicketDetailComponent),
    title: 'Detalle Ticket - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor', 'Técnico'] }
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./pages/ticket-form/ticket-form.component').then(c => c.TicketFormComponent),
    title: 'Editar Ticket - iGAS Helpdesk',
    canActivate: [roleGuard],
    data: { roles: ['Administrador', 'Supervisor'] }
  }
];
