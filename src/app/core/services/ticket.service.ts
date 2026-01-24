// ============================================================================
// Ticket Service
// ============================================================================
// Servicio principal para gestión de tickets con SLA
// Responsabilidad: CRUD y acciones sobre tickets
//
// Servicios relacionados:
// - TicketFilesService: Bitácora y adjuntos
// - TicketMetaService: Estadísticas, alertas y catálogos
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { TicketFilesService } from './ticket-files.service';
import { TicketMetaService } from './ticket-meta.service';
import {
  Ticket,
  TicketConSLA,
  TicketFilters,
  CreateTicketDTO,
  UpdateTicketDTO,
  CambiarEstatusDTO,
  AsignarTicketDTO,
  AgregarNotaDTO,
  TicketBitacora,
  TicketAdjunto,
  TicketStats,
  TicketAlerta,
  CategoriaServicio,
  EstatusTicket,
  CanalContacto,
  PaginationOptions,
  PaginatedResponse,
  ServiceResponse
} from '../models';
import { environment } from '../../../environments/environment';
import { TABLES, VIEWS } from '../constants/tables';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private supabase = inject(SupabaseService);
  private filesService = inject(TicketFilesService);
  private metaService = inject(TicketMetaService);

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Obtiene lista de tickets con filtros y paginación
   */
  getTickets(
    filters?: TicketFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<TicketConSLA>> {
    return from(this.fetchTickets(filters, pagination));
  }

  private async fetchTickets(
    filters?: TicketFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<TicketConSLA>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'fecha_creacion';
    const sortOrder = pagination?.sortOrder ?? 'desc';

    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    // Usar la vista con SLA calculado
    let query = this.supabase.client
      .from(VIEWS.V_TICKETS_CON_SLA)
      .select('*', { count: 'exact' });

    // Aplicar filtros
    query = this.applyFilters(query, filters);

    // Ordenamiento y paginación
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      if (!environment.production) { console.error('Error fetching tickets:', error); }
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const total = count ?? 0;
    return {
      data: data as TicketConSLA[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Aplica filtros a la query de tickets
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFilters(query: any, filters?: TicketFilters): any {
    if (!filters) return query;

    if (filters.search) {
      query = query.or(`folio.ilike.%${filters.search}%,titulo.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }
    if (filters.folio) {
      query = query.eq('folio', filters.folio);
    }
    if (filters.cliente_id) {
      query = query.eq('cliente_id', filters.cliente_id);
    }
    if (filters.categoria_id) {
      query = query.eq('categoria_id', filters.categoria_id);
    }
    if (filters.prioridad) {
      query = query.eq('prioridad', filters.prioridad);
    }
    if (filters.estatus_id) {
      query = query.eq('estatus_id', filters.estatus_id);
    }
    if (filters.estatus_ids && filters.estatus_ids.length > 0) {
      query = query.in('estatus_id', filters.estatus_ids);
    }
    if (filters.responsable_id) {
      query = query.eq('responsable_id', filters.responsable_id);
    }
    if (filters.equipo_id) {
      query = query.eq('equipo_id', filters.equipo_id);
    }
    if (filters.semaforo) {
      query = query.eq('semaforo', filters.semaforo);
    }
    if (filters.canal) {
      query = query.eq('canal', filters.canal);
    }
    if (filters.fecha_desde) {
      query = query.gte('fecha_creacion', filters.fecha_desde);
    }
    if (filters.fecha_hasta) {
      query = query.lte('fecha_creacion', filters.fecha_hasta);
    }
    if (filters.solo_mis_tickets) {
      const userId = this.supabase.user?.id;
      if (userId) {
        query = query.or(`responsable_id.eq.${userId},creado_por.eq.${userId}`);
      }
    }
    if (filters.solo_sin_asignar) {
      query = query.is('responsable_id', null);
    }

    return query;
  }

  /**
   * Obtiene un ticket por ID con datos completos
   */
  getTicketById(id: string): Observable<ServiceResponse<TicketConSLA>> {
    return from(this.fetchTicketById(id));
  }

  private async fetchTicketById(id: string): Promise<ServiceResponse<TicketConSLA>> {
    const { data, error } = await this.supabase.client
      .from(VIEWS.V_TICKETS_CON_SLA)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (!environment.production) { console.error('Error fetching ticket:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TicketConSLA, error: null, success: true };
  }

  /**
   * Obtiene un ticket por folio
   */
  getTicketByFolio(folio: string): Observable<ServiceResponse<TicketConSLA>> {
    return from(this.fetchTicketByFolio(folio));
  }

  private async fetchTicketByFolio(folio: string): Promise<ServiceResponse<TicketConSLA>> {
    const { data, error } = await this.supabase.client
      .from(VIEWS.V_TICKETS_CON_SLA)
      .select('*')
      .eq('folio', folio)
      .single();

    if (error) {
      if (!environment.production) { console.error('Error fetching ticket by folio:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TicketConSLA, error: null, success: true };
  }

  /**
   * Crea un nuevo ticket
   */
  createTicket(ticketData: CreateTicketDTO): Observable<ServiceResponse<Ticket>> {
    return from(this.createTicketAsync(ticketData));
  }

  private async createTicketAsync(ticketData: CreateTicketDTO): Promise<ServiceResponse<Ticket>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    // Si no se proporciona SLA, obtenerlo de la categoría
    let slaMinutos = ticketData.sla_objetivo_minutos;
    if (!slaMinutos && ticketData.categoria_id) {
      const { data: categoria } = await this.supabase.client
        .from(TABLES.CATEGORIAS_SERVICIO)
        .select('sla_minutos')
        .eq('id', ticketData.categoria_id)
        .single();
      slaMinutos = categoria?.sla_minutos || 240;
    }

    // Obtener estatus "Nuevo" por defecto
    const { data: estatusNuevo } = await this.supabase.client
      .from(TABLES.ESTATUS_TICKETS)
      .select('id')
      .eq('nombre', 'Nuevo')
      .single();

    if (!estatusNuevo) {
      return { data: null, error: 'No se encontró el estatus inicial', success: false };
    }

    const { data, error } = await this.supabase.client
      .from(TABLES.TICKETS)
      .insert({
        ...ticketData,
        sla_objetivo_minutos: slaMinutos || 240,
        estatus_id: estatusNuevo.id,
        creado_por: userId
      })
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error creating ticket:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.filesService.registrarEnBitacora(
      data.id,
      'nota',
      'Ticket creado',
      { accion: 'creacion' }
    );

    return { data: data as Ticket, error: null, success: true };
  }

  /**
   * Actualiza un ticket
   */
  updateTicket(id: string, data: UpdateTicketDTO): Observable<ServiceResponse<Ticket>> {
    return from(this.updateTicketAsync(id, data));
  }

  private async updateTicketAsync(id: string, ticketData: UpdateTicketDTO): Promise<ServiceResponse<Ticket>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.TICKETS)
      .update({
        ...ticketData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error updating ticket:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Ticket, error: null, success: true };
  }

  // ============================================================================
  // Acciones sobre Tickets
  // ============================================================================

  /**
   * Cambia el estatus de un ticket
   */
  cambiarEstatus(ticketId: string, dto: CambiarEstatusDTO): Observable<ServiceResponse<Ticket>> {
    return from(this.cambiarEstatusAsync(ticketId, dto));
  }

  private async cambiarEstatusAsync(ticketId: string, dto: CambiarEstatusDTO): Promise<ServiceResponse<Ticket>> {
    // Actualizar ticket
    const { data, error } = await this.supabase.client
      .from(TABLES.TICKETS)
      .update({
        estatus_id: dto.estatus_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error changing ticket status:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Si hay nota, agregarla
    if (dto.nota) {
      await this.filesService.registrarEnBitacora(ticketId, 'cambio_estatus', dto.nota);
    }

    return { data: data as Ticket, error: null, success: true };
  }

  /**
   * Asigna un ticket a un usuario
   */
  asignarTicket(ticketId: string, dto: AsignarTicketDTO): Observable<ServiceResponse<Ticket>> {
    return from(this.asignarTicketAsync(ticketId, dto));
  }

  private async asignarTicketAsync(ticketId: string, dto: AsignarTicketDTO): Promise<ServiceResponse<Ticket>> {
    // Obtener ticket actual para historial
    const { data: ticketActual } = await this.supabase.client
      .from(TABLES.TICKETS)
      .select('responsable_id')
      .eq('id', ticketId)
      .single();

    // Actualizar ticket
    const { data, error } = await this.supabase.client
      .from(TABLES.TICKETS)
      .update({
        responsable_id: dto.usuario_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error assigning ticket:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Registrar en historial de asignaciones
    await this.supabase.client
      .from(TABLES.TICKET_HISTORIAL_ASIGNACIONES)
      .insert({
        ticket_id: ticketId,
        de_usuario_id: ticketActual?.responsable_id || null,
        a_usuario_id: dto.usuario_id,
        motivo: dto.motivo
      });

    // Registrar en bitácora
    await this.filesService.registrarEnBitacora(
      ticketId,
      'asignacion',
      dto.motivo || 'Ticket asignado',
      {
        de_usuario_id: ticketActual?.responsable_id,
        a_usuario_id: dto.usuario_id
      }
    );

    return { data: data as Ticket, error: null, success: true };
  }

  // ============================================================================
  // Delegación a TicketFilesService (compatibilidad hacia atrás)
  // ============================================================================

  /**
   * Agrega una nota al ticket
   * @deprecated Usar TicketFilesService.agregarNota
   */
  agregarNota(ticketId: string, dto: AgregarNotaDTO): Observable<ServiceResponse<TicketBitacora>> {
    return this.filesService.agregarNota(ticketId, dto);
  }

  /**
   * Obtiene la bitácora de un ticket
   * @deprecated Usar TicketFilesService.getBitacora
   */
  getTicketBitacora(ticketId: string): Observable<ServiceResponse<TicketBitacora[]>> {
    return this.filesService.getBitacora(ticketId);
  }

  /**
   * Obtiene los adjuntos de un ticket
   * @deprecated Usar TicketFilesService.getAdjuntos
   */
  getTicketAdjuntos(ticketId: string): Observable<ServiceResponse<TicketAdjunto[]>> {
    return this.filesService.getAdjuntos(ticketId);
  }

  /**
   * Sube un adjunto a un ticket
   * @deprecated Usar TicketFilesService.subirAdjunto
   */
  subirAdjunto(ticketId: string, file: File): Observable<ServiceResponse<TicketAdjunto>> {
    return this.filesService.subirAdjunto(ticketId, file);
  }

  // ============================================================================
  // Delegación a TicketMetaService (compatibilidad hacia atrás)
  // ============================================================================

  /**
   * Obtiene estadísticas de tickets
   * @deprecated Usar TicketMetaService.getStats
   */
  async getTicketStats(): Promise<TicketStats> {
    return this.metaService.getStats().toPromise() as Promise<TicketStats>;
  }

  /**
   * Obtiene tickets en alerta
   * @deprecated Usar TicketMetaService.getAlertas
   */
  getTicketsAlertas(limite: number = 10): Observable<ServiceResponse<TicketAlerta[]>> {
    return this.metaService.getAlertas(limite);
  }

  /**
   * Obtiene categorías de servicio
   * @deprecated Usar TicketMetaService.getCategorias
   */
  getCategorias(): Observable<ServiceResponse<CategoriaServicio[]>> {
    return this.metaService.getCategorias();
  }

  /**
   * Obtiene estatus de tickets
   * @deprecated Usar TicketMetaService.getEstatus
   */
  getEstatus(): Observable<ServiceResponse<EstatusTicket[]>> {
    return this.metaService.getEstatus();
  }

  /**
   * Obtiene canales de contacto
   * @deprecated Usar TicketMetaService.getCanales
   */
  getCanales(): Observable<ServiceResponse<CanalContacto[]>> {
    return this.metaService.getCanales();
  }
}
