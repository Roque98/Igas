import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { UserService } from '../services/user.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
/**
 * Auth Guard - Protects routes that require authentication
 * Usage in routes:
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const { data } = await supabaseService.getSession();

  if (data.session) {
    return true;
  }

  // Redirect to login if not authenticated
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

/**
 * Public Guard - Redirects authenticated users away from public pages (like login)
 * Usage in routes:
 * {
 *   path: 'login',
 *   component: AuthSigninComponent,
 *   canActivate: [publicGuard]
 * }
 */
export const publicGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const { data } = await supabaseService.getSession();

  if (!data.session) {
    return true;
  }

  // Redirect to dashboard if already authenticated
  router.navigate(['/dashboard']);
  return false;
};

/**
 * Role Guard - Protects routes based on user roles
 * Usage in routes:
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [authGuard, roleGuard],
 *   data: { roles: ['Administrador'] }
 * }
 *
 * Multiple roles (user needs at least one):
 * data: { roles: ['Administrador', 'Supervisor'] }
 */
export const roleGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const userService = inject(UserService);
  const router = inject(Router);

  // First check if user is authenticated
  const { data: sessionData } = await supabaseService.getSession();
  if (!sessionData.session) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Get required roles from route data
  const requiredRoles = route.data['roles'] as string[] | undefined;

  // If no roles specified, allow access (just auth is enough)
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  try {
    // Get current user profile with role
    const response = await firstValueFrom(userService.getCurrentUserProfile());

    if (!response.success || !response.data) {
      router.navigate(['/dashboard']);
      return false;
    }

    const userRole = response.data.rol?.nombre;

    // Check if user has any of the required roles
    if (userRole && requiredRoles.includes(userRole)) {
      return true;
    }

    // User doesn't have required role - redirect to dashboard
    if (!environment.production) { console.warn(`Access denied: User role "${userRole}" not in required roles:`, requiredRoles); }
    router.navigate(['/dashboard']);
    return false;
  } catch (error) {
    if (!environment.production) { console.error('Error checking user role:', error); }
    router.navigate(['/dashboard']);
    return false;
  }
};

/**
 * Admin Guard - Shortcut for routes that only admins can access
 * Usage in routes:
 * {
 *   path: 'settings',
 *   component: SettingsComponent,
 *   canActivate: [authGuard, adminGuard]
 * }
 */
export const adminGuard: CanActivateFn = async (route, state) => {
  const userService = inject(UserService);
  const router = inject(Router);

  try {
    const isAdmin = await firstValueFrom(userService.isAdmin());

    if (isAdmin) {
      return true;
    }

    if (!environment.production) { console.warn('Access denied: Admin role required'); }
    router.navigate(['/dashboard']);
    return false;
  } catch (error) {
    if (!environment.production) { console.error('Error checking admin status:', error); }
    router.navigate(['/dashboard']);
    return false;
  }
};
