// angular import
import { Component, OnDestroy, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';

//
import screenfull from 'screenfull';

@Component({
  selector: 'app-nav-left',
  imports: [SharedModule],
  templateUrl: './nav-left.component.html',
  styleUrls: ['./nav-left.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavLeftComponent implements OnInit, OnDestroy {
  // Usar signal para evitar problemas de detección de cambios
  isFullscreen = signal(false);

  // Handler bound para poder removerlo
  private onChangeHandler = () => {
    // Usar setTimeout para salir del ciclo de change detection
    setTimeout(() => {
      this.isFullscreen.set(screenfull.isEnabled && screenfull.isFullscreen);
    }, 0);
  };

  ngOnInit() {
    if (screenfull.isEnabled) {
      this.isFullscreen.set(screenfull.isFullscreen);
      screenfull.on('change', this.onChangeHandler);
    }
  }

  ngOnDestroy() {
    if (screenfull.isEnabled) {
      screenfull.off('change', this.onChangeHandler);
    }
  }

  toggleFullscreen() {
    if (screenfull.isEnabled) {
      screenfull.toggle();
    }
  }
}
