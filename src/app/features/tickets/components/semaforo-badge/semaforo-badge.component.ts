// ============================================================================
// Semaforo Badge Component
// ============================================================================
// Componente para mostrar el semáforo de SLA con colores visuales
// ============================================================================

import { Component, Input, computed, ChangeDetectionStrategy} from '@angular/core';
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
      role="status"
      [attr.aria-label]="ariaLabel()"
    >
      @if (showIcon) {
        <i [class]="iconClass()" aria-hidden="true"></i>
      }
      @if (showLabel) {
        <span class="badge-text">{{ config().label }}</span>
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
    .semaforo-badge.medium {
      padding: 5px 10px;
      font-size: 13px;
    }
    .semaforo-badge.large {
      padding: 6px 12px;
      font-size: 14px;
    }
    .semaforo-badge i {
      font-size: 1em;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SemaforoBadgeComponent {
  @Input({ required: true }) semaforo!: SemaforoSLA;
  @Input() porcentaje?: number;
  @Input() showIcon = true;
  @Input() showLabel = true;
  @Input() size: 'small' | 'normal' | 'medium' | 'large' = 'normal';

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

  ariaLabel = computed(() => {
    const label = this.config().label;
    if (this.porcentaje !== undefined) {
      return `Estado SLA: ${label}. ${this.porcentaje.toFixed(1)} por ciento del tiempo de SLA consumido`;
    }
    return `Estado SLA: ${label}`;
  });
}
