// ============================================================================
// Caso Service
// ============================================================================
// Servicio para gestión de casos (escalamientos) con SLA
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { compressImage, IMAGE_PRESETS } from '../helpers/image.utils';
import {
  Caso,
  CasoConSLA,
  CasoFilters,
  EscalarTicketDTO,
  CreateCasoDTO,
  UpdateCasoDTO,
  CambiarEstatusCasoDTO,
  MarcarListoDTO,
  RegresarSoporteDTO,
  CerrarCasoDTO,
  CasoBitacora,
  CasoAdjunto,
  CasoStats,
  EstatusCaso,
  AreaDestinoConfig,
  PaginationOptions,
  PaginatedResponse,
  ServiceResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class CasoService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Obtiene lista de casos con filtros y paginación
   */
  getCasos(
    filters?: CasoFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<CasoConSLA>> {
    return from(this.fetchCasos(filters, pagination));
  }

  private async fetchCasos(
    filters?: CasoFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<CasoConSLA>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'fecha_creacion';
    const sortOrder = pagination?.sortOrder ?? 'desc';

    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    // Usar la vista con SLA calculado
    let query = this.supabase.client
      .from('v_casos_con_sla')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.ilike('folio', `%${filters.search}%`);
      }
      if (filters.area_destino) {
        query = query.eq('area_destino', filters.area_destino);
      }
      if (filters.motivo) {
        query = query.eq('motivo', filters.motivo);
      }
      if (filters.estatus_id) {
        query = query.eq('estatus_id', filters.estatus_id);
      }
      if (filters.responsable_id) {
        query = query.eq('responsable_id', filters.responsable_id);
      }
      if (filters.semaforo) {
        query = query.eq('semaforo', filters.semaforo);
      }
      if (filters.fecha_desde) {
        query = query.gte('fecha_creacion', filters.fecha_desde);
      }
      if (filters.fecha_hasta) {
        query = query.lte('fecha_creacion', filters.fecha_hasta);
      }
      if (filters.compromiso_vencido !== undefined) {
        query = query.eq('compromiso_vencido', filters.compromiso_vencido);
      }
      if (filters.solo_mis_casos) {
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
      console.error('Error fetching casos:', error);
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
      data: data as CasoConSLA[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene un caso por ID con datos completos
   */
  getCasoById(id: string): Observable<ServiceResponse<CasoConSLA>> {
    return from(this.fetchCasoById(id));
  }

  private async fetchCasoById(id: string): Promise<ServiceResponse<CasoConSLA>> {
    const { data, error } = await this.supabase.client
      .from('v_casos_con_sla')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching caso:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CasoConSLA, error: null, success: true };
  }

  /**
   * Obtiene un caso por folio
   */
  getCasoByFolio(folio: string): Observable<ServiceResponse<CasoConSLA>> {
    return from(this.fetchCasoByFolio(folio));
  }

  private async fetchCasoByFolio(folio: string): Promise<ServiceResponse<CasoConSLA>> {
    const { data, error } = await this.supabase.client
      .from('v_casos_con_sla')
      .select('*')
      .eq('folio', folio)
      .single();

    if (error) {
      console.error('Error fetching caso by folio:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CasoConSLA, error: null, success: true };
  }

  // ============================================================================
  // Escalamiento de Tickets
  // ============================================================================

  /**
   * Escala un ticket a caso (usa función de BD para operación atómica)
   */
  escalarTicket(dto: EscalarTicketDTO): Observable<ServiceResponse<Caso>> {
    return from(this.escalarTicketAsync(dto));
  }

  private async escalarTicketAsync(dto: EscalarTicketDTO): Promise<ServiceResponse<Caso>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    // Usar la función RPC para escalar el ticket
    // La función usa auth.uid() internamente para obtener el usuario
    const { data, error } = await this.supabase.client
      .rpc('escalar_ticket_a_caso', {
        p_ticket_id: dto.ticket_id,
        p_area_destino: dto.area_destino,
        p_motivo: dto.motivo,
        p_descripcion: dto.descripcion || null,
        p_fecha_compromiso: dto.fecha_compromiso || null
      });

    if (error) {
      console.error('Error escalating ticket:', error);
      return { data: null, error: error.message, success: false };
    }

    // La función devuelve el ID del caso creado
    if (data) {
      const casoResponse = await this.fetchCasoById(data);
      if (casoResponse.success && casoResponse.data) {
        return { data: casoResponse.data as Caso, error: null, success: true };
      }
    }

    return { data: null, error: 'Error obteniendo caso creado', success: false };
  }

  /**
   * Crea un caso manualmente (sin ticket asociado o para casos especiales)
   */
  createCaso(casoData: CreateCasoDTO): Observable<ServiceResponse<Caso>> {
    return from(this.createCasoAsync(casoData));
  }

  private async createCasoAsync(casoData: CreateCasoDTO): Promise<ServiceResponse<Caso>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    // Obtener SLA default del área
    const { data: area } = await this.supabase.client
      .from('areas_destino')
      .select('sla_default_horas')
      .eq('nombre', casoData.area_destino)
      .single();

    const slaMinutos = (area?.sla_default_horas || 8) * 60;

    // Obtener estatus inicial "Nuevo"
    const { data: estatusNuevo } = await this.supabase.client
      .from('estatus_casos')
      .select('id')
      .eq('nombre', 'Nuevo')
      .single();

    if (!estatusNuevo) {
      return { data: null, error: 'No se encontró el estatus inicial', success: false };
    }

    const { data, error } = await this.supabase.client
      .from('casos')
      .insert({
        ...casoData,
        estatus_id: estatusNuevo.id,
        sla_objetivo_minutos: slaMinutos,
        prioridad: casoData.prioridad || 'Media',
        creado_por: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating caso:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.supabase.client
      .from('caso_bitacora')
      .insert({
        caso_id: data.id,
        usuario_id: userId,
        tipo: 'nota',
        mensaje: 'Caso creado',
        datos_adicionales: { accion: 'creacion' }
      });

    return { data: data as Caso, error: null, success: true };
  }

  /**
   * Actualiza un caso
   */
  updateCaso(id: string, data: UpdateCasoDTO): Observable<ServiceResponse<Caso>> {
    return from(this.updateCasoAsync(id, data));
  }

  private async updateCasoAsync(id: string, casoData: UpdateCasoDTO): Promise<ServiceResponse<Caso>> {
    const { data, error } = await this.supabase.client
      .from('casos')
      .update({
        ...casoData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating caso:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Caso, error: null, success: true };
  }

  // ============================================================================
  // Acciones sobre Casos
  // ============================================================================

  /**
   * Cambia el estatus de un caso
   */
  cambiarEstatus(casoId: string, dto: CambiarEstatusCasoDTO): Observable<ServiceResponse<Caso>> {
    return from(this.cambiarEstatusAsync(casoId, dto));
  }

  private async cambiarEstatusAsync(casoId: string, dto: CambiarEstatusCasoDTO): Promise<ServiceResponse<Caso>> {
    const userId = this.supabase.user?.id;

    // Actualizar caso
    const { data, error } = await this.supabase.client
      .from('casos')
      .update({
        estatus_id: dto.estatus_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', casoId)
      .select()
      .single();

    if (error) {
      console.error('Error changing caso status:', error);
      return { data: null, error: error.message, success: false };
    }

    // Si hay nota, agregarla
    if (dto.nota) {
      await this.supabase.client
        .from('caso_bitacora')
        .insert({
          caso_id: casoId,
          usuario_id: userId,
          tipo: 'nota',
          mensaje: dto.nota
        });
    }

    return { data: data as Caso, error: null, success: true };
  }

  /**
   * Asigna un caso a un usuario
   */
  asignarCaso(casoId: string, usuarioId: string, motivo?: string): Observable<ServiceResponse<Caso>> {
    return from(this.asignarCasoAsync(casoId, usuarioId, motivo));
  }

  private async asignarCasoAsync(casoId: string, usuarioId: string, motivo?: string): Promise<ServiceResponse<Caso>> {
    const userId = this.supabase.user?.id;

    // Obtener caso actual para historial
    const { data: casoActual } = await this.supabase.client
      .from('casos')
      .select('responsable_id')
      .eq('id', casoId)
      .single();

    // Actualizar caso
    const { data, error } = await this.supabase.client
      .from('casos')
      .update({
        responsable_id: usuarioId,
        updated_at: new Date().toISOString()
      })
      .eq('id', casoId)
      .select()
      .single();

    if (error) {
      console.error('Error assigning caso:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en historial de asignaciones
    await this.supabase.client
      .from('caso_historial_asignaciones')
      .insert({
        caso_id: casoId,
        de_usuario_id: casoActual?.responsable_id || null,
        a_usuario_id: usuarioId,
        motivo: motivo
      });

    // Registrar en bitácora
    await this.supabase.client
      .from('caso_bitacora')
      .insert({
        caso_id: casoId,
        usuario_id: userId,
        tipo: 'asignacion',
        mensaje: motivo || 'Caso asignado',
        datos_adicionales: {
          de_usuario_id: casoActual?.responsable_id,
          a_usuario_id: usuarioId
        }
      });

    return { data: data as Caso, error: null, success: true };
  }

  /**
   * Marca un caso como "Listo para validar"
   */
  marcarListoParaValidar(casoId: string, dto: MarcarListoDTO): Observable<ServiceResponse<Caso>> {
    return from(this.marcarListoParaValidarAsync(casoId, dto));
  }

  private async marcarListoParaValidarAsync(casoId: string, dto: MarcarListoDTO): Promise<ServiceResponse<Caso>> {
    const userId = this.supabase.user?.id;

    // Obtener estatus "Listo para validar"
    const { data: estatusListo } = await this.supabase.client
      .from('estatus_casos')
      .select('id')
      .eq('nombre', 'Listo para validar')
      .single();

    if (!estatusListo) {
      return { data: null, error: 'No se encontró el estatus "Listo para validar"', success: false };
    }

    // Actualizar caso
    const { data, error } = await this.supabase.client
      .from('casos')
      .update({
        estatus_id: estatusListo.id,
        resultado: 'Listo para validar',
        fecha_resolucion: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', casoId)
      .select()
      .single();

    if (error) {
      console.error('Error marking caso as ready:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.supabase.client
      .from('caso_bitacora')
      .insert({
        caso_id: casoId,
        usuario_id: userId,
        tipo: 'cambio_estatus',
        mensaje: dto.notas_resolucion,
        datos_adicionales: { accion: 'listo_para_validar' }
      });

    return { data: data as Caso, error: null, success: true };
  }

  /**
   * Regresa un caso a soporte
   */
  regresarASoporte(casoId: string, dto: RegresarSoporteDTO): Observable<ServiceResponse<Caso>> {
    return from(this.regresarASoporteAsync(casoId, dto));
  }

  private async regresarASoporteAsync(casoId: string, dto: RegresarSoporteDTO): Promise<ServiceResponse<Caso>> {
    const userId = this.supabase.user?.id;

    // Obtener estatus "Regresado a soporte"
    const { data: estatusRegresado } = await this.supabase.client
      .from('estatus_casos')
      .select('id')
      .eq('nombre', 'Regresado a soporte')
      .single();

    if (!estatusRegresado) {
      return { data: null, error: 'No se encontró el estatus "Regresado a soporte"', success: false };
    }

    // Actualizar caso
    const { data, error } = await this.supabase.client
      .from('casos')
      .update({
        estatus_id: estatusRegresado.id,
        resultado: 'Regresa a soporte',
        updated_at: new Date().toISOString()
      })
      .eq('id', casoId)
      .select()
      .single();

    if (error) {
      console.error('Error returning caso to support:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.supabase.client
      .from('caso_bitacora')
      .insert({
        caso_id: casoId,
        usuario_id: userId,
        tipo: 'cambio_estatus',
        mensaje: dto.motivo,
        datos_adicionales: { accion: 'regresa_soporte' }
      });

    return { data: data as Caso, error: null, success: true };
  }

  /**
   * Cierra un caso
   */
  cerrarCaso(casoId: string, dto: CerrarCasoDTO): Observable<ServiceResponse<Caso>> {
    return from(this.cerrarCasoAsync(casoId, dto));
  }

  private async cerrarCasoAsync(casoId: string, dto: CerrarCasoDTO): Promise<ServiceResponse<Caso>> {
    const userId = this.supabase.user?.id;

    // Obtener estatus "Cerrado"
    const { data: estatusCerrado } = await this.supabase.client
      .from('estatus_casos')
      .select('id')
      .eq('nombre', 'Cerrado')
      .single();

    if (!estatusCerrado) {
      return { data: null, error: 'No se encontró el estatus "Cerrado"', success: false };
    }

    // Actualizar caso
    const { data, error } = await this.supabase.client
      .from('casos')
      .update({
        estatus_id: estatusCerrado.id,
        resultado: dto.resultado,
        fecha_resolucion: new Date().toISOString(),
        cerrado_por: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', casoId)
      .select()
      .single();

    if (error) {
      console.error('Error closing caso:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.supabase.client
      .from('caso_bitacora')
      .insert({
        caso_id: casoId,
        usuario_id: userId,
        tipo: 'cambio_estatus',
        mensaje: dto.notas || 'Caso cerrado',
        datos_adicionales: { accion: 'cierre', resultado: dto.resultado }
      });

    return { data: data as Caso, error: null, success: true };
  }

  /**
   * Registra número de caso externo (ej: caso del proveedor)
   */
  registrarNumeroCasoExterno(casoId: string, numeroCasoExterno: string): Observable<ServiceResponse<Caso>> {
    return from(this.registrarNumeroCasoExternoAsync(casoId, numeroCasoExterno));
  }

  private async registrarNumeroCasoExternoAsync(casoId: string, numeroCasoExterno: string): Promise<ServiceResponse<Caso>> {
    const userId = this.supabase.user?.id;

    const { data, error } = await this.supabase.client
      .from('casos')
      .update({
        numero_caso_externo: numeroCasoExterno,
        updated_at: new Date().toISOString()
      })
      .eq('id', casoId)
      .select()
      .single();

    if (error) {
      console.error('Error registering external case number:', error);
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.supabase.client
      .from('caso_bitacora')
      .insert({
        caso_id: casoId,
        usuario_id: userId,
        tipo: 'numero_caso_recibido',
        mensaje: `Número de caso externo: ${numeroCasoExterno}`,
        datos_adicionales: { numero_caso_externo: numeroCasoExterno }
      });

    return { data: data as Caso, error: null, success: true };
  }

  // ============================================================================
  // Bitácora y Adjuntos
  // ============================================================================

  /**
   * Obtiene la bitácora de un caso
   */
  getCasoBitacora(casoId: string): Observable<ServiceResponse<CasoBitacora[]>> {
    return from(this.fetchCasoBitacora(casoId));
  }

  private async fetchCasoBitacora(casoId: string): Promise<ServiceResponse<CasoBitacora[]>> {
    const { data, error } = await this.supabase.client
      .from('caso_bitacora')
      .select(`
        *,
        usuario:profiles(nombre_completo, avatar_url)
      `)
      .eq('caso_id', casoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching caso timeline:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CasoBitacora[], error: null, success: true };
  }

  /**
   * Agrega una nota al caso
   */
  agregarNota(casoId: string, mensaje: string): Observable<ServiceResponse<CasoBitacora>> {
    return from(this.agregarNotaAsync(casoId, mensaje));
  }

  private async agregarNotaAsync(casoId: string, mensaje: string): Promise<ServiceResponse<CasoBitacora>> {
    const userId = this.supabase.user?.id;

    const { data, error } = await this.supabase.client
      .from('caso_bitacora')
      .insert({
        caso_id: casoId,
        usuario_id: userId,
        tipo: 'nota',
        mensaje: mensaje
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CasoBitacora, error: null, success: true };
  }

  /**
   * Obtiene los adjuntos de un caso
   */
  getCasoAdjuntos(casoId: string): Observable<ServiceResponse<CasoAdjunto[]>> {
    return from(this.fetchCasoAdjuntos(casoId));
  }

  private async fetchCasoAdjuntos(casoId: string): Promise<ServiceResponse<CasoAdjunto[]>> {
    const { data, error } = await this.supabase.client
      .from('caso_adjuntos')
      .select(`
        *,
        usuario:profiles(nombre_completo)
      `)
      .eq('caso_id', casoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      return { data: null, error: error.message, success: false };
    }

    // Generar URLs firmadas para cada adjunto
    const adjuntosConUrl = await Promise.all(
      (data as CasoAdjunto[]).map(async (adj) => {
        const { data: urlData } = await this.supabase.client.storage
          .from('caso-attachments')
          .createSignedUrl(adj.ruta_storage, 3600);
        return { ...adj, url: urlData?.signedUrl };
      })
    );

    return { data: adjuntosConUrl, error: null, success: true };
  }

  /**
   * Sube un adjunto a un caso
   */
  subirAdjunto(casoId: string, file: File): Observable<ServiceResponse<CasoAdjunto>> {
    return from(this.subirAdjuntoAsync(casoId, file));
  }

  private async subirAdjuntoAsync(casoId: string, file: File): Promise<ServiceResponse<CasoAdjunto>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    // Comprimir imagen si es una imagen
    let processedFile = file;
    if (file.type.startsWith('image/')) {
      try {
        processedFile = await compressImage(file, IMAGE_PRESETS.evidencia);
        console.log(`Adjunto comprimido: ${file.size} -> ${processedFile.size} bytes`);
      } catch (err) {
        console.warn('No se pudo comprimir la imagen:', err);
      }
    }

    // Generar ruta única
    const fileName = `${casoId}/${Date.now()}_${processedFile.name}`;

    // Subir archivo a storage
    const { error: uploadError } = await this.supabase.client.storage
      .from('caso-attachments')
      .upload(fileName, processedFile);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { data: null, error: 'Error al subir archivo', success: false };
    }

    // Registrar en base de datos
    const { data, error } = await this.supabase.client
      .from('caso_adjuntos')
      .insert({
        caso_id: casoId,
        nombre_archivo: processedFile.name,
        ruta_storage: fileName,
        tipo_archivo: processedFile.type,
        tamanio_bytes: processedFile.size,
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
      .from('caso_bitacora')
      .insert({
        caso_id: casoId,
        usuario_id: userId,
        tipo: 'adjunto',
        mensaje: `Archivo adjuntado: ${file.name}`,
        datos_adicionales: { adjunto_id: data.id, nombre: file.name }
      });

    return { data: data as CasoAdjunto, error: null, success: true };
  }

  // ============================================================================
  // Estadísticas
  // ============================================================================

  /**
   * Obtiene estadísticas de casos
   */
  async getCasoStats(): Promise<CasoStats> {
    try {
      // Obtener casos activos de la vista
      const { data: casos } = await this.supabase.client
        .from('v_casos_con_sla')
        .select('*')
        .eq('estatus_es_final', false);

      if (!casos || casos.length === 0) {
        return this.emptyStats();
      }

      const total_activos = casos.length;

      // Agrupar por área
      const total_por_area = {
        'Dev': 0,
        'Implementación': 0,
        'Facturación': 0,
        'Proveedor': 0,
        'Cobranza': 0
      } as Record<string, number>;

      casos.forEach(c => {
        if (c.area_destino in total_por_area) {
          total_por_area[c.area_destino]++;
        }
      });

      // Agrupar por semáforo
      const total_por_semaforo = {
        'verde': 0,
        'amarillo': 0,
        'rojo': 0,
        'azul': 0,
        'gris': 0
      } as Record<string, number>;

      casos.forEach(c => {
        if (c.semaforo in total_por_semaforo) {
          total_por_semaforo[c.semaforo]++;
        }
      });

      const casos_vencidos = casos.filter(c => c.compromiso_vencido).length;

      return {
        total_activos,
        total_por_area,
        total_por_semaforo,
        casos_vencidos
      } as CasoStats;
    } catch (error) {
      console.error('Error getting caso stats:', error);
      return this.emptyStats();
    }
  }

  private emptyStats(): CasoStats {
    return {
      total_activos: 0,
      total_por_area: {
        'Dev': 0,
        'Implementación': 0,
        'Facturación': 0,
        'Proveedor': 0,
        'Cobranza': 0
      },
      total_por_semaforo: {
        'verde': 0,
        'amarillo': 0,
        'rojo': 0,
        'azul': 0,
        'gris': 0
      },
      casos_vencidos: 0
    } as CasoStats;
  }

  /**
   * Obtiene casos con alertas (amarillo, rojo o compromiso vencido)
   */
  getCasosAlertas(limit: number = 10): Observable<ServiceResponse<CasoConSLA[]>> {
    return from(this.fetchCasosAlertas(limit));
  }

  private async fetchCasosAlertas(limit: number): Promise<ServiceResponse<CasoConSLA[]>> {
    try {
      const { data, error } = await this.supabase.client
        .from('v_casos_con_sla')
        .select('*')
        .eq('estatus_es_final', false)
        .or('semaforo.eq.amarillo,semaforo.eq.rojo,compromiso_vencido.eq.true')
        .order('porcentaje_sla', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as CasoConSLA[], error: null, success: true };
    } catch (error) {
      console.error('Error fetching casos alertas:', error);
      return { data: null, error: 'Error al obtener alertas', success: false };
    }
  }

  /**
   * Obtiene los casos más antiguos activos
   */
  getCasosMasAntiguos(limit: number = 5): Observable<ServiceResponse<CasoConSLA[]>> {
    return from(this.fetchCasosMasAntiguos(limit));
  }

  private async fetchCasosMasAntiguos(limit: number): Promise<ServiceResponse<CasoConSLA[]>> {
    try {
      const { data, error } = await this.supabase.client
        .from('v_casos_con_sla')
        .select('*')
        .eq('estatus_es_final', false)
        .order('fecha_creacion', { ascending: true })
        .limit(limit);

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as CasoConSLA[], error: null, success: true };
    } catch (error) {
      console.error('Error fetching casos antiguos:', error);
      return { data: null, error: 'Error al obtener casos antiguos', success: false };
    }
  }

  // ============================================================================
  // Catálogos
  // ============================================================================

  /**
   * Obtiene todos los estatus de casos
   */
  getEstatus(): Observable<ServiceResponse<EstatusCaso[]>> {
    return from(this.fetchEstatus());
  }

  private async fetchEstatus(): Promise<ServiceResponse<EstatusCaso[]>> {
    const { data, error } = await this.supabase.client
      .from('estatus_casos')
      .select('*')
      .order('orden');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as EstatusCaso[], error: null, success: true };
  }

  /**
   * Obtiene todas las áreas de destino configuradas
   */
  getAreasDestino(): Observable<ServiceResponse<AreaDestinoConfig[]>> {
    return from(this.fetchAreasDestino());
  }

  private async fetchAreasDestino(): Promise<ServiceResponse<AreaDestinoConfig[]>> {
    const { data, error } = await this.supabase.client
      .from('areas_destino')
      .select('*')
      .eq('estatus', 'Activo')
      .order('nombre');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as AreaDestinoConfig[], error: null, success: true };
  }

  /**
   * Obtiene los casos asociados a un ticket
   */
  getCasosByTicket(ticketId: string): Observable<ServiceResponse<CasoConSLA[]>> {
    return from(this.fetchCasosByTicket(ticketId));
  }

  private async fetchCasosByTicket(ticketId: string): Promise<ServiceResponse<CasoConSLA[]>> {
    const { data, error } = await this.supabase.client
      .from('v_casos_con_sla')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error fetching casos for ticket:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as CasoConSLA[], error: null, success: true };
  }
}
