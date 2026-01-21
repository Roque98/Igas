// ============================================================================
// Notification Models
// ============================================================================
// Modelos y tipos para el sistema de notificaciones
// ============================================================================

export type NotificationType =
  | 'ticket_asignado'
  | 'ticket_comentario'
  | 'ticket_estatus'
  | 'ticket_escalado'
  | 'ticket_vencido'
  | 'ticket_proximo_vencer'
  | 'sistema';

export interface Notification {
  id: string;
  usuario_id: string;
  tipo: NotificationType;
  titulo: string;
  mensaje?: string;
  leida: boolean;
  datos: Record<string, any>;
  url?: string;
  created_at: string;
}

export interface NotificationFilters {
  tipo?: NotificationType;
  leida?: boolean;
  desde?: string;
  hasta?: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { icon: string; color: string; label: string }> = {
  'ticket_asignado': {
    icon: 'feather icon-user-plus',
    color: '#007bff',
    label: 'Ticket asignado'
  },
  'ticket_comentario': {
    icon: 'feather icon-message-square',
    color: '#17a2b8',
    label: 'Nuevo comentario'
  },
  'ticket_estatus': {
    icon: 'feather icon-refresh-cw',
    color: '#28a745',
    label: 'Cambio de estatus'
  },
  'ticket_escalado': {
    icon: 'feather icon-trending-up',
    color: '#fd7e14',
    label: 'Ticket escalado'
  },
  'ticket_vencido': {
    icon: 'feather icon-alert-circle',
    color: '#dc3545',
    label: 'SLA vencido'
  },
  'ticket_proximo_vencer': {
    icon: 'feather icon-clock',
    color: '#ffc107',
    label: 'SLA por vencer'
  },
  'sistema': {
    icon: 'feather icon-bell',
    color: '#6c757d',
    label: 'Sistema'
  }
};
