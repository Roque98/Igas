// ============================================================================
// Ticket Service
// ============================================================================
// Servicio para gestión de tickets de soporte con SLA
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
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

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private supabase = inject(SupabaseService);

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
      .from('v_tickets_con_sla')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
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
    }

    // Ordenamiento y paginación
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tickets:', error);
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
      data: data as TicketConSLA[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene un ticket por ID con datos completos
   */
  getTicketById(id: string): Observable<ServiceResponse<TicketConSLA>> {
    return from(this.fetchTicketById(id));
  }

  private async fetchTicketById(id: string): Promise<ServiceResponse<TicketConSLA>> {
    const { data, error } = await this.supabase.client
      .from('v_tickets_con_sla')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
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
      .from('v_tickets_con_sla')
      .select('*')
      .eq('folio', folio)
      .single();

    if (error) {
      console.error('Error fetching ticket by folio:', error);
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
        .from('categorias_servicio')
        .select('sla_minutos')
        .eq('id', ticketData.categoria_id)
        .single();
      slaMinutos = categoria?.sla_minutos || 240;
    }

    // Obtener estatus "Nuevo" por defecto
    const { data: estatusNuevo } = await this.supabase.client
      .from('estatus_tickets')
      .select('id')
      .eq('nombre', 'Nuevo')
      .single();

    if (!estatusNuevo) {
      return { data: null, error: 'No se encontró el estatus inicial', success: false };
    }

    const { data, error } = await this.supabase.client
      .from('tickets')
      .insert({
        ...ticketData,
        sla_objetivo_minutos: slaMinutos || 240,
        estatus_id: estatusNuevo.id,
        creado_por: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.supabase.client
      .from('ticket_bitacora')
      .insert({
        ticket_id: data.id,
        usuario_id: userId,
        tipo: 'nota',
        mensaje: 'Ticket creado',
        datos_adicionales: { accion: 'creacion' }
      });

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
      .from('tickets')
      .update({
        ...ticketData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
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
    const userId = this.supabase.user?.id;

    // Actualizar ticket
    const { data, error } = await this.supabase.client
      .from('tickets')
      .update({
        estatus_id: dto.estatus_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error changing ticket status:', error);
      return { data: null, error: error.message, success: false };
    }

    // Si hay nota, agregarla
    if (dto.nota) {
      await this.supabase.client
        .from('ticket_bitacora')
        .insert({
          ticket_id: ticketId,
          usuario_id: userId,
          tipo: 'nota',
          mensaje: dto.nota
        });
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
    const userId = this.supabase.user?.id;

    // Obtener ticket actual para historial
    const { data: ticketActual } = await this.supabase.client
      .from('tickets')
      .select('responsable_id')
      .eq('id', ticketId)
      .single();

    // Actualizar ticket
    const { data, error } = await this.supabase.client
      .from('tickets')
      .update({
        responsable_id: dto.usuario_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error assigning ticket:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en historial de asignaciones
    await this.supabase.client
      .from('ticket_historial_asignaciones')
      .insert({
        ticket_id: ticketId,
        de_usuario_id: ticketActual?.responsable_id || null,
        a_usuario_id: dto.usuario_id,
        motivo: dto.motivo
      });

    // Registrar en bitácora
    await this.supabase.client
      .from('ticket_bitacora')
      .insert({
        ticket_id: ticketId,
        usuario_id: userId,
        tipo: 'asignacion',
        mensaje: dto.motivo || 'Ticket asignado',
        datos_adicionales: {
          de_usuario_id: ticketActual?.responsable_id,
          a_usuario_id: dto.usuario_id
        }
      });

    return { data: data as Ticket, error: null, success: true };
  }

  /**
   * Agrega una nota al ticket
   */
  agregarNota(ticketId: string, dto: AgregarNotaDTO): Observable<ServiceResponse<TicketBitacora>> {
    return from(this.agregarNotaAsync(ticketId, dto));
  }

  private async agregarNotaAsync(ticketId: string, dto: AgregarNotaDTO): Promise<ServiceResponse<TicketBitacora>> {
    const userId = this.supabase.user?.id;

    const { data, error } = await this.supabase.client
      .from('ticket_bitacora')
      .insert({
        ticket_id: ticketId,
        usuario_id: userId,
        tipo: 'nota',
        mensaje: dto.mensaje,
        es_publico: dto.es_publico ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TicketBitacora, error: null, success: true };
  }

  // ============================================================================
  // Bitácora y Adjuntos
  // ============================================================================

  /**
   * Obtiene la bitácora de un ticket
   */
  getTicketBitacora(ticketId: string): Observable<ServiceResponse<TicketBitacora[]>> {
    return from(this.fetchTicketBitacora(ticketId));
  }

  private async fetchTicketBitacora(ticketId: string): Promise<ServiceResponse<TicketBitacora[]>> {
    const { data, error } = await this.supabase.client
      .from('ticket_bitacora')
      .select(`
        *,
        usuario:profiles(nombre_completo, avatar_url)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ticket timeline:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TicketBitacora[], error: null, success: true };
  }

  /**
   * Obtiene los adjuntos de un ticket
   */
  getTicketAdjuntos(ticketId: string): Observable<ServiceResponse<TicketAdjunto[]>> {
    return from(this.fetchTicketAdjuntos(ticketId));
  }

  private async fetchTicketAdjuntos(ticketId: string): Promise<ServiceResponse<TicketAdjunto[]>> {
    const { data, error } = await this.supabase.client
      .from('ticket_adjuntos')
      .select(`
        *,
        usuario:profiles(nombre_completo)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      return { data: null, error: error.message, success: false };
    }

    // Generar URLs firmadas para cada adjunto
    const adjuntosConUrl = await Promise.all(
      (data as TicketAdjunto[]).map(async (adj) => {
        const { data: urlData } = await this.supabase.client.storage
          .from('ticket-attachments')
          .createSignedUrl(adj.ruta_storage, 3600);
        return { ...adj, url: urlData?.signedUrl };
      })
    );

    return { data: adjuntosConUrl, error: null, success: true };
  }

  /**
   * Sube un adjunto a un ticket
   */
  subirAdjunto(ticketId: string, file: File): Observable<ServiceResponse<TicketAdjunto>> {
    return from(this.subirAdjuntoAsync(ticketId, file));
  }

  private async subirAdjuntoAsync(ticketId: string, file: File): Promise<ServiceResponse<TicketAdjunto>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    // Generar ruta única
    const fileExt = file.name.split('.').pop();
    const fileName = `${ticketId}/${Date.now()}_${file.name}`;

    // Subir archivo a storage
    const { error: uploadError } = await this.supabase.client.storage
      .from('ticket-attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { data: null, error: 'Error al subir archivo', success: false };
    }

    // Registrar en base de datos
    const { data, error } = await this.supabase.client
      .from('ticket_adjuntos')
      .insert({
        ticket_id: ticketId,
        nombre_archivo: file.name,
        ruta_storage: fileName,
        tipo_archivo: file.type,
        tamanio_bytes: file.size,
        subido_por: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering attachment:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.supabase.client
      .from('ticket_bitacora')
      .insert({
        ticket_id: ticketId,
        usuario_id: userId,
        tipo: 'adjunto',
        mensaje: `Archivo adjuntado: ${file.name}`,
        datos_adicionales: { adjunto_id: data.id, nombre: file.name }
      });

    return { data: data as TicketAdjunto, error: null, success: true };
  }

  // ============================================================================
  // Estadísticas y Alertas
  // ============================================================================

  /**
   * Obtiene estadísticas de tickets
   */
  async getTicketStats(): Promise<TicketStats> {
    try {
      const userId = this.supabase.user?.id;

      // Obtener tickets de la vista
      const { data: tickets } = await this.supabase.client
        .from('v_tickets_con_sla')
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
      console.error('Error getting ticket stats:', error);
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

  /**
   * Obtiene tickets en alerta (amarillos y rojos)
   */
  getTicketsAlertas(limite: number = 10): Observable<ServiceResponse<TicketAlerta[]>> {
    return from(this.fetchTicketsAlertas(limite));
  }

  private async fetchTicketsAlertas(limite: number): Promise<ServiceResponse<TicketAlerta[]>> {
    const { data, error } = await this.supabase.client
      .rpc('get_tickets_alertas', { p_limite: limite });

    if (error) {
      console.error('Error fetching ticket alerts:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TicketAlerta[], error: null, success: true };
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
      .from('categorias_servicio')
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
      .from('estatus_tickets')
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
      .from('canales_contacto')
      .select('*')
      .eq('activo', true);

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CanalContacto[], error: null, success: true };
  }
}
