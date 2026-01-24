// ============================================================================
// Ticket Meta Service
// ============================================================================
// Servicio para estadísticas, alertas y catálogos de tickets
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
  TicketStats,
  TicketAlerta,
  CategoriaServicio,
  EstatusTicket,
  CanalContacto,
  ServiceResponse
} from '../models';
import { environment } from '../../../environments/environment';
import { TABLES, VIEWS } from '../constants/tables';

@Injectable({
  providedIn: 'root'
})
export class TicketMetaService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // Estadísticas
  // ============================================================================

  /**
   * Obtiene estadísticas de tickets
   */
  getStats(): Observable<TicketStats> {
    return from(this.fetchStats());
  }

  private async fetchStats(): Promise<TicketStats> {
    try {
      const userId = this.supabase.user?.id;

      // Obtener tickets de la vista
      const { data: tickets } = await this.supabase.client
        .from(VIEWS.V_TICKETS_CON_SLA)
        .select('*');

      if (!tickets || tickets.length === 0) {
        return this.emptyStats();
      }

      const total = tickets.length;
      const abiertos = tickets.filter(t => !t.estatus_es_final && t.estatus_nombre !== 'En Progreso').length;
      const en_progreso = tickets.filter(t => t.estatus_nombre === 'En Progreso').length;
      const resueltos = tickets.filter(t => t.estatus_nombre === 'Resuelto').length;
      const cerrados = tickets.filter(t => t.estatus_es_final).length;
      const sin_asignar = tickets.filter(t => !t.responsable_id && !t.estatus_es_final).length;
      const mis_tickets = tickets.filter(t => t.responsable_id === userId).length;

      const ticketsActivos = tickets.filter(t => !t.estatus_es_final);
      const por_semaforo = {
        verde: ticketsActivos.filter(t => t.semaforo === 'verde').length,
        amarillo: ticketsActivos.filter(t => t.semaforo === 'amarillo').length,
        rojo: ticketsActivos.filter(t => t.semaforo === 'rojo').length
      };

      const por_prioridad = {
        critica: ticketsActivos.filter(t => t.prioridad === 'Crítica').length,
        alta: ticketsActivos.filter(t => t.prioridad === 'Alta').length,
        media: ticketsActivos.filter(t => t.prioridad === 'Media').length,
        baja: ticketsActivos.filter(t => t.prioridad === 'Baja').length
      };

      // Agrupar por categoría
      const categoriasMap = new Map<string, { nombre: string; cantidad: number; color: string }>();
      ticketsActivos.forEach(t => {
        const key = t.categoria_id;
        const existing = categoriasMap.get(key);
        if (existing) {
          existing.cantidad++;
        } else {
          categoriasMap.set(key, {
            nombre: t.categoria_nombre || 'Sin categoría',
            cantidad: 1,
            color: t.categoria_color || '#6c757d'
          });
        }
      });
      const por_categoria = Array.from(categoriasMap.values());

      // Calcular cumplimiento SLA (tickets cerrados a tiempo / total cerrados)
      const ticketsCerrados = tickets.filter(t => t.estatus_es_final);
      const enTiempo = ticketsCerrados.filter(t => (t.porcentaje_sla || 0) <= 100).length;
      const cumplimiento_sla = ticketsCerrados.length > 0
        ? Math.round((enTiempo / ticketsCerrados.length) * 100)
        : 100;

      return {
        total,
        abiertos,
        en_progreso,
        resueltos,
        cerrados,
        sin_asignar,
        mis_tickets,
        por_semaforo,
        por_prioridad,
        por_categoria,
        cumplimiento_sla
      };
    } catch (error) {
      if (!environment.production) { console.error('Error getting ticket stats:', error); }
      return this.emptyStats();
    }
  }

  private emptyStats(): TicketStats {
    return {
      total: 0,
      abiertos: 0,
      en_progreso: 0,
      resueltos: 0,
      cerrados: 0,
      sin_asignar: 0,
      mis_tickets: 0,
      por_semaforo: { verde: 0, amarillo: 0, rojo: 0 },
      por_prioridad: { critica: 0, alta: 0, media: 0, baja: 0 },
      por_categoria: [],
      cumplimiento_sla: 100
    };
  }

  // ============================================================================
  // Alertas
  // ============================================================================

  /**
   * Obtiene tickets en alerta (amarillos y rojos)
   */
  getAlertas(limite: number = 10): Observable<ServiceResponse<TicketAlerta[]>> {
    return from(this.fetchAlertas(limite));
  }

  private async fetchAlertas(limite: number): Promise<ServiceResponse<TicketAlerta[]>> {
    const { data, error } = await this.supabase.client
      .rpc('get_tickets_alertas', { p_limite: limite });

    if (error) {
      if (!environment.production) { console.error('Error fetching ticket alerts:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TicketAlerta[], error: null, success: true };
  }

  /**
   * Obtiene tickets próximos a vencer (para notificaciones)
   */
  getTicketsProximosVencer(minutosPrevios: number = 30): Observable<ServiceResponse<TicketAlerta[]>> {
    return from(this.fetchTicketsProximosVencer(minutosPrevios));
  }

  private async fetchTicketsProximosVencer(minutosPrevios: number): Promise<ServiceResponse<TicketAlerta[]>> {
    const { data, error } = await this.supabase.client
      .from(VIEWS.V_TICKETS_CON_SLA)
      .select('id, folio, titulo, semaforo, porcentaje_sla, tiempo_restante_minutos, cliente_nombre, categoria_nombre, prioridad')
      .in('semaforo', ['amarillo', 'rojo'])
      .eq('estatus_es_final', false)
      .lte('tiempo_restante_minutos', minutosPrevios)
      .order('tiempo_restante_minutos', { ascending: true })
      .limit(20);

    if (error) {
      if (!environment.production) { console.error('Error fetching expiring tickets:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Mapear a TicketAlerta
    const alertas = (data || []).map((t: any) => ({
      ...t,
      minutos_restantes: t.tiempo_restante_minutos
    }));

    return { data: alertas as TicketAlerta[], error: null, success: true };
  }

  // ============================================================================
  // Catálogos
  // ============================================================================

  /**
   * Obtiene todas las categorías de servicio
   */
  getCategorias(): Observable<ServiceResponse<CategoriaServicio[]>> {
    return from(this.fetchCategorias());
  }

  private async fetchCategorias(): Promise<ServiceResponse<CategoriaServicio[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CATEGORIAS_SERVICIO)
      .select('*')
      .eq('estatus', 'Activo')
      .order('orden');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CategoriaServicio[], error: null, success: true };
  }

  /**
   * Obtiene todos los estatus de tickets
   */
  getEstatus(): Observable<ServiceResponse<EstatusTicket[]>> {
    return from(this.fetchEstatus());
  }

  private async fetchEstatus(): Promise<ServiceResponse<EstatusTicket[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.ESTATUS_TICKETS)
      .select('*')
      .order('orden');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as EstatusTicket[], error: null, success: true };
  }

  /**
   * Obtiene todos los canales de contacto
   */
  getCanales(): Observable<ServiceResponse<CanalContacto[]>> {
    return from(this.fetchCanales());
  }

  private async fetchCanales(): Promise<ServiceResponse<CanalContacto[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CANALES_CONTACTO)
      .select('*')
      .eq('activo', true);

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CanalContacto[], error: null, success: true };
  }

  /**
   * Obtiene una categoría por ID
   */
  getCategoriaById(id: string): Observable<ServiceResponse<CategoriaServicio>> {
    return from(this.fetchCategoriaById(id));
  }

  private async fetchCategoriaById(id: string): Promise<ServiceResponse<CategoriaServicio>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CATEGORIAS_SERVICIO)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CategoriaServicio, error: null, success: true };
  }
}
