// ============================================================================
// Notification Push Service
// ============================================================================
// Servicio para gestión de notificaciones push del sistema
// ============================================================================

import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import {
  Notification,
  NotificationFilters,
  ServiceResponse,
  PaginatedResponse,
  PaginationOptions,
  PreferenciaNotificacionConTipo,
  PreferenciasPorCategoria,
  NotificationCategory,
  NOTIFICATION_CATEGORY_NAMES,
  TipoNotificacion
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class NotificationPushService implements OnDestroy {
  private supabase = inject(SupabaseService);

  // Estado reactivo
  unreadCount = signal(0);
  notifications = signal<Notification[]>([]);

  // Subject para notificaciones en tiempo real
  private newNotification$ = new BehaviorSubject<Notification | null>(null);

  // Canal de Realtime
  private realtimeChannel: RealtimeChannel | null = null;
  private isSubscribed = false;

  constructor() {
    // Inicializar cuando el servicio se crea
    this.initializeNotifications();
  }

  ngOnDestroy(): void {
    this.unsubscribeFromRealtime();
  }

  private initializeNotifications(): void {
    // Suscribirse al observable de usuario para reaccionar a cambios
    this.supabase.currentUser$.subscribe(user => {
      if (user) {
        // Usuario autenticado - cargar notificaciones y suscribirse
        this.loadUnreadCount();
        this.subscribeToRealtime();
      } else {
        // Usuario no autenticado - limpiar estado
        this.unsubscribeFromRealtime();
        this.unreadCount.set(0);
        this.notifications.set([]);
      }
    });
  }

  /**
   * Suscribirse a notificaciones en tiempo real
   */
  private subscribeToRealtime(): void {
    const userId = this.supabase.user?.id;
    if (!userId) {
      console.log('🔔 No user ID for realtime subscription');
      return;
    }

    if (this.isSubscribed) {
      console.log('🔔 Already subscribed to notifications');
      return;
    }

    // Limpiar canal anterior si existe
    this.unsubscribeFromRealtime();

    console.log(`🔔 Subscribing to notifications for user: ${userId}`);

    this.realtimeChannel = this.supabase.client
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          const newNotification = payload.new as Notification;
          this.newNotification$.next(newNotification);
          this.unreadCount.update(count => count + 1);

          // Agregar a la lista local
          this.notifications.update(list => [newNotification, ...list]);
        }
      )
      .subscribe((status) => {
        console.log(`🔔 Realtime subscription status: ${status}`);
        this.isSubscribed = status === 'SUBSCRIBED';
        if (status === 'CHANNEL_ERROR') {
          console.error('🔔 Realtime channel error, retrying in 5s...');
          this.isSubscribed = false;
          setTimeout(() => this.subscribeToRealtime(), 5000);
        }
      });
  }

  /**
   * Desuscribirse del canal de Realtime
   */
  private unsubscribeFromRealtime(): void {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isSubscribed = false;
    }
  }

  /**
   * Observable para nuevas notificaciones en tiempo real
   */
  onNewNotification(): Observable<Notification | null> {
    return this.newNotification$.asObservable();
  }

  /**
   * Carga el conteo de notificaciones no leídas
   */
  async loadUnreadCount(): Promise<void> {
    console.log('🔔 Loading unread notification count...');
    const { data, error } = await this.supabase.client
      .rpc('contar_notificaciones_no_leidas');

    if (error) {
      console.error('🔔 Error loading unread count:', error);
      return;
    }

    console.log(`🔔 Unread count: ${data}`);
    this.unreadCount.set(data ?? 0);
  }

  /**
   * Obtiene las notificaciones con filtros y paginación
   */
  getNotifications(
    filters?: NotificationFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<Notification>> {
    return from(this.fetchNotifications(filters, pagination));
  }

  private async fetchNotifications(
    filters?: NotificationFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<Notification>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    }

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    let query = this.supabase.client
      .from('notificaciones')
      .select('*', { count: 'exact' })
      .eq('usuario_id', userId);

    // Aplicar filtros
    if (filters) {
      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.leida !== undefined) {
        query = query.eq('leida', filters.leida);
      }
      if (filters.desde) {
        query = query.gte('created_at', filters.desde);
      }
      if (filters.hasta) {
        query = query.lte('created_at', filters.hasta);
      }
    }

    query = query
      .order('created_at', { ascending: false })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const total = count ?? 0;

    // Actualizar lista local
    if (page === 1) {
      this.notifications.set(data as Notification[]);
    }

    return {
      data: data as Notification[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(notificationId: string): Observable<ServiceResponse<boolean>> {
    return from(this.markAsReadAsync(notificationId));
  }

  private async markAsReadAsync(notificationId: string): Promise<ServiceResponse<boolean>> {
    const { error } = await this.supabase.client
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return { data: null, error: error.message, success: false };
    }

    // Actualizar conteo
    this.unreadCount.update(count => Math.max(0, count - 1));

    // Actualizar lista local
    this.notifications.update(list =>
      list.map(n => n.id === notificationId ? { ...n, leida: true } : n)
    );

    return { data: true, error: null, success: true };
  }

  /**
   * Marca varias notificaciones como leídas
   */
  markMultipleAsRead(notificationIds: string[]): Observable<ServiceResponse<number>> {
    return from(this.markMultipleAsReadAsync(notificationIds));
  }

  private async markMultipleAsReadAsync(notificationIds: string[]): Promise<ServiceResponse<number>> {
    const { data, error } = await this.supabase.client
      .rpc('marcar_notificaciones_leidas', { p_notificacion_ids: notificationIds });

    if (error) {
      console.error('Error marking notifications as read:', error);
      return { data: null, error: error.message, success: false };
    }

    // Actualizar conteo y lista local
    await this.loadUnreadCount();
    this.notifications.update(list =>
      list.map(n => notificationIds.includes(n.id) ? { ...n, leida: true } : n)
    );

    return { data: data as number, error: null, success: true };
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): Observable<ServiceResponse<boolean>> {
    return from(this.markAllAsReadAsync());
  }

  private async markAllAsReadAsync(): Promise<ServiceResponse<boolean>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    const { error } = await this.supabase.client
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', userId)
      .eq('leida', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { data: null, error: error.message, success: false };
    }

    // Actualizar conteo y lista local
    this.unreadCount.set(0);
    this.notifications.update(list => list.map(n => ({ ...n, leida: true })));

    return { data: true, error: null, success: true };
  }

  /**
   * Elimina una notificación
   */
  deleteNotification(notificationId: string): Observable<ServiceResponse<boolean>> {
    return from(this.deleteNotificationAsync(notificationId));
  }

  private async deleteNotificationAsync(notificationId: string): Promise<ServiceResponse<boolean>> {
    // Verificar si la notificación no estaba leída
    const notification = this.notifications().find(n => n.id === notificationId);
    const wasUnread = notification && !notification.leida;

    const { error } = await this.supabase.client
      .from('notificaciones')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return { data: null, error: error.message, success: false };
    }

    // Actualizar conteo si no estaba leída
    if (wasUnread) {
      this.unreadCount.update(count => Math.max(0, count - 1));
    }

    // Actualizar lista local
    this.notifications.update(list => list.filter(n => n.id !== notificationId));

    return { data: true, error: null, success: true };
  }

  /**
   * Obtiene las notificaciones no leídas más recientes
   */
  getRecentUnread(limit: number = 5): Observable<ServiceResponse<Notification[]>> {
    return from(this.fetchRecentUnread(limit));
  }

  private async fetchRecentUnread(limit: number): Promise<ServiceResponse<Notification[]>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: [], error: null, success: true };
    }

    const { data, error } = await this.supabase.client
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', userId)
      .eq('leida', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent unread notifications:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Notification[], error: null, success: true };
  }

  // ============================================================================
  // PREFERENCIAS DE NOTIFICACIONES
  // ============================================================================

  /**
   * Obtiene las preferencias de notificaciones del usuario actual
   */
  getPreferencias(): Observable<ServiceResponse<PreferenciaNotificacionConTipo[]>> {
    return from(this.fetchPreferencias());
  }

  private async fetchPreferencias(): Promise<ServiceResponse<PreferenciaNotificacionConTipo[]>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    const { data, error } = await this.supabase.client
      .rpc('get_preferencias_notificaciones', { p_usuario_id: userId });

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as PreferenciaNotificacionConTipo[], error: null, success: true };
  }

  /**
   * Obtiene las preferencias agrupadas por categoría
   */
  getPreferenciasAgrupadas(): Observable<ServiceResponse<PreferenciasPorCategoria[]>> {
    return from(this.fetchPreferenciasAgrupadas());
  }

  private async fetchPreferenciasAgrupadas(): Promise<ServiceResponse<PreferenciasPorCategoria[]>> {
    const result = await this.fetchPreferencias();
    if (!result.success || !result.data) {
      return { data: null, error: result.error, success: false };
    }

    // Agrupar por categoría
    const grouped = result.data.reduce((acc, pref) => {
      const cat = pref.categoria;
      if (!acc[cat]) {
        acc[cat] = {
          categoria: cat,
          categoriaNombre: NOTIFICATION_CATEGORY_NAMES[cat] || cat,
          preferencias: []
        };
      }
      acc[cat].preferencias.push(pref);
      return acc;
    }, {} as Record<NotificationCategory, PreferenciasPorCategoria>);

    // Ordenar categorías
    const order: NotificationCategory[] = ['tickets', 'casos', 'clientes', 'mantenimientos', 'instalaciones', 'sistema'];
    const sorted = order
      .filter(cat => grouped[cat])
      .map(cat => grouped[cat]);

    return { data: sorted, error: null, success: true };
  }

  /**
   * Actualiza una preferencia de notificación
   */
  updatePreferencia(
    tipoCodigo: string,
    recibirPush: boolean,
    recibirEmail: boolean
  ): Observable<ServiceResponse<boolean>> {
    return from(this.updatePreferenciaAsync(tipoCodigo, recibirPush, recibirEmail));
  }

  private async updatePreferenciaAsync(
    tipoCodigo: string,
    recibirPush: boolean,
    recibirEmail: boolean
  ): Promise<ServiceResponse<boolean>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    const { data, error } = await this.supabase.client
      .rpc('set_preferencia_notificacion', {
        p_usuario_id: userId,
        p_tipo_codigo: tipoCodigo,
        p_recibir_push: recibirPush,
        p_recibir_email: recibirEmail
      });

    if (error) {
      console.error('Error updating notification preference:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as boolean, error: null, success: true };
  }

  /**
   * Obtiene los tipos de notificación disponibles
   */
  getTiposNotificacion(): Observable<ServiceResponse<TipoNotificacion[]>> {
    return from(this.fetchTiposNotificacion());
  }

  private async fetchTiposNotificacion(): Promise<ServiceResponse<TipoNotificacion[]>> {
    const { data, error } = await this.supabase.client
      .from('tipos_notificacion')
      .select('*')
      .eq('activo', true)
      .order('categoria')
      .order('nombre');

    if (error) {
      console.error('Error fetching notification types:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TipoNotificacion[], error: null, success: true };
  }
}
