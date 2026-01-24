// ============================================================================
// Supabase Tables Constants
// ============================================================================
// Nombres de tablas y vistas centralizados para evitar strings hardcodeados
// Facilita refactoring y previene errores de typo
// ============================================================================

// ============================================================================
// TABLAS PRINCIPALES
// ============================================================================

export const TABLES = {
  // Usuarios y Autenticación
  PROFILES: 'profiles',
  ROLES: 'roles',
  EQUIPOS: 'equipos',
  HORARIOS: 'horarios',
  AVATARS: 'avatars',
  BLOCKED_USERS: 'blocked_users',

  // Tickets
  TICKETS: 'tickets',
  TICKET_BITACORA: 'ticket_bitacora',
  TICKET_ADJUNTOS: 'ticket_adjuntos',
  TICKET_HISTORIAL_ASIGNACIONES: 'ticket_historial_asignaciones',
  ESTATUS_TICKETS: 'estatus_tickets',

  // Casos (Escalamientos)
  CASOS: 'casos',
  CASO_BITACORA: 'caso_bitacora',
  CASO_ADJUNTOS: 'caso_adjuntos',
  CASO_HISTORIAL_ASIGNACIONES: 'caso_historial_asignaciones',
  ESTATUS_CASOS: 'estatus_casos',
  AREAS_DESTINO: 'areas_destino',

  // Clientes
  CLIENTES: 'clientes',
  SUCURSALES: 'sucursales',
  CONTACTOS_CLIENTE: 'contactos_cliente',
  DATOS_FISCALES: 'datos_fiscales',

  // Licencias y Pólizas
  LICENCIAS_HASP: 'licencias_hasp',
  LICENCIAS_RENOVACIONES: 'licencias_renovaciones',
  POLIZAS_SOPORTE: 'polizas_soporte',
  ALERTAS_VENCIMIENTO: 'alertas_vencimiento',

  // Instalaciones
  INSTALACIONES: 'instalaciones',
  INSTALACION_CHECKLIST: 'instalacion_checklist',
  INSTALACION_EVIDENCIAS: 'instalacion_evidencias',
  INSTALACION_PENDIENTES: 'instalacion_pendientes',
  INSTALACION_MODULOS: 'instalacion_modulos',
  ESTATUS_INSTALACIONES: 'estatus_instalaciones',

  // Mantenimientos
  MANTENIMIENTOS: 'mantenimientos',
  MANTENIMIENTO_CHECKLIST: 'mantenimiento_checklist',
  MANTENIMIENTO_EVIDENCIAS: 'mantenimiento_evidencias',
  ESTATUS_MANTENIMIENTOS: 'estatus_mantenimientos',
  TIPOS_MANTENIMIENTO: 'tipos_mantenimiento',

  // Catálogos
  CATEGORIAS_SERVICIO: 'categorias_servicio',
  CANALES_CONTACTO: 'canales_contacto',
  MODULOS_SISTEMA: 'modulos_sistema',
  CHECKLIST_TEMPLATES: 'checklist_templates',
  CHECKLIST_ITEMS_TEMPLATE: 'checklist_items_template',
  CAT_USO_CFDI: 'cat_uso_cfdi',
  CAT_REGIMEN_FISCAL: 'cat_regimen_fiscal',

  // Notificaciones
  NOTIFICACIONES: 'notificaciones',
  TIPOS_NOTIFICACION: 'tipos_notificacion',

  // Auditoría
  AUDIT_LOG: 'audit_log',
  SESIONES_LOG: 'sesiones_log'
} as const;

// ============================================================================
// VISTAS (Views)
// ============================================================================

export const VIEWS = {
  // Tickets
  V_TICKETS_CON_SLA: 'v_tickets_con_sla',
  V_REPORTE_TICKETS: 'v_reporte_tickets',

  // Casos
  V_CASOS_CON_SLA: 'v_casos_con_sla',
  V_REPORTE_CASOS: 'v_reporte_casos',

  // Clientes
  V_CLIENTES_RESUMEN: 'v_clientes_resumen',
  V_LICENCIAS_ESTADO: 'v_licencias_estado',
  V_POLIZAS_ESTADO: 'v_polizas_estado',

  // Instalaciones y Mantenimientos
  V_INSTALACIONES_COMPLETO: 'v_instalaciones_completo',
  V_MANTENIMIENTOS_COMPLETO: 'v_mantenimientos_completo',

  // Auditoría
  V_AUDIT_LOG_DETAIL: 'v_audit_log_detail',
  V_SESIONES_LOG_DETAIL: 'v_sesiones_log_detail'
} as const;

// ============================================================================
// STORAGE BUCKETS
// ============================================================================

export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  TICKET_ATTACHMENTS: 'ticket-attachments',
  CASO_ATTACHMENTS: 'caso-attachments',
  INSTALACION_EVIDENCIAS: 'instalacion-evidencias',
  MANTENIMIENTO_EVIDENCIAS: 'mantenimiento-evidencias',
  FIRMAS_CLIENTES: 'firmas-clientes'
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TableName = typeof TABLES[keyof typeof TABLES];
export type ViewName = typeof VIEWS[keyof typeof VIEWS];
export type StorageBucketName = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];
