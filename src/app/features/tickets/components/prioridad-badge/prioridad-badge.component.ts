// ============================================================================
// Prioridad Badge Component
// ============================================================================
// Componente para mostrar la prioridad del ticket con colores
// ============================================================================

import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Prioridad, PRIORIDAD_CONFIG } from 'src/app/core/models';

@Component({
  selector: 'app-prioridad-badge',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  template: `
    <span
      [class]="badgeClasses()"
      [style.background-color]="config().color"
      [ngbTooltip]="config().descripcion"
    >
      @if (showIcon) {
        <i [class]="iconClass()"></i>
      }
      {{ config().label }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    .prioridad-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      color: white;
    }
    .prioridad-badge.small {
      padding: 2px 6px;
      font-size: 11px;
    }
    .prioridad-badge i {
      font-size: 1em;
    }
  `]
})
export class PrioridadBadgeComponent {
  @Input({ required: true }) prioridad!: Prioridad;
  @Input() showIcon = true;
  @Input() size: 'small' | 'normal' = 'normal';

  config = computed(() => {
    return PRIORIDAD_CONFIG[this.prioridad] || {
      label: this.prioridad,
      color: '#6c757d',
      icon: 'minus',
      descripcion: ''
    };
  });

  badgeClasses = computed(() => {
    return `prioridad-badge ${this.size}`;
  });

  iconClass = computed(() => {
    return `feather icon-${this.config().icon}`;
  });
}
