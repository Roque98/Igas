// ============================================================================
// Semaforo Badge Component
// ============================================================================
// Componente para mostrar el semáforo de SLA con colores visuales
// ============================================================================

import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SemaforoSLA, SEMAFORO_CONFIG } from 'src/app/core/models';

@Component({
  selector: 'app-semaforo-badge',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  template: `
    <span
      [class]="badgeClasses()"
      [style.background-color]="config().color"
      [style.border-color]="config().color"
      [ngbTooltip]="tooltipText()"
    >
      @if (showIcon) {
        <i [class]="iconClass()"></i>
      }
      @if (showLabel) {
        {{ config().label }}
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    .semaforo-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      color: white;
    }
    .semaforo-badge.small {
      padding: 2px 6px;
      font-size: 11px;
    }
    .semaforo-badge.large {
      padding: 6px 12px;
      font-size: 14px;
    }
    .semaforo-badge i {
      font-size: 1em;
    }
  `]
})
export class SemaforoBadgeComponent {
  @Input({ required: true }) semaforo!: SemaforoSLA;
  @Input() porcentaje?: number;
  @Input() showIcon = true;
  @Input() showLabel = true;
  @Input() size: 'small' | 'normal' | 'large' = 'normal';

  config = computed(() => {
    return SEMAFORO_CONFIG[this.semaforo] || SEMAFORO_CONFIG.verde;
  });

  badgeClasses = computed(() => {
    return `semaforo-badge ${this.size}`;
  });

  iconClass = computed(() => {
    return `feather icon-${this.config().icon}`;
  });

  tooltipText = computed(() => {
    const base = this.config().label;
    if (this.porcentaje !== undefined) {
      return `${base} - ${this.porcentaje.toFixed(1)}% del SLA`;
    }
    return base;
  });
}
