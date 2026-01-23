// ============================================================================
// Reporte Service
// ============================================================================
// Servicio para generación de reportes y estadísticas
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
  ServiceResponse,
  PaginatedResponse,
  PaginationOptions,
  ReporteTicketsFilters,
  ReporteCasosFilters,
  ReporteProductividadFilters,
  TicketResumen,
  CasoResumen,
  TicketTendenciaMensual,
  CasoTendenciaMensual,
  ProductividadUsuario,
  TicketReporteDetalle,
  CasoReporteDetalle
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // REPORTES DE TICKETS
  // ============================================================================

  /**
   * Obtiene el resumen agregado de tickets
   */
  getTicketsResumen(filters?: ReporteTicketsFilters): Observable<ServiceResponse<TicketResumen>> {
    return from(this.fetchTicketsResumen(filters));
  }

  private async fetchTicketsResumen(filters?: ReporteTicketsFilters): Promise<ServiceResponse<TicketResumen>> {
    try {
      const { data, error } = await this.supabase.client.rpc('get_reporte_tickets_resumen', {
        p_fecha_inicio: filters?.fecha_inicio || null,
        p_fecha_fin: filters?.fecha_fin || null,
        p_cliente_id: filters?.cliente_id || null,
        p_categoria_id: filters?.categoria_id || null,
        p_responsable_id: filters?.responsable_id || null
      });

      if (error) {
        console.error('Error fetching tickets resumen:', error);
        return { data: null, error: error.message, success: false };
      }

      return { data: data as TicketResumen, error: null, success: true };
    } catch (err: any) {
      console.error('Error in fetchTicketsResumen:', err);
      return { data: null, error: err.message, success: false };
    }
  }

  /**
   * Obtiene la tendencia mensual de tickets
   */
  getTicketsTendenciaMensual(
    meses: number = 12,
    clienteId?: string
  ): Observable<ServiceResponse<TicketTendenciaMensual[]>> {
    return from(this.fetchTicketsTendencia(meses, clienteId));
  }

  private async fetchTicketsTendencia(
    meses: number,
    clienteId?: string
  ): Promise<ServiceResponse<TicketTendenciaMensual[]>> {
    try {
      const { data, error } = await this.supabase.client.rpc('get_tickets_tendencia_mensual', {
        p_meses: meses,
        p_cliente_id: clienteId || null
      });

      if (error) {
        console.error('Error fetching tickets tendencia:', error);
        return { data: null, error: error.message, success: false };
      }

      return { data: (data || []) as TicketTendenciaMensual[], error: null, success: true };
    } catch (err: any) {
      console.error('Error in fetchTicketsTendencia:', err);
      return { data: null, error: err.message, success: false };
    }
  }

  /**
   * Obtiene el detalle de tickets para tabla
   */
  getTicketsDetalle(
    filters?: ReporteTicketsFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<TicketReporteDetalle>> {
    return from(this.fetchTicketsDetalle(filters, pagination));
  }

  private async fetchTicketsDetalle(
    filters?: ReporteTicketsFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<TicketReporteDetalle>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    let query = this.supabase.client
      .from('v_reporte_tickets')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.fecha_inicio) {
        query = query.gte('fecha_dia', filters.fecha_inicio);
      }
      if (filters.fecha_fin) {
        query = query.lte('fecha_dia', filters.fecha_fin);
      }
      if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }
      if (filters.categoria_id) {
        query = query.eq('categoria_id', filters.categoria_id);
      }
      if (filters.responsable_id) {
        query = query.eq('responsable_id', filters.responsable_id);
      }
      if (filters.prioridad) {
        query = query.eq('prioridad', filters.prioridad);
      }
      if (filters.estatus_id) {
        query = query.eq('estatus_id', filters.estatus_id);
      }
    }

    query = query
      .order('fecha_creacion', { ascending: false })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tickets detalle:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const total = count ?? 0;
    return {
      data: data as TicketReporteDetalle[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  // ============================================================================
  // REPORTES DE CASOS
  // ============================================================================

  /**
   * Obtiene el resumen agregado de casos
   */
  getCasosResumen(filters?: ReporteCasosFilters): Observable<ServiceResponse<CasoResumen>> {
    return from(this.fetchCasosResumen(filters));
  }

  private async fetchCasosResumen(filters?: ReporteCasosFilters): Promise<ServiceResponse<CasoResumen>> {
    try {
      const { data, error } = await this.supabase.client.rpc('get_reporte_casos_resumen', {
        p_fecha_inicio: filters?.fecha_inicio || null,
        p_fecha_fin: filters?.fecha_fin || null,
        p_cliente_id: filters?.cliente_id || null,
        p_area_destino: filters?.area_destino || null,
        p_responsable_id: filters?.responsable_id || null
      });

      if (error) {
        console.error('Error fetching casos resumen:', error);
        return { data: null, error: error.message, success: false };
      }

      return { data: data as CasoResumen, error: null, success: true };
    } catch (err: any) {
      console.error('Error in fetchCasosResumen:', err);
      return { data: null, error: err.message, success: false };
    }
  }

  /**
   * Obtiene la tendencia mensual de casos
   */
  getCasosTendenciaMensual(
    meses: number = 12,
    clienteId?: string
  ): Observable<ServiceResponse<CasoTendenciaMensual[]>> {
    return from(this.fetchCasosTendencia(meses, clienteId));
  }

  private async fetchCasosTendencia(
    meses: number,
    clienteId?: string
  ): Promise<ServiceResponse<CasoTendenciaMensual[]>> {
    try {
      const { data, error } = await this.supabase.client.rpc('get_casos_tendencia_mensual', {
        p_meses: meses,
        p_cliente_id: clienteId || null
      });

      if (error) {
        console.error('Error fetching casos tendencia:', error);
        return { data: null, error: error.message, success: false };
      }

      return { data: (data || []) as CasoTendenciaMensual[], error: null, success: true };
    } catch (err: any) {
      console.error('Error in fetchCasosTendencia:', err);
      return { data: null, error: err.message, success: false };
    }
  }

  /**
   * Obtiene el detalle de casos para tabla
   */
  getCasosDetalle(
    filters?: ReporteCasosFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<CasoReporteDetalle>> {
    return from(this.fetchCasosDetalle(filters, pagination));
  }

  private async fetchCasosDetalle(
    filters?: ReporteCasosFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<CasoReporteDetalle>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    let query = this.supabase.client
      .from('v_reporte_casos')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.fecha_inicio) {
        query = query.gte('fecha_dia', filters.fecha_inicio);
      }
      if (filters.fecha_fin) {
        query = query.lte('fecha_dia', filters.fecha_fin);
      }
      if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }
      if (filters.area_destino) {
        query = query.eq('area_destino', filters.area_destino);
      }
      if (filters.responsable_id) {
        query = query.eq('responsable_id', filters.responsable_id);
      }
      if (filters.motivo) {
        query = query.eq('motivo', filters.motivo);
      }
      if (filters.estatus_id) {
        query = query.eq('estatus_id', filters.estatus_id);
      }
    }

    query = query
      .order('fecha_creacion', { ascending: false })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching casos detalle:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const total = count ?? 0;
    return {
      data: data as CasoReporteDetalle[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  // ============================================================================
  // PRODUCTIVIDAD
  // ============================================================================

  /**
   * Obtiene métricas de productividad por usuario
   */
  getProductividadUsuarios(
    filters?: ReporteProductividadFilters
  ): Observable<ServiceResponse<ProductividadUsuario[]>> {
    return from(this.fetchProductividad(filters));
  }

  private async fetchProductividad(
    filters?: ReporteProductividadFilters
  ): Promise<ServiceResponse<ProductividadUsuario[]>> {
    try {
      const { data, error } = await this.supabase.client.rpc('get_productividad_usuarios', {
        p_fecha_inicio: filters?.fecha_inicio || null,
        p_fecha_fin: filters?.fecha_fin || null
      });

      if (error) {
        console.error('Error fetching productividad:', error);
        return { data: null, error: error.message, success: false };
      }

      return { data: (data || []) as ProductividadUsuario[], error: null, success: true };
    } catch (err: any) {
      console.error('Error in fetchProductividad:', err);
      return { data: null, error: err.message, success: false };
    }
  }

  // ============================================================================
  // DASHBOARD RESUMEN RÁPIDO
  // ============================================================================

  /**
   * Obtiene estadísticas rápidas para el dashboard
   * Usa las vistas v_tickets_con_sla y v_casos_con_sla que ya incluyen los campos necesarios
   */
  async getDashboardStats(): Promise<{
    ticketsHoy: number;
    ticketsAbiertos: number;
    ticketsEnRojo: number;
    casosAbiertos: number;
    casosVencidos: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Tickets hoy
    const { count: ticketsHoy } = await this.supabase.client
      .from('v_tickets_con_sla')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_creacion', today);

    // Tickets abiertos (usando la vista que ya tiene estatus_es_final)
    const { count: ticketsAbiertos } = await this.supabase.client
      .from('v_tickets_con_sla')
      .select('*', { count: 'exact', head: true })
      .eq('estatus_es_final', false);

    // Tickets en rojo (usando la vista que ya tiene semaforo calculado)
    const { count: ticketsEnRojo } = await this.supabase.client
      .from('v_tickets_con_sla')
      .select('*', { count: 'exact', head: true })
      .eq('semaforo', 'rojo')
      .eq('estatus_es_final', false);

    // Casos abiertos (usando la vista v_casos_con_sla)
    const { count: casosAbiertos } = await this.supabase.client
      .from('v_casos_con_sla')
      .select('*', { count: 'exact', head: true })
      .eq('estatus_es_final', false);

    // Casos vencidos (usando la vista que ya tiene compromiso_vencido)
    const { count: casosVencidos } = await this.supabase.client
      .from('v_casos_con_sla')
      .select('*', { count: 'exact', head: true })
      .eq('compromiso_vencido', true);

    return {
      ticketsHoy: ticketsHoy ?? 0,
      ticketsAbiertos: ticketsAbiertos ?? 0,
      ticketsEnRojo: ticketsEnRojo ?? 0,
      casosAbiertos: casosAbiertos ?? 0,
      casosVencidos: casosVencidos ?? 0
    };
  }
}
