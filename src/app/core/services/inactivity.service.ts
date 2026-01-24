import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class InactivityService implements OnDestroy {
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos en milisegundos
  private events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  private isWatching = false;

  // Rutas excluidas donde NO se aplicará el auto-logout
  private excludedRoutes = ['/dashboard'];
  private currentRoute = '';

  // Referencia bound para poder remover correctamente los event listeners
  private boundOnUserActivity = this.onUserActivity.bind(this);

  // Subscription para cleanup
  private routerSubscription: Subscription | null = null;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private ngZone: NgZone
  ) {
    // Monitorear cambios de ruta
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.checkRouteAndUpdateWatching();
      });
  }

  /**
   * Cleanup al destruir el servicio
   */
  ngOnDestroy(): void {
    this.stopWatching();
    this.routerSubscription?.unsubscribe();
  }

  /**
   * Inicia el monitoreo de inactividad
   */
  startWatching(): void {
    if (this.isWatching || this.isRouteExcluded()) {
      return;
    }

    this.isWatching = true;
    this.resetTimer();

    // Registrar eventos de actividad del usuario usando la referencia bound
    this.events.forEach((event) => {
      window.addEventListener(event, this.boundOnUserActivity, true);
    });
  }

  /**
   * Detiene el monitoreo de inactividad
   */
  stopWatching(): void {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;
    this.clearTimer();

    // Remover event listeners usando la misma referencia bound
    this.events.forEach((event) => {
      window.removeEventListener(event, this.boundOnUserActivity, true);
    });
  }

  /**
   * Verifica si la ruta actual está excluida
   */
  private isRouteExcluded(): boolean {
    return this.excludedRoutes.some(route => this.currentRoute.includes(route));
  }

  /**
   * Verifica la ruta y actualiza el estado del monitoreo
   */
  private checkRouteAndUpdateWatching(): void {
    if (this.isRouteExcluded()) {
      // Si estamos en una ruta excluida, detener el monitoreo
      if (this.isWatching) {
        this.stopWatching();
      }
    } else {
      // Si no estamos en una ruta excluida y el usuario está autenticado, iniciar monitoreo
      if (this.supabase.isAuthenticated() && !this.isWatching) {
        this.startWatching();
      }
    }
  }

  /**
   * Se ejecuta cuando el usuario realiza alguna actividad
   */
  private onUserActivity(): void {
    if (this.isWatching) {
      this.resetTimer();
    }
  }

  /**
   * Reinicia el timer de inactividad
   */
  private resetTimer(): void {
    this.clearTimer();

    this.ngZone.runOutsideAngular(() => {
      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.onInactivityTimeout();
        });
      }, this.INACTIVITY_TIMEOUT);
    });
  }

  /**
   * Se ejecuta cuando se alcanza el timeout de inactividad
   */
  private async onInactivityTimeout(): Promise<void> {
    if (!environment.production) {
      console.log('Sesión cerrada por inactividad');
    }

    // Detener el monitoreo
    this.stopWatching();

    // Cerrar sesión
    await this.supabase.signOut();

    // Redirigir al login con mensaje
    this.router.navigate(['/login'], {
      queryParams: { reason: 'inactivity' }
    });
  }

  /**
   * Limpia el timer actual
   */
  private clearTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
}
