import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

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
