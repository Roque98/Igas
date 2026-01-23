// ============================================================================
// Auditoria Routes
// ============================================================================
// Rutas para el módulo de auditoría (solo admin)
// ============================================================================

import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const AUDITORIA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/audit-log/audit-log.component').then(m => m.AuditLogComponent),
    canActivate: [roleGuard],
    data: { roles: ['Administrador'] },
    title: 'Auditoría - iGAS Helpdesk'
  }
];
