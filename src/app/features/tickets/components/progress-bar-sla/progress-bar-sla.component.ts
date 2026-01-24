// ============================================================================
// Progress Bar SLA Component
// ============================================================================
// Componente para mostrar la barra de progreso del SLA con colores
// ============================================================================

import { Component, Input, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SemaforoSLA, SEMAFORO_CONFIG } from 'src/app/core/models';

@Component({
  selector: 'app-progress-bar-sla',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  template: `
    <div
      class="progress-sla-container"
      [ngbTooltip]="tooltipText()"
    >
      <div class="progress-sla">
        <div
          class="progress-sla-bar"
          [style.width]="progressWidth()"
          [style.background-color]="progressColor()"
        ></div>
      </div>
      @if (showPercentage) {
        <span class="progress-sla-text" [style.color]="progressColor()">
          {{ displayPercentage() }}%
        </span>
      }
    </div>
  `,
  styles: [`
    .progress-sla-container {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .progress-sla {
      flex: 1;
      height: 8px;
      background-color: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-sla.large {
      height: 12px;
      border-radius: 6px;
    }
    .progress-sla-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease, background-color 0.3s ease;
    }
    .progress-sla-text {
      font-size: 12px;
      font-weight: 600;
      min-width: 40px;
      text-align: right;
    }
    :host(.large) .progress-sla {
      height: 12px;
    }
    :host(.large) .progress-sla-text {
      font-size: 14px;
    }
  `]
})
export class ProgressBarSLAComponent {
  @Input({ required: true }) porcentaje!: number;
  @Input({ required: true }) semaforo!: SemaforoSLA;
  @Input() showPercentage = true;
  @Input() maxWidth = 100;
  @Input() size: 'normal' | 'large' = 'normal';

  progressWidth = computed(() => {
    const width = Math.min(this.porcentaje, this.maxWidth);
    return `${Math.max(0, width)}%`;
  });

  progressColor = computed(() => {
    return SEMAFORO_CONFIG[this.semaforo]?.color || '#4CAF50';
  });

  displayPercentage = computed(() => {
    return Math.round(this.porcentaje);
  });

  tooltipText = computed(() => {
    const config = SEMAFORO_CONFIG[this.semaforo];
    if (!config) return `${this.porcentaje.toFixed(1)}% del SLA`;
    return `${config.label} - ${this.porcentaje.toFixed(1)}% del SLA consumido`;
  });
}
