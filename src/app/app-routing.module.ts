import { NgModule } from '@angular/core';
import { Routes, RouterModule, PreloadAllModules } from '@angular/router';

// project import
import { AdminComponent } from './theme/layout/admin/admin.component';
import { GuestComponent } from './theme/layout/guest/guest.component';
import { authGuard, publicGuard } from './core/guards/auth.guard';

// ============================================================================
// CONFIGURACIÓN DE RUTAS CON LAZY LOADING
// ============================================================================
// - Todas las rutas usan lazy loading para optimizar el bundle inicial
// - PreloadAllModules: Precarga módulos en segundo plano después de la carga inicial
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
      // Dashboard principal
      {
        path: 'dashboard',
        loadComponent: () => import('./demo/dashboard/dashboard.component').then((c) => c.DashboardComponent)
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

      // Gestión de Tickets de Soporte
      {
        path: 'tickets',
        loadChildren: () => import('./features/tickets/tickets.routes').then((m) => m.TICKETS_ROUTES)
      }

      // TODO: Agregar más rutas de la aplicación aquí
      // {
      //   path: 'clientes',
      //   loadChildren: () => import('./features/clientes/clientes.routes').then((m) => m.CLIENTES_ROUTES)
      // }
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
      // Estrategia de precarga: carga módulos en segundo plano
      preloadingStrategy: PreloadAllModules,
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
