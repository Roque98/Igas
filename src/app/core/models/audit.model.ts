// ============================================================================
// Audit Models
// ============================================================================
// Modelos para el sistema de auditoría
// ============================================================================

// Tipos de acciones de auditoría
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

// Tipos de eventos de sesión
export type SessionAction = 'login' | 'logout' | 'login_failed' | 'token_refresh' | 'password_reset';

// Registro de auditoría
export interface AuditLog {
  id: string;
  tabla: string;
  accion: AuditAction;
  registro_id: string | null;
  usuario_id: string | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Registro de auditoría con detalles del usuario
export interface AuditLogDetail extends AuditLog {
  usuario_nombre: string | null;
  usuario_email: string | null;
}

// Registro de sesión
export interface SessionLog {
  id: string;
  usuario_id: string | null;
  email: string | null;
  accion: SessionAction;
  ip_address: string | null;
  user_agent: string | null;
  detalles: Record<string, unknown> | null;
  created_at: string;
}

// Registro de sesión con detalles
export interface SessionLogDetail extends SessionLog {
  usuario_nombre: string | null;
}

// Filtros para consulta de auditoría
export interface AuditFilters {
  tabla?: string;
  accion?: AuditAction;
  usuario_id?: string;
  registro_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

// Filtros para consulta de sesiones
export interface SessionFilters {
  usuario_id?: string;
  accion?: SessionAction;
  email?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

// Estadísticas de auditoría
export interface AuditStats {
  total_cambios: number;
  cambios_hoy: number;
  por_tabla: { tabla: string; count: number }[];
  por_accion: { accion: AuditAction; count: number }[];
  usuarios_mas_activos: { usuario_id: string; nombre: string; count: number }[];
}

// Estadísticas de sesiones
export interface SessionStats {
  total_sesiones: number;
  logins_hoy: number;
  logins_fallidos_hoy: number;
  usuarios_activos: number;
}

// Nombres amigables para las tablas
export const TABLA_NOMBRES: { [key: string]: string } = {
  profiles: 'Usuarios',
  roles: 'Roles',
  equipos: 'Equipos',
  horarios: 'Horarios',
  tickets: 'Tickets',
  clientes: 'Clientes',
  sucursales: 'Sucursales',
  categorias_servicio: 'Categorías',
  estatus_tickets: 'Estatus'
};

// Nombres amigables para las acciones
export const ACCION_NOMBRES: { [key in AuditAction]: string } = {
  INSERT: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación'
};

// Nombres amigables para eventos de sesión
export const SESSION_ACCION_NOMBRES: { [key in SessionAction]: string } = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  login_failed: 'Intento fallido',
  token_refresh: 'Renovación de token',
  password_reset: 'Cambio de contraseña'
};

// Colores para badges de acciones
export const ACCION_COLORES: { [key in AuditAction]: string } = {
  INSERT: 'success',
  UPDATE: 'warning',
  DELETE: 'danger'
};

export const SESSION_ACCION_COLORES: { [key in SessionAction]: string } = {
  login: 'success',
  logout: 'secondary',
  login_failed: 'danger',
  token_refresh: 'info',
  password_reset: 'warning'
};
