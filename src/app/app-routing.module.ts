import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// project import
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';
import { authGuard, publicGuard } from './core/guards/auth.guard';
import { SelectivePreloadingStrategy } from './core/strategies/selective-preloading.strategy';

// ============================================================================
// CONFIGURACIÓN DE RUTAS CON LAZY LOADING
// ============================================================================
// - Todas las rutas usan lazy loading para optimizar el bundle inicial
// - SelectivePreloadingStrategy: Solo precarga módulos marcados con preload: true
// - Módulos críticos (dashboard, tickets, casos) se precargan automáticamente
// - Módulos secundarios se cargan bajo demanda para ahorrar ancho de banda
// - Rutas organizadas por layout: Admin (autenticado) y Guest (público)
// ============================================================================

const routes: Routes = [
  // ============================================================================
  // RUTAS PROTEGIDAS (ADMIN LAYOUT)
  // ============================================================================
  // Requiere autenticación - Guard: authGuard
  {
    path: '',
    component: AdminComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      // Dashboard principal - PRECARGA (módulo crítico)
      {
        path: 'dashboard',
        loadComponent: () => import('./demo/dashboard/dashboard.component').then((c) => c.DashboardComponent),
        data: { preload: true }
      },
      // Componentes de demostración (ocultos en navegación)
      {
        path: 'basic',
        loadChildren: () => import('./demo/ui-elements/ui-basic/ui-basic.module').then((m) => m.UiBasicModule)
      },
      {
        path: 'forms',
        loadComponent: () => import('./demo/pages/form-element/form-element').then((c) => c.FormElement)
      },
      {
        path: 'tables',
        loadComponent: () => import('./demo/pages/tables/tbl-bootstrap/tbl-bootstrap.component').then((c) => c.TblBootstrapComponent)
      },
      {
        path: 'apexchart',
        loadComponent: () => import('./demo/pages/core-chart/apex-chart/apex-chart.component').then((c) => c.ApexChartComponent)
      },
      {
        path: 'sample-page',
        loadComponent: () => import('./demo/extra/sample-page/sample-page.component').then((c) => c.SamplePageComponent)
      },

      // ============================================================================
      // RUTAS DE LA APLICACIÓN
      // ============================================================================

      // Gestión de Usuarios
      {
        path: 'usuarios',
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES)
      },

      // Gestión de Equipos/Áreas
      {
        path: 'equipos',
        loadChildren: () => import('./features/equipos/equipos.routes').then((m) => m.EQUIPOS_ROUTES)
      },

      // Gestión de Horarios/Turnos
      {
        path: 'horarios',
        loadChildren: () => import('./features/horarios/horarios.routes').then((m) => m.HORARIOS_ROUTES)
      },

      // Auditoría del sistema (solo admin)
      {
        path: 'auditoria',
        loadChildren: () => import('./features/auditoria/auditoria.routes').then((m) => m.AUDITORIA_ROUTES)
      },

      // Gestión de Tickets de Soporte - PRECARGA (módulo crítico)
      {
        path: 'tickets',
        loadChildren: () => import('./features/tickets/tickets.routes').then((m) => m.TICKETS_ROUTES),
        data: { preload: true }
      },

      // Gestión de Casos (Escalamientos) - PRECARGA (módulo crítico)
      {
        path: 'casos',
        loadChildren: () => import('./features/casos/casos.routes').then((m) => m.CASOS_ROUTES),
        data: { preload: true }
      },

      // Gestión de Clientes
      {
        path: 'clientes',
        loadChildren: () => import('./features/clientes/clientes.routes').then((m) => m.CLIENTES_ROUTES)
      },

      // Gestión de Mantenimientos
      {
        path: 'mantenimientos',
        loadChildren: () => import('./features/mantenimientos/mantenimientos.routes').then((m) => m.MANTENIMIENTOS_ROUTES)
      },

      // Gestión de Instalaciones
      {
        path: 'instalaciones',
        loadChildren: () => import('./features/instalaciones/instalaciones.routes').then((m) => m.INSTALACIONES_ROUTES)
      },

      // Reportes y Estadísticas
      {
        path: 'reportes',
        loadChildren: () => import('./features/reportes/reportes.routes').then((m) => m.REPORTES_ROUTES)
      },

      // Centro de Notificaciones - PRECARGA (módulo crítico)
      {
        path: 'notificaciones',
        loadChildren: () => import('./features/notificaciones/notificaciones.routes').then((m) => m.NOTIFICACIONES_ROUTES),
        data: { preload: true }
      }
    ]
  },

  // ============================================================================
  // RUTAS PÚBLICAS (GUEST LAYOUT)
  // ============================================================================
  // Requiere NO estar autenticado - Guard: publicGuard
  {
    path: '',
    component: GuestComponent,
    canActivate: [publicGuard],
    children: [
      // Login
      {
        path: 'login',
        loadComponent: () => import('./demo/pages/authentication/auth-signin/auth-signin.component').then((c) => c.AuthSigninComponent)
      },
      // Registro deshabilitado - Los usuarios son creados por administradores
      // {
      //   path: 'register',
      //   loadComponent: () => import('./demo/pages/authentication/auth-signup/auth-signup.component').then((c) => c.AuthSignupComponent)
      // },
      // Recuperar contraseña
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./demo/pages/authentication/auth-forgot-password/auth-forgot-password.component').then((c) => c.AuthForgotPasswordComponent)
      }
    ]
  },

  // ============================================================================
  // RUTAS SIN GUARD (GUEST LAYOUT)
  // ============================================================================
  // Accesible sin importar estado de autenticación
  {
    path: '',
    component: GuestComponent,
    children: [
      // Reset password (link viene del email)
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./demo/pages/authentication/auth-reset-password/auth-reset-password.component').then((c) => c.AuthResetPasswordComponent)
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // Estrategia de precarga selectiva: solo módulos marcados con preload: true
      // Módulos críticos: dashboard, tickets, casos, notificaciones
      // Otros módulos se cargan bajo demanda para ahorrar ancho de banda
      preloadingStrategy: SelectivePreloadingStrategy,
      // Habilitar scroll hacia arriba en navegación
      scrollPositionRestoration: 'enabled',
      // Guardar posición de scroll en historial
      anchorScrolling: 'enabled',
      // Habilitar rastreo de fragmentos de URL (#)
      scrollOffset: [0, 64] // Offset para navbar fija
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
