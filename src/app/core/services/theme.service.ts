// ============================================================================
// Theme Service
// ============================================================================
// Servicio para gestionar el tema claro/oscuro de la aplicacion
// Usa Bootstrap 5 data-bs-theme y persiste la preferencia del usuario
// ============================================================================

import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'igas-theme-preference';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  // Signal reactivo para el tema actual
  readonly theme = signal<Theme>(this.getInitialTheme());

  // Signal computado para saber si es modo oscuro
  readonly isDarkMode = () => this.theme() === 'dark';

  constructor() {
    // Efecto para aplicar el tema cuando cambia
    effect(() => {
      this.applyTheme(this.theme());
    });

    // Escuchar cambios en la preferencia del sistema
    if (isPlatformBrowser(this.platformId)) {
      this.listenToSystemPreference();
    }
  }

  /**
   * Alterna entre modo claro y oscuro
   */
  toggleTheme(): void {
    const newTheme: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Establece un tema especifico
   */
  setTheme(theme: Theme): void {
    this.theme.set(theme);
    this.savePreference(theme);
  }

  /**
   * Obtiene el tema inicial basado en preferencia guardada o del sistema
   */
  private getInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    // Primero, verificar si hay una preferencia guardada
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }

    // Si no hay preferencia guardada, usar la preferencia del sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  /**
   * Aplica el tema al documento HTML
   */
  private applyTheme(theme: Theme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Aplicar atributo data-bs-theme de Bootstrap 5
    document.documentElement.setAttribute('data-bs-theme', theme);

    // Agregar clase para estilos personalizados adicionales
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    // Actualizar meta theme-color para dispositivos moviles
    this.updateMetaThemeColor(theme);
  }

  /**
   * Guarda la preferencia del usuario
   */
  private savePreference(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }

  /**
   * Actualiza el meta tag theme-color para la barra de navegacion movil
   */
  private updateMetaThemeColor(theme: Theme): void {
    const color = theme === 'dark' ? '#1a1d21' : '#ffffff';
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    metaThemeColor.setAttribute('content', color);
  }

  /**
   * Escucha cambios en la preferencia del sistema
   */
  private listenToSystemPreference(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
      // Solo aplicar si el usuario no tiene una preferencia guardada
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme) {
        this.theme.set(e.matches ? 'dark' : 'light');
      }
    });
  }
}
