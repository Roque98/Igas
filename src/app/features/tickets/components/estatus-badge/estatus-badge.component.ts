// ============================================================================
// Estatus Badge Component
// ============================================================================
// Componente para mostrar el estatus del ticket con colores de BD
// ============================================================================

import { Component, Input, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-estatus-badge',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  template: `
    <span
      [class]="badgeClasses()"
      [style.background-color]="color"
      [ngbTooltip]="tooltip"
      role="status"
      [attr.aria-label]="'Estatus: ' + nombre"
    >
      @if (showIcon && icon) {
        <i [class]="'feather icon-' + icon" aria-hidden="true"></i>
      }
      <span class="badge-text">{{ nombre }}</span>
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    .estatus-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      color: white;
    }
    .estatus-badge.small {
      padding: 2px 6px;
      font-size: 11px;
    }
    .estatus-badge.large {
      padding: 6px 14px;
      font-size: 14px;
    }
    .estatus-badge i {
      font-size: 1em;
    }
  `]
})
export class EstatusBadgeComponent {
  @Input({ required: true }) nombre!: string;
  @Input() color = '#6c757d';
  @Input() icon?: string;
  @Input() showIcon = false;
  @Input() tooltip?: string;
  @Input() size: 'small' | 'normal' | 'large' = 'normal';

  badgeClasses = computed(() => {
    return `estatus-badge ${this.size}`;
  });

  // Mapeo de estatus a iconos por defecto
  private estatusIcons: Record<string, string> = {
    'Nuevo': 'plus-circle',
    'En atención': 'play-circle',
    'En espera de cliente': 'pause-circle',
    'Seguimiento': 'clock',
    'Resuelto': 'check-circle',
    'Cerrado': 'x-circle'
  };

  getIcon(): string {
    if (this.icon) return this.icon;
    return this.estatusIcons[this.nombre] || 'circle';
  }
}
