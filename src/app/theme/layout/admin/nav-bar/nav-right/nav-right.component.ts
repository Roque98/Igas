// angular import
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

// bootstrap import
import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { SupabaseService } from 'src/app/core/services/supabase.service';
import { NotificationService } from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-nav-right',
  imports: [SharedModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss'],
  providers: [NgbDropdownConfig]
})
export class NavRightComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Observable para el usuario actual
  currentUser$ = this.supabase.currentUser$;

  // constructor
  constructor() {
    const config = inject(NgbDropdownConfig);
    config.placement = 'bottom-right';
  }

  async logout() {
    const { error } = await this.supabase.signOut();
    if (error) {
      console.error('Error logging out:', error);
      this.notificationService.error('Error al cerrar sesión. Por favor, intenta de nuevo.');
    } else {
      this.notificationService.info('Has cerrado sesión correctamente.');
      this.router.navigate(['/login']);
    }
  }
}
