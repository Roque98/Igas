// Angular import
import { Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

// project import
import { SpinnerComponent } from './theme/shared/components/spinner/spinner.component';
import { ToastContainerComponent } from './core/components/toast-container/toast-container.component';
import { InactivityService } from './core/services/inactivity.service';
import { SupabaseService } from './core/services/supabase.service';

@Component({
  selector: 'app-root',
  imports: [SpinnerComponent, RouterModule, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private inactivityService = inject(InactivityService);
  private supabaseService = inject(SupabaseService);

  title = 'datta-able';

  // life cycle hook
  ngOnInit() {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });

    // Iniciar monitoreo de inactividad cuando el usuario esté autenticado
    this.supabaseService.currentUser$.subscribe((user) => {
      if (user) {
        this.inactivityService.startWatching();
      } else {
        this.inactivityService.stopWatching();
      }
    });
  }
}
