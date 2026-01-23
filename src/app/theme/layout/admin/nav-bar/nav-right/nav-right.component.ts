// angular import
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// bootstrap import
import { NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';

// project import
import { SharedModule } from 'src/app/theme/shared/shared.module';
import { SupabaseService } from 'src/app/core/services/supabase.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { NotificationPushService } from 'src/app/core/services/notification-push.service';
import { AuditService } from 'src/app/core/services/audit.service';
import { UserService } from 'src/app/core/services/user.service';
import { Notification } from 'src/app/core/models';

@Component({
  selector: 'app-nav-right',
  imports: [SharedModule, CommonModule],
  templateUrl: './nav-right.component.html',
  styleUrls: ['./nav-right.component.scss'],
  providers: [NgbDropdownConfig]
})
export class NavRightComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private notificationPushService = inject(NotificationPushService);
  private auditService = inject(AuditService);
  private userService = inject(UserService);

  // Observable para el usuario actual
  currentUser$ = this.supabase.currentUser$;

  // Notificaciones
  unreadCount = this.notificationPushService.unreadCount;
  notifications = this.notificationPushService.notifications;
  recentNotifications = computed(() => this.notifications().slice(0, 5));
  loadingNotifications = signal(false);

  // Datos del perfil del usuario (usando el estado global)
  userProfile = signal<{
    nombre_completo: string;
    avatar_url: string | null;
    email: string;
  } | null>(null);

  // constructor
  constructor() {
    const config = inject(NgbDropdownConfig);
    config.placement = 'bottom-right';
  }

  ngOnInit(): void {
    // Suscribirse al perfil global del usuario (se actualiza cuando cambia el avatar)
    this.userService.currentProfile$.subscribe(profile => {
      if (profile) {
        this.userProfile.set({
          nombre_completo: profile.nombre_completo,
          avatar_url: profile.avatar_url,
          email: profile.email
        });
      } else {
        this.userProfile.set(null);
      }
    });
  }

  getAvatarUrl(): string {
    const profile = this.userProfile();
    return profile?.avatar_url || 'assets/images/user/avatar-1.jpg';
  }

  getUserName(): string {
    const profile = this.userProfile();
    return profile?.nombre_completo || profile?.email || '';
  }

  goToProfile(): void {
    this.router.navigate(['/usuarios/perfil']);
  }

  async logout() {
    // Log logout event before signing out (while we still have user context)
    const user = this.supabase.user;
    if (user) {
      this.auditService.logSessionEvent('logout', user.id, user.email || undefined).subscribe();
    }

    const { error } = await this.supabase.signOut();
    if (error) {
      console.error('Error logging out:', error);
      this.notificationService.error('Error al cerrar sesión. Por favor, intenta de nuevo.');
    } else {
      this.notificationService.info('Has cerrado sesión correctamente.');
      this.router.navigate(['/login']);
    }
  }

  // ============================================================================
  // Métodos de Notificaciones
  // ============================================================================

  loadNotifications(): void {
    this.loadingNotifications.set(true);
    this.notificationPushService.getNotifications({ leida: false }, { page: 1, pageSize: 5 }).subscribe({
      next: () => this.loadingNotifications.set(false),
      error: () => this.loadingNotifications.set(false)
    });
  }

  markAsRead(notification: Notification): void {
    if (notification.leida) return;
    this.notificationPushService.markAsRead(notification.id).subscribe();
  }

  markAllAsRead(): void {
    this.notificationPushService.markAllAsRead().subscribe();
  }

  onNotificationClick(notification: Notification): void {
    this.markAsRead(notification);

    // Navegar según el tipo de notificación
    if (notification.datos?.['ticket_id']) {
      this.router.navigate(['/tickets', notification.datos['ticket_id']]);
    }
  }

  viewAllNotifications(): void {
    this.router.navigate(['/notificaciones']);
  }

  getNotificationIcon(tipo: string): string {
    const icons: Record<string, string> = {
      'ticket_asignado': 'user-check',
      'ticket_comentario': 'message-square',
      'ticket_estatus': 'refresh-cw',
      'sla_alerta': 'alert-triangle',
      'sistema': 'bell'
    };
    return icons[tipo] || 'bell';
  }

  getNotificationColor(tipo: string): string {
    const colors: Record<string, string> = {
      'ticket_asignado': '#1de9b6',
      'ticket_comentario': '#04a9f5',
      'ticket_estatus': '#a389d4',
      'sla_alerta': '#f44236',
      'sistema': '#f4c22b'
    };
    return colors[tipo] || '#6c757d';
  }

  formatRelativeTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }
}
