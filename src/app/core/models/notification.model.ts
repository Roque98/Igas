// ============================================================================
// Notification Models
// ============================================================================
// Modelos y tipos para el sistema de notificaciones
// ============================================================================

// Tipos de notificación expandidos
export type NotificationType =
  // Tickets
  | 'ticket_asignado'
  | 'ticket_reasignado'
  | 'ticket_nuevo'
  | 'ticket_comentario'
  | 'ticket_cambio_estatus'
  | 'ticket_sla_amarillo'
  | 'ticket_sla_rojo'
  | 'ticket_estatus'
  | 'ticket_escalado'
  | 'ticket_vencido'
  | 'ticket_proximo_vencer'
  // Casos
  | 'caso_asignado'
  | 'caso_listo_validar'
  | 'caso_regresado'
  | 'caso_cerrado'
  // Clientes
  | 'licencia_por_vencer'
  | 'licencia_vencida'
  | 'poliza_por_vencer'
  | 'poliza_vencida'
  // Mantenimientos
  | 'mantenimiento_programado'
  | 'mantenimiento_recordatorio'
  // Instalaciones
  | 'instalacion_programada'
  | 'instalacion_pendiente'
  // Sistema
  | 'sistema'
  | 'sistema_info'
  | 'sistema_alerta';

// Categorías de notificación
export type NotificationCategory = 'tickets' | 'casos' | 'clientes' | 'sistema' | 'mantenimientos' | 'instalaciones';

// Prioridad de notificación
export type NotificationPriority = 'alta' | 'media' | 'baja';

// ============================================================================
// Interfaces principales
// ============================================================================

export interface Notification {
  id: string;
  usuario_id: string;
  tipo: NotificationType;
  titulo: string;
  mensaje?: string;
  leida: boolean;
  datos: Record<string, any>;
  url?: string;
  url_accion?: string;
  icono?: string;
  color?: string;
  prioridad?: NotificationPriority;
  enviado_email?: boolean;
  fecha_email?: string;
  created_at: string;
}

export interface NotificationFilters {
  tipo?: NotificationType;
  leida?: boolean;
  desde?: string;
  hasta?: string;
  categoria?: NotificationCategory;
  prioridad?: NotificationPriority;
}

// ============================================================================
// Tipos de notificación (catálogo)
// ============================================================================

export interface TipoNotificacion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: NotificationCategory;
  enviar_push: boolean;
  enviar_email: boolean;
  template_email?: string;
  icono?: string;
  color?: string;
  prioridad: NotificationPriority;
  activo: boolean;
  created_at: string;
}

// ============================================================================
// Preferencias de notificaciones
// ============================================================================

export interface PreferenciaNotificacion {
  id?: string;
  usuario_id: string;
  tipo_codigo: string;
  recibir_push: boolean;
  recibir_email: boolean;
  created_at?: string;
  updated_at?: string;
}

// Respuesta de la función get_preferencias_notificaciones
export interface PreferenciaNotificacionConTipo {
  tipo_codigo: string;
  tipo_nombre: string;
  tipo_descripcion?: string;
  categoria: NotificationCategory;
  icono?: string;
  color?: string;
  recibir_push: boolean;
  recibir_email: boolean;
  default_push: boolean;
  default_email: boolean;
}

// Agrupado por categoría para la UI
export interface PreferenciasPorCategoria {
  categoria: NotificationCategory;
  categoriaNombre: string;
  preferencias: PreferenciaNotificacionConTipo[];
}

// ============================================================================
// Recordatorios
// ============================================================================

export type RecordatorioTipo =
  | 'ticket_sin_respuesta'
  | 'ticket_seguimiento'
  | 'caso_sin_movimiento'
  | 'mantenimiento_proximo'
  | 'instalacion_proxima';

export type RecordatorioReferenciaTipo = 'ticket' | 'caso' | 'mantenimiento' | 'instalacion';

export interface Recordatorio {
  id: string;
  tipo: RecordatorioTipo;
  referencia_tipo: RecordatorioReferenciaTipo;
  referencia_id: string;
  usuario_id?: string;
  mensaje: string;
  tiempo_sin_movimiento_horas?: number;
  notificacion_enviada: boolean;
  notificacion_id?: string;
  created_at: string;
}

