// ============================================================================
// Selective Preloading Strategy
// ============================================================================
// Estrategia de precarga selectiva que solo precarga módulos marcados
// con data: { preload: true } en la configuración de rutas.
// Esto reduce el consumo de ancho de banda y mejora el rendimiento inicial.
// ============================================================================

import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  // Módulos que han sido precargados (para debugging)
  preloadedModules: string[] = [];

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    // Solo precargar si la ruta tiene data.preload = true
    if (route.data?.['preload'] === true) {
      // Registrar el módulo precargado
      const moduleName = route.path || 'unknown';
      this.preloadedModules.push(moduleName);

      // Precargar el módulo
      return load();
    }

    // No precargar - el módulo se cargará bajo demanda
    return of(null);
  }
}
