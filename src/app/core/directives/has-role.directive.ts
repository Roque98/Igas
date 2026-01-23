// ============================================================================
// Has Role Directive
// ============================================================================
// Directiva estructural para mostrar/ocultar elementos basados en el rol del usuario
// ============================================================================

import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../services/user.service';

/**
 * HasRole Directive - Shows/hides elements based on user roles
 *
 * Usage:
 * <!-- Single role -->
 * <div *hasRole="'Administrador'">Only admins see this</div>
 *
 * <!-- Multiple roles (user needs at least one) -->
 * <div *hasRole="['Administrador', 'Supervisor']">Admins or Supervisors see this</div>
 *
 * <!-- With else template -->
 * <div *hasRole="'Administrador'; else noAccess">Admin content</div>
 * <ng-template #noAccess>You don't have access</ng-template>
 */
@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private destroy$ = new Subject<void>();
  private requiredRoles: string[] = [];
  private hasView = false;

  @Input() set hasRole(roles: string | string[]) {
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  ngOnInit(): void {
    // Subscribe to user profile changes to update view when role changes
    this.userService.getCurrentUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    this.userService.getCurrentUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const userRole = response.data?.rol?.nombre;
          const hasRequiredRole = userRole && this.requiredRoles.includes(userRole);

          if (hasRequiredRole && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
          } else if (!hasRequiredRole && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
          }
        },
        error: () => {
          if (this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
          }
        }
      });
  }
}

/**
 * IsAdmin Directive - Shortcut for *hasRole="'Administrador'"
 *
 * Usage:
 * <div *isAdmin>Only admins see this</div>
 */
@Directive({
  selector: '[isAdmin]',
  standalone: true
})
export class IsAdminDirective implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private destroy$ = new Subject<void>();
  private hasView = false;

  ngOnInit(): void {
    this.updateView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    this.userService.isAdmin()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isAdmin) => {
          if (isAdmin && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
          } else if (!isAdmin && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
          }
        },
        error: () => {
          if (this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
          }
        }
      });
  }
}
