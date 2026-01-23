// ============================================================================
// Reportes Routes
// ============================================================================
// Configuración de rutas para el módulo de reportes
// ============================================================================

import { Routes } from '@angular/router';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'tickets',
    pathMatch: 'full'
  },
  {
    path: 'tickets',
    loadComponent: () =>
      import('./pages/reporte-tickets/reporte-tickets.component').then(c => c.ReporteTicketsComponent),
    title: 'Reporte de Tickets - iGAS'
  },
  {
    path: 'casos',
    loadComponent: () =>
      import('./pages/reporte-casos/reporte-casos.component').then(c => c.ReporteCasosComponent),
    title: 'Reporte de Casos - iGAS'
  }
];
