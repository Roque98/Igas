// ============================================================================
// Audit Service
// ============================================================================
// Servicio para gestión de auditoría y logs de sesión
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
  AuditLogDetail,
  SessionLogDetail,
  AuditFilters,
  SessionFilters,
  SessionAction,
  TABLA_NOMBRES,
  ACCION_NOMBRES,
  SESSION_ACCION_NOMBRES
} from '../models';
import { ServiceResponse, PaginatedResponse, PaginationOptions } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // Audit Log Operations
  // ============================================================================

  /**
   * Obtiene logs de auditoría con filtros y paginación
   */
  getAuditLogs(
    filters?: AuditFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<AuditLogDetail>> {
    return from(this.fetchAuditLogs(filters, pagination));
  }

  private async fetchAuditLogs(
    filters?: AuditFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AuditLogDetail>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const sortBy = pagination?.sortBy ?? 'created_at';
    const sortOrder = pagination?.sortOrder ?? 'desc';

    const from_idx = (page - 1) * pageSize;
    const to_idx = from_idx + pageSize - 1;

    let query = this.supabase.client
      .from('v_audit_log_detail')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.tabla) {
        query = query.eq('tabla', filters.tabla);
      }
      if (filters.accion) {
        query = query.eq('accion', filters.accion);
      }
      if (filters.usuario_id) {
        query = query.eq('usuario_id', filters.usuario_id);
      }
      if (filters.registro_id) {
        query = query.eq('registro_id', filters.registro_id);
      }
      if (filters.fecha_desde) {
        query = query.gte('created_at', filters.fecha_desde);
      }
      if (filters.fecha_hasta) {
        query = query.lte('created_at', filters.fecha_hasta + 'T23:59:59');
      }
      if (filters.search) {
        query = query.or(`usuario_nombre.ilike.%${filters.search}%,usuario_email.ilike.%${filters.search}%`);
      }
    }

    // Ordenamiento y paginación
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_idx, to_idx);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    const total = count ?? 0;
    return {
      data: data as AuditLogDetail[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene el historial de cambios de un registro específico
   */
  getRecordHistory(tabla: string, registroId: string): Observable<ServiceResponse<AuditLogDetail[]>> {
    return from(this.fetchRecordHistory(tabla, registroId));
  }

  private async fetchRecordHistory(tabla: string, registroId: string): Promise<ServiceResponse<AuditLogDetail[]>> {
    const { data, error } = await this.supabase.client
      .from('v_audit_log_detail')
      .select('*')
      .eq('tabla', tabla)
      .eq('registro_id', registroId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching record history:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as AuditLogDetail[], error: null, success: true };
  }

  // ============================================================================
  // Session Log Operations
  // ============================================================================

  /**
   * Obtiene logs de sesión con filtros y paginación
   */
  getSessionLogs(
    filters?: SessionFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<SessionLogDetail>> {
    return from(this.fetchSessionLogs(filters, pagination));
  }

  private async fetchSessionLogs(
    filters?: SessionFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<SessionLogDetail>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const sortBy = pagination?.sortBy ?? 'created_at';
    const sortOrder = pagination?.sortOrder ?? 'desc';

    const from_idx = (page - 1) * pageSize;
    const to_idx = from_idx + pageSize - 1;

    let query = this.supabase.client
      .from('v_sesiones_log_detail')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.usuario_id) {
        query = query.eq('usuario_id', filters.usuario_id);
      }
      if (filters.accion) {
        query = query.eq('accion', filters.accion);
      }
      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }
      if (filters.fecha_desde) {
        query = query.gte('created_at', filters.fecha_desde);
      }
      if (filters.fecha_hasta) {
        query = query.lte('created_at', filters.fecha_hasta + 'T23:59:59');
      }
    }

    // Ordenamiento y paginación
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_idx, to_idx);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching session logs:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    const total = count ?? 0;
    return {
      data: data as SessionLogDetail[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene el historial de sesiones de un usuario
   */
  getUserSessionHistory(userId: string): Observable<ServiceResponse<SessionLogDetail[]>> {
    return from(this.fetchUserSessionHistory(userId));
  }

  private async fetchUserSessionHistory(userId: string): Promise<ServiceResponse<SessionLogDetail[]>> {
    const { data, error } = await this.supabase.client
      .from('v_sesiones_log_detail')
      .select('*')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching user session history:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as SessionLogDetail[], error: null, success: true };
  }

  /**
   * Registra un evento de sesión
   */
  logSessionEvent(
    action: SessionAction,
    userId?: string,
    email?: string,
    details?: Record<string, unknown>
  ): Observable<ServiceResponse<string>> {
    return from(this.insertSessionLog(action, userId, email, details));
  }

  private async insertSessionLog(
    action: SessionAction,
    userId?: string,
    email?: string,
    details?: Record<string, unknown>
  ): Promise<ServiceResponse<string>> {
    const { data, error } = await this.supabase.client.rpc('log_session_event', {
      p_usuario_id: userId || null,
      p_email: email || null,
      p_accion: action,
      p_ip_address: null, // Se puede obtener del servidor
      p_user_agent: navigator.userAgent,
      p_detalles: details || null
    });

    if (error) {
      console.error('Error logging session event:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as string, error: null, success: true };
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Obtiene estadísticas de auditoría
   */
  async getAuditStats(): Promise<{
    totalCambios: number;
    cambiosHoy: number;
    porTabla: { tabla: string; count: number }[];
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Total de cambios
    const { count: totalCambios } = await this.supabase.client
      .from('audit_log')
      .select('*', { count: 'exact', head: true });

    // Cambios hoy
    const { count: cambiosHoy } = await this.supabase.client
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Por tabla (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: porTablaData } = await this.supabase.client
      .from('audit_log')
      .select('tabla')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const tablaCount: { [key: string]: number } = {};
    porTablaData?.forEach(item => {
      tablaCount[item.tabla] = (tablaCount[item.tabla] || 0) + 1;
    });

    const porTabla = Object.entries(tablaCount)
      .map(([tabla, count]) => ({ tabla, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCambios: totalCambios ?? 0,
      cambiosHoy: cambiosHoy ?? 0,
      porTabla
    };
  }

  /**
   * Obtiene estadísticas de sesiones
   */
  async getSessionStats(): Promise<{
    loginsHoy: number;
    loginsFallidosHoy: number;
    logoutsHoy: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Logins hoy
    const { count: loginsHoy } = await this.supabase.client
      .from('sesiones_log')
      .select('*', { count: 'exact', head: true })
      .eq('accion', 'login')
      .gte('created_at', today);

    // Logins fallidos hoy
    const { count: loginsFallidosHoy } = await this.supabase.client
      .from('sesiones_log')
      .select('*', { count: 'exact', head: true })
      .eq('accion', 'login_failed')
      .gte('created_at', today);

    // Logouts hoy
    const { count: logoutsHoy } = await this.supabase.client
      .from('sesiones_log')
      .select('*', { count: 'exact', head: true })
      .eq('accion', 'logout')
      .gte('created_at', today);

    return {
      loginsHoy: loginsHoy ?? 0,
      loginsFallidosHoy: loginsFallidosHoy ?? 0,
      logoutsHoy: logoutsHoy ?? 0
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Obtiene el nombre amigable de una tabla
   */
  getTablaNombre(tabla: string): string {
    return TABLA_NOMBRES[tabla] || tabla;
  }

  /**
   * Obtiene el nombre amigable de una acción
   */
  getAccionNombre(accion: string): string {
    return ACCION_NOMBRES[accion as keyof typeof ACCION_NOMBRES] || accion;
  }

  /**
   * Obtiene el nombre amigable de una acción de sesión
   */
  getSessionAccionNombre(accion: string): string {
    return SESSION_ACCION_NOMBRES[accion as keyof typeof SESSION_ACCION_NOMBRES] || accion;
  }

  /**
   * Obtiene las tablas disponibles para filtrar
   */
  getTablasDisponibles(): { value: string; label: string }[] {
    return Object.entries(TABLA_NOMBRES).map(([value, label]) => ({ value, label }));
  }

  /**
   * Calcula los cambios entre datos anteriores y nuevos
   */
  getChangedFields(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): string[] {
    if (!oldData || !newData) return [];

    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach(key => {
      // Ignorar campos de timestamp
      if (['created_at', 'updated_at'].includes(key)) return;

      const oldValue = JSON.stringify(oldData[key]);
      const newValue = JSON.stringify(newData[key]);

      if (oldValue !== newValue) {
        changedFields.push(key);
      }
    });

    return changedFields;
  }
}