// ============================================================================
// Configuración de tipos de notificación (frontend)
// ============================================================================

export const NOTIFICATION_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  // Tickets
  'ticket_asignado': { icon: 'user-check', color: '#04a9f5', label: 'Ticket asignado' },
  'ticket_reasignado': { icon: 'swap-horizontal', color: '#f4c22b', label: 'Ticket reasignado' },
  'ticket_nuevo': { icon: 'plus-circle', color: '#1de9b6', label: 'Nuevo ticket' },
  'ticket_comentario': { icon: 'message-square', color: '#a389d4', label: 'Nuevo comentario' },
  'ticket_cambio_estatus': { icon: 'refresh-cw', color: '#3ebfea', label: 'Cambio de estatus' },
  'ticket_sla_amarillo': { icon: 'alert-triangle', color: '#FFC107', label: 'SLA en amarillo' },
  'ticket_sla_rojo': { icon: 'alert-circle', color: '#F44336', label: 'SLA en rojo' },
  'ticket_estatus': { icon: 'refresh-cw', color: '#28a745', label: 'Cambio de estatus' },
  'ticket_escalado': { icon: 'trending-up', color: '#fd7e14', label: 'Ticket escalado' },
  'ticket_vencido': { icon: 'alert-circle', color: '#dc3545', label: 'SLA vencido' },
  'ticket_proximo_vencer': { icon: 'clock', color: '#ffc107', label: 'SLA por vencer' },

  // Casos
  'caso_asignado': { icon: 'briefcase', color: '#04a9f5', label: 'Caso asignado' },
  'caso_listo_validar': { icon: 'check-circle', color: '#00A651', label: 'Caso listo para validar' },
  'caso_regresado': { icon: 'corner-up-left', color: '#f44236', label: 'Caso regresado' },
  'caso_cerrado': { icon: 'x-circle', color: '#6c757d', label: 'Caso cerrado' },

  // Clientes
  'licencia_por_vencer': { icon: 'key', color: '#f4c22b', label: 'Licencia por vencer' },
  'licencia_vencida': { icon: 'key', color: '#f44236', label: 'Licencia vencida' },
  'poliza_por_vencer': { icon: 'shield', color: '#f4c22b', label: 'Póliza por vencer' },
  'poliza_vencida': { icon: 'shield-off', color: '#f44236', label: 'Póliza vencida' },

  // Mantenimientos
  'mantenimiento_programado': { icon: 'tool', color: '#04a9f5', label: 'Mantenimiento programado' },
  'mantenimiento_recordatorio': { icon: 'clock', color: '#f4c22b', label: 'Recordatorio de mantenimiento' },

  // Instalaciones
  'instalacion_programada': { icon: 'download-cloud', color: '#1de9b6', label: 'Instalación programada' },
  'instalacion_pendiente': { icon: 'alert-circle', color: '#FFC107', label: 'Pendiente de instalación' },

  // Sistema
  'sistema': { icon: 'bell', color: '#6c757d', label: 'Sistema' },
  'sistema_info': { icon: 'info', color: '#3ebfea', label: 'Información del sistema' },
  'sistema_alerta': { icon: 'alert-triangle', color: '#f44236', label: 'Alerta del sistema' }
};

// Nombres de categorías para la UI
export const NOTIFICATION_CATEGORY_NAMES: Record<NotificationCategory, string> = {
  'tickets': 'Tickets',
  'casos': 'Casos',
  'clientes': 'Clientes',
  'mantenimientos': 'Mantenimientos',
  'instalaciones': 'Instalaciones',
  'sistema': 'Sistema'
};

// Iconos de categorías
export const NOTIFICATION_CATEGORY_ICONS: Record<NotificationCategory, string> = {
  'tickets': 'file-text',
  'casos': 'trending-up',
  'clientes': 'briefcase',
  'mantenimientos': 'tool',
  'instalaciones': 'download-cloud',
  'sistema': 'settings'
};
