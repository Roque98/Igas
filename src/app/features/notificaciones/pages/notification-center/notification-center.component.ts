// ============================================================================
// Notification Center Component
// ============================================================================
// Centro de notificaciones con filtros, tabs y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbNavModule, NgbPaginationModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { NotificationPushService } from 'src/app/core/services/notification-push.service';
import { NotificationService as ToastService } from 'src/app/core/services/notification.service';
import {
  Notification,
  NotificationFilters,
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_CATEGORY_NAMES,
  NotificationCategory
} from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';

type TabFilter = 'todas' | 'no_leidas' | 'leidas';

interface GroupedNotifications {
  label: string;
  notifications: Notification[];
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SharedModule,
    NgbNavModule,
    NgbPaginationModule,
    NgbTooltipModule
  ],
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationCenterComponent implements OnInit {
  notificationPushService = inject(NotificationPushService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  // Estado
  loading = signal(false);
  notifications = signal<Notification[]>([]);
  totalItems = signal(0);

  // Tabs y filtros
  activeTab = signal<TabFilter>('todas');
  selectedCategoria = signal<NotificationCategory | ''>('');

  // Paginación
  currentPage = signal(1);
  pageSize = 20;

  // Selección múltiple
  selectedIds = signal<Set<string>>(new Set());
  selectAll = signal(false);

  // Computed
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));
  hasSelected = computed(() => this.selectedIds().size > 0);
  allSelected = computed(() => {
    const notifs = this.notifications();
    const selected = this.selectedIds();
    return notifs.length > 0 && notifs.every(n => selected.has(n.id));
  });

  // Notificaciones agrupadas por fecha
  groupedNotifications = computed(() => this.groupByDate(this.notifications()));

  // Constantes para template
  categoryNames = NOTIFICATION_CATEGORY_NAMES;
  categories: NotificationCategory[] = ['tickets', 'casos', 'clientes', 'mantenimientos', 'instalaciones', 'sistema'];
  Math = Math; // For template access

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.selectedIds.set(new Set());
    this.selectAll.set(false);

    const filters: NotificationFilters = {};

    // Filtro por tab
    if (this.activeTab() === 'no_leidas') {
      filters.leida = false;
    } else if (this.activeTab() === 'leidas') {
      filters.leida = true;
    }

    // Filtro por categoría - necesitaría ajustar el servicio para filtrar por categoría
    // Por ahora lo dejamos sin este filtro ya que requiere cambios en el backend

    this.notificationPushService.getNotifications(filters, {
      page: this.currentPage(),
      pageSize: this.pageSize
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        let data = response.data || [];

        // Filtrar por categoría en frontend si está seleccionada
        if (this.selectedCategoria()) {
          const catTipos = this.getTiposByCategoria(this.selectedCategoria() as NotificationCategory);
          data = data.filter(n => catTipos.includes(n.tipo));
        }

        this.notifications.set(data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading notifications:', err); }
        this.toastService.error('Error al cargar las notificaciones');
        this.loading.set(false);
      }
    });
  }

  onTabChange(tab: TabFilter): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadNotifications();
  }

  onCategoriaChange(): void {
    this.currentPage.set(1);
    this.loadNotifications();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadNotifications();
  }

  // ============================================================================
  // Acciones sobre notificaciones
  // ============================================================================

  markAsRead(notification: Notification): void {
    if (notification.leida) return;

    this.notificationPushService.markAsRead(notification.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => n.id === notification.id ? { ...n, leida: true } : n)
        );
      }
    });
  }

  markAsUnread(notification: Notification): void {
    // Esta funcionalidad requeriría un método adicional en el servicio
    // Por ahora no está implementado
    this.toastService.info('Funcionalidad no disponible');
  }

  deleteNotification(notification: Notification): void {
    this.notificationPushService.deleteNotification(notification.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.notifications.update(list => list.filter(n => n.id !== notification.id));
          this.totalItems.update(t => t - 1);
          this.toastService.success('Notificación eliminada');
        }
      },
      error: () => {
        this.toastService.error('Error al eliminar la notificación');
      }
    });
  }

  // ============================================================================
  // Selección múltiple
  // ============================================================================

  toggleSelect(notification: Notification): void {
    this.selectedIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(notification.id)) {
        newSet.delete(notification.id);
      } else {
        newSet.add(notification.id);
      }
      return newSet;
    });
  }

  toggleSelectAll(): void {
    const notifs = this.notifications();
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(notifs.map(n => n.id)));
    }
  }

  isSelected(notification: Notification): boolean {
    return this.selectedIds().has(notification.id);
  }

  markSelectedAsRead(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.notificationPushService.markMultipleAsRead(ids).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => ids.includes(n.id) ? { ...n, leida: true } : n)
        );
        this.selectedIds.set(new Set());
        this.toastService.success(`${ids.length} notificaciones marcadas como leídas`);
      },
      error: () => {
        this.toastService.error('Error al marcar las notificaciones');
      }
    });
  }

  markAllAsRead(): void {
    this.notificationPushService.markAllAsRead().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, leida: true })));
        this.toastService.success('Todas las notificaciones marcadas como leídas');
      },
      error: () => {
        this.toastService.error('Error al marcar las notificaciones');
      }
    });
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  getNotificationIcon(tipo: string): string {
    return NOTIFICATION_TYPE_CONFIG[tipo]?.icon || 'bell';
  }

  getNotificationColor(tipo: string): string {
    return NOTIFICATION_TYPE_CONFIG[tipo]?.color || '#6c757d';
  }

  getNotificationLabel(tipo: string): string {
    return NOTIFICATION_TYPE_CONFIG[tipo]?.label || tipo;
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

  private groupByDate(notifications: Notification[]): GroupedNotifications[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeekStart = new Date(today.getTime() - today.getDay() * 86400000);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);

    const groups: Record<string, Notification[]> = {
      'Hoy': [],
      'Ayer': [],
      'Esta semana': [],
      'Semana pasada': [],
      'Anteriores': []
    };

    notifications.forEach(n => {
      const date = new Date(n.created_at);
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (dateOnly >= today) {
        groups['Hoy'].push(n);
      } else if (dateOnly >= yesterday) {
        groups['Ayer'].push(n);
      } else if (dateOnly >= thisWeekStart) {
        groups['Esta semana'].push(n);
      } else if (dateOnly >= lastWeekStart) {
        groups['Semana pasada'].push(n);
      } else {
        groups['Anteriores'].push(n);
      }
    });

    return Object.entries(groups)
      .filter(([_, notifs]) => notifs.length > 0)
      .map(([label, notifications]) => ({ label, notifications }));
  }

  private getTiposByCategoria(categoria: NotificationCategory): string[] {
    const tiposPorCategoria: Record<NotificationCategory, string[]> = {
      'tickets': [
        'ticket_asignado', 'ticket_reasignado', 'ticket_nuevo', 'ticket_comentario',
        'ticket_cambio_estatus', 'ticket_sla_amarillo', 'ticket_sla_rojo',
        'ticket_estatus', 'ticket_escalado', 'ticket_vencido', 'ticket_proximo_vencer'
      ],
      'casos': ['caso_asignado', 'caso_listo_validar', 'caso_regresado', 'caso_cerrado'],
      'clientes': ['licencia_por_vencer', 'licencia_vencida', 'poliza_por_vencer', 'poliza_vencida'],
      'mantenimientos': ['mantenimiento_programado', 'mantenimiento_recordatorio'],
      'instalaciones': ['instalacion_programada', 'instalacion_pendiente'],
      'sistema': ['sistema', 'sistema_info', 'sistema_alerta']
    };
    return tiposPorCategoria[categoria] || [];
  }
}
