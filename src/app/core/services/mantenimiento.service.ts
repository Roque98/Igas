// ============================================================================
// Mantenimiento Service
// ============================================================================
// Servicio para gestión de mantenimientos con calendario y checklist
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { compressImage, IMAGE_PRESETS } from '../helpers/image.utils';
import {
  Mantenimiento,
  MantenimientoCompleto,
  MantenimientoFilters,
  CreateMantenimientoDTO,
  UpdateMantenimientoDTO,
  FinalizarMantenimientoDTO,
  EjecutarChecklistItemDTO,
  MantenimientoChecklist,
  MantenimientoEvidencia,
  MantenimientoCalendario,
  MantenimientoStats,
  TipoMantenimiento,
  EstatusMantenimiento,
  ChecklistTemplate,
  ChecklistItemTemplate,
  EvidenciaTipo,
  PaginationOptions,
  PaginatedResponse,
  ServiceResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class MantenimientoService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Obtiene lista de mantenimientos con filtros y paginación
   */
  getMantenimientos(
    filters?: MantenimientoFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<MantenimientoCompleto>> {
    return from(this.fetchMantenimientos(filters, pagination));
  }

  private async fetchMantenimientos(
    filters?: MantenimientoFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<MantenimientoCompleto>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'fecha_programada';
    const sortOrder = pagination?.sortOrder ?? 'desc';

    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    let query = this.supabase.client
      .from('v_mantenimientos_completo')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.or(`folio.ilike.%${filters.search}%,cliente_nombre.ilike.%${filters.search}%`);
      }
      if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }
      if (filters.sucursal_id) {
        query = query.eq('sucursal_id', filters.sucursal_id);
      }
      if (filters.tipo_mantenimiento_id) {
        query = query.eq('tipo_mantenimiento_id', filters.tipo_mantenimiento_id);
      }
      if (filters.estatus_id) {
        query = query.eq('estatus_id', filters.estatus_id);
      }
      if (filters.tecnico_id) {
        query = query.eq('tecnico_id', filters.tecnico_id);
      }
      if (filters.resultado) {
        query = query.eq('resultado', filters.resultado);
      }
      if (filters.fecha_desde) {
        query = query.gte('fecha_programada', filters.fecha_desde);
      }
      if (filters.fecha_hasta) {
        query = query.lte('fecha_programada', filters.fecha_hasta);
      }
      if (filters.solo_mis_mantenimientos) {
        const userId = this.supabase.user?.id;
        if (userId) {
          query = query.or(`tecnico_id.eq.${userId},creado_por.eq.${userId}`);
        }
      }
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching mantenimientos:', error);
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
      data: data as MantenimientoCompleto[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene un mantenimiento por ID
   */
  getMantenimientoById(id: string): Observable<ServiceResponse<MantenimientoCompleto>> {
    return from(this.fetchMantenimientoById(id));
  }

  private async fetchMantenimientoById(id: string): Promise<ServiceResponse<MantenimientoCompleto>> {
    const { data, error } = await this.supabase.client
      .from('v_mantenimientos_completo')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching mantenimiento:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as MantenimientoCompleto, error: null, success: true };
  }

  /**
   * Crea un nuevo mantenimiento
   */
  createMantenimiento(dto: CreateMantenimientoDTO): Observable<ServiceResponse<Mantenimiento>> {
    return from(this.createMantenimientoAsync(dto));
  }

  private async createMantenimientoAsync(dto: CreateMantenimientoDTO): Promise<ServiceResponse<Mantenimiento>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    const { data, error } = await this.supabase.client
      .from('mantenimientos')
      .insert({
        ...dto,
        creado_por: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating mantenimiento:', error);
      return { data: null, error: error.message, success: false };
    }

    // Si hay template de checklist, copiar items
    if (dto.template_checklist_id) {
      await this.copiarChecklistFromTemplate(data.id, dto.template_checklist_id);
    }

    return { data: data as Mantenimiento, error: null, success: true };
  }

  /**
   * Actualiza un mantenimiento
   */
  updateMantenimiento(id: string, dto: UpdateMantenimientoDTO): Observable<ServiceResponse<Mantenimiento>> {
    return from(this.updateMantenimientoAsync(id, dto));
  }

  private async updateMantenimientoAsync(id: string, dto: UpdateMantenimientoDTO): Promise<ServiceResponse<Mantenimiento>> {
    const { data, error } = await this.supabase.client
      .from('mantenimientos')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mantenimiento:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Mantenimiento, error: null, success: true };
  }

  // ============================================================================
  // Calendario
  // ============================================================================

  /**
   * Obtiene mantenimientos por mes para el calendario
   */
  getMantenimientosPorMes(mes: number, anio: number): Observable<ServiceResponse<MantenimientoCalendario[]>> {
    return from(this.fetchMantenimientosPorMes(mes, anio));
  }

  private async fetchMantenimientosPorMes(mes: number, anio: number): Promise<ServiceResponse<MantenimientoCalendario[]>> {
    const { data, error } = await this.supabase.client
      .rpc('get_mantenimientos_por_mes', { p_mes: mes, p_anio: anio });

    if (error) {
      console.error('Error fetching mantenimientos por mes:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as MantenimientoCalendario[], error: null, success: true };
  }

  // ============================================================================
  // Checklist
  // ============================================================================

  /**
   * Obtiene el checklist de un mantenimiento
   */
  getChecklist(mantenimientoId: string): Observable<ServiceResponse<MantenimientoChecklist[]>> {
    return from(this.fetchChecklist(mantenimientoId));
  }

  private async fetchChecklist(mantenimientoId: string): Promise<ServiceResponse<MantenimientoChecklist[]>> {
    const { data, error } = await this.supabase.client
      .from('mantenimiento_checklist')
      .select('*')
      .eq('mantenimiento_id', mantenimientoId)
      .order('orden');

    if (error) {
      console.error('Error fetching checklist:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as MantenimientoChecklist[], error: null, success: true };
  }

  /**
   * Ejecuta (marca completado) un item del checklist
   */
  ejecutarChecklistItem(itemId: string, dto: EjecutarChecklistItemDTO): Observable<ServiceResponse<MantenimientoChecklist>> {
    return from(this.ejecutarChecklistItemAsync(itemId, dto));
  }

  private async ejecutarChecklistItemAsync(itemId: string, dto: EjecutarChecklistItemDTO): Promise<ServiceResponse<MantenimientoChecklist>> {
    const userId = this.supabase.user?.id;

    const { data, error } = await this.supabase.client
      .from('mantenimiento_checklist')
      .update({
        completado: dto.completado,
        completado_por: dto.completado ? userId : null,
        completado_at: dto.completado ? new Date().toISOString() : null,
        notas: dto.notas
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error ejecutando checklist item:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as MantenimientoChecklist, error: null, success: true };
  }

  private async copiarChecklistFromTemplate(mantenimientoId: string, templateId: string): Promise<void> {
    // Obtener items del template
    const { data: items } = await this.supabase.client
      .from('checklist_items_template')
      .select('*')
      .eq('template_id', templateId)
      .order('orden');

    if (items && items.length > 0) {
      const checklistItems = items.map(item => ({
        mantenimiento_id: mantenimientoId,
        item_template_id: item.id,
        descripcion: item.descripcion,
        orden: item.orden,
        obligatorio: item.obligatorio,
        requiere_evidencia: item.requiere_evidencia
      }));

      await this.supabase.client
        .from('mantenimiento_checklist')
        .insert(checklistItems);
    }
  }

  // ============================================================================
  // Evidencias
  // ============================================================================

  /**
   * Obtiene evidencias de un mantenimiento
   */
  getEvidencias(mantenimientoId: string): Observable<ServiceResponse<MantenimientoEvidencia[]>> {
    return from(this.fetchEvidencias(mantenimientoId));
  }

  private async fetchEvidencias(mantenimientoId: string): Promise<ServiceResponse<MantenimientoEvidencia[]>> {
    const { data, error } = await this.supabase.client
      .from('mantenimiento_evidencias')
      .select('*')
      .eq('mantenimiento_id', mantenimientoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evidencias:', error);
      return { data: null, error: error.message, success: false };
    }

    // Generar URLs firmadas
    const evidenciasConUrl = await Promise.all(
      (data as MantenimientoEvidencia[]).map(async (ev) => {
        const { data: urlData } = await this.supabase.client.storage
          .from('mantenimiento-evidencias')
          .createSignedUrl(ev.ruta_storage, 3600);
        return { ...ev, url: urlData?.signedUrl };
      })
    );

    return { data: evidenciasConUrl, error: null, success: true };
  }

  /**
   * Sube una evidencia
   */
  subirEvidencia(
    mantenimientoId: string,
    file: File,
    tipo: EvidenciaTipo,
    checklistItemId?: string,
    descripcion?: string
  ): Observable<ServiceResponse<MantenimientoEvidencia>> {
    return from(this.subirEvidenciaAsync(mantenimientoId, file, tipo, checklistItemId, descripcion));
  }

  private async subirEvidenciaAsync(
    mantenimientoId: string,
    file: File,
    tipo: EvidenciaTipo,
    checklistItemId?: string,
    descripcion?: string
  ): Promise<ServiceResponse<MantenimientoEvidencia>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    // Comprimir imagen si es una imagen
    let processedFile = file;
    if (file.type.startsWith('image/')) {
      try {
        processedFile = await compressImage(file, IMAGE_PRESETS.evidencia);
        console.log(`Evidencia comprimida: ${file.size} -> ${processedFile.size} bytes`);
      } catch (err) {
        console.warn('No se pudo comprimir la imagen:', err);
      }
    }

    const fileName = `${mantenimientoId}/${Date.now()}_${processedFile.name}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('mantenimiento-evidencias')
      .upload(fileName, processedFile);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { data: null, error: 'Error al subir archivo', success: false };
    }

    const { data, error } = await this.supabase.client
      .from('mantenimiento_evidencias')
      .insert({
        mantenimiento_id: mantenimientoId,
        checklist_item_id: checklistItemId,
        tipo,
        nombre_archivo: processedFile.name,
        ruta_storage: fileName,
        tipo_archivo: processedFile.type,
        tamanio_bytes: processedFile.size,
        descripcion,
        subido_por: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering evidencia:', error);
      return { data: null, error: error.message, success: false };
    }

    // Actualizar checklist item si aplica
    if (checklistItemId) {
      await this.supabase.client
        .from('mantenimiento_checklist')
        .update({ tiene_evidencia: true })
        .eq('id', checklistItemId);
    }

    return { data: data as MantenimientoEvidencia, error: null, success: true };
  }

  /**
   * Elimina una evidencia
   */
  eliminarEvidencia(evidenciaId: string): Observable<ServiceResponse<void>> {
    return from(this.eliminarEvidenciaAsync(evidenciaId));
  }

  private async eliminarEvidenciaAsync(evidenciaId: string): Promise<ServiceResponse<void>> {
    // Obtener la evidencia para borrar del storage
    const { data: evidencia } = await this.supabase.client
      .from('mantenimiento_evidencias')
      .select('ruta_storage')
      .eq('id', evidenciaId)
      .single();

    if (evidencia) {
      await this.supabase.client.storage
        .from('mantenimiento-evidencias')
        .remove([evidencia.ruta_storage]);
    }

    const { error } = await this.supabase.client
      .from('mantenimiento_evidencias')
      .delete()
      .eq('id', evidenciaId);

    if (error) {
      console.error('Error deleting evidencia:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: undefined, error: null, success: true };
  }

  // ============================================================================
  // Finalizar Mantenimiento
  // ============================================================================

  /**
   * Finaliza un mantenimiento con resultado
   */
  finalizarMantenimiento(id: string, dto: FinalizarMantenimientoDTO): Observable<ServiceResponse<Mantenimiento>> {
    return from(this.finalizarMantenimientoAsync(id, dto));
  }

  private async finalizarMantenimientoAsync(id: string, dto: FinalizarMantenimientoDTO): Promise<ServiceResponse<Mantenimiento>> {
    // Obtener estatus "Completado"
    const { data: estatusCompletado } = await this.supabase.client
      .from('estatus_mantenimientos')
      .select('id')
      .eq('nombre', 'Completado')
      .single();

    const { data, error } = await this.supabase.client
      .from('mantenimientos')
      .update({
        estatus_id: estatusCompletado?.id,
        resultado: dto.resultado,
        observaciones: dto.observaciones,
        recomendaciones: dto.recomendaciones,
        fecha_fin: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error finalizando mantenimiento:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Mantenimiento, error: null, success: true };
  }

  /**
   * Genera ticket desde mantenimiento que requiere acción
   */
  generarTicketPorResultado(mantenimientoId: string): Observable<ServiceResponse<string>> {
    return from(this.generarTicketPorResultadoAsync(mantenimientoId));
  }

  private async generarTicketPorResultadoAsync(mantenimientoId: string): Promise<ServiceResponse<string>> {
    const { data, error } = await this.supabase.client
      .rpc('generar_ticket_desde_mantenimiento', { p_mantenimiento_id: mantenimientoId });

    if (error) {
      console.error('Error generando ticket:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as string, error: null, success: true };
  }

  /**
   * Inicia un mantenimiento (cambia a "En proceso")
   */
  iniciarMantenimiento(id: string): Observable<ServiceResponse<Mantenimiento>> {
    return from(this.iniciarMantenimientoAsync(id));
  }

  private async iniciarMantenimientoAsync(id: string): Promise<ServiceResponse<Mantenimiento>> {
    const { data: estatusEnProceso } = await this.supabase.client
      .from('estatus_mantenimientos')
      .select('id')
      .eq('nombre', 'En proceso')
      .single();

    const { data, error } = await this.supabase.client
      .from('mantenimientos')
      .update({
        estatus_id: estatusEnProceso?.id,
        fecha_inicio: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error iniciando mantenimiento:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Mantenimiento, error: null, success: true };
  }

  // ============================================================================
  // Catálogos
  // ============================================================================

  /**
   * Obtiene tipos de mantenimiento
   */
  getTiposMantenimiento(): Observable<ServiceResponse<TipoMantenimiento[]>> {
    return from(this.fetchTiposMantenimiento());
  }

  private async fetchTiposMantenimiento(): Promise<ServiceResponse<TipoMantenimiento[]>> {
    const { data, error } = await this.supabase.client
      .from('tipos_mantenimiento')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TipoMantenimiento[], error: null, success: true };
  }

  /**
   * Obtiene estatus de mantenimiento
   */
  getEstatus(): Observable<ServiceResponse<EstatusMantenimiento[]>> {
    return from(this.fetchEstatus());
  }

  private async fetchEstatus(): Promise<ServiceResponse<EstatusMantenimiento[]>> {
    const { data, error } = await this.supabase.client
      .from('estatus_mantenimientos')
      .select('*')
      .order('orden');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as EstatusMantenimiento[], error: null, success: true };
  }

  /**
   * Obtiene templates de checklist para mantenimientos
   */
  getChecklistTemplates(tipoMantenimientoId?: string): Observable<ServiceResponse<ChecklistTemplate[]>> {
    return from(this.fetchChecklistTemplates(tipoMantenimientoId));
  }

  private async fetchChecklistTemplates(tipoMantenimientoId?: string): Promise<ServiceResponse<ChecklistTemplate[]>> {
    let query = this.supabase.client
      .from('checklist_templates')
      .select(`
        *,
        items:checklist_items_template(*)
      `)
      .eq('tipo', 'mantenimiento')
      .eq('activo', true);

    if (tipoMantenimientoId) {
      query = query.eq('tipo_mantenimiento_id', tipoMantenimientoId);
    }

    const { data, error } = await query.order('nombre');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as ChecklistTemplate[], error: null, success: true };
  }

  // ============================================================================
  // Estadísticas
  // ============================================================================

  /**
   * Obtiene estadísticas de mantenimientos
   */
  async getMantenimientoStats(): Promise<MantenimientoStats> {
    try {
      const { data: mantenimientos } = await this.supabase.client
        .from('v_mantenimientos_completo')
        .select('*');

      if (!mantenimientos || mantenimientos.length === 0) {
        return this.emptyStats();
      }

      const total = mantenimientos.length;
      const programados = mantenimientos.filter(m => m.estatus_nombre === 'Programado').length;
      const en_proceso = mantenimientos.filter(m => m.estatus_nombre === 'En proceso').length;
      const completados = mantenimientos.filter(m => m.estatus_nombre === 'Completado').length;
      const cancelados = mantenimientos.filter(m => m.estatus_nombre === 'Cancelado').length;

      // Agrupar por tipo
      const tiposMap = new Map<string, { nombre: string; cantidad: number; color: string }>();
      mantenimientos.forEach(m => {
        const key = m.tipo_mantenimiento_id;
        const existing = tiposMap.get(key);
        if (existing) {
          existing.cantidad++;
        } else {
          tiposMap.set(key, {
            nombre: m.tipo_mantenimiento_nombre || 'Sin tipo',
            cantidad: 1,
            color: m.tipo_mantenimiento_color || '#6c757d'
          });
        }
      });

      // Agrupar por resultado
      const completadosConResultado = mantenimientos.filter(m => m.resultado);
      const por_resultado = [
        { resultado: 'Completado' as const, cantidad: completadosConResultado.filter(m => m.resultado === 'Completado').length },
        { resultado: 'Parcial' as const, cantidad: completadosConResultado.filter(m => m.resultado === 'Parcial').length },
        { resultado: 'Requiere acción' as const, cantidad: completadosConResultado.filter(m => m.resultado === 'Requiere acción').length },
        { resultado: 'No realizado' as const, cantidad: completadosConResultado.filter(m => m.resultado === 'No realizado').length }
      ];

      return {
        total,
        programados,
        en_proceso,
        completados,
        cancelados,
        por_tipo: Array.from(tiposMap.values()),
        por_resultado
      };
    } catch (error) {
      console.error('Error getting mantenimiento stats:', error);
      return this.emptyStats();
    }
  }

  private emptyStats(): MantenimientoStats {
    return {
      total: 0,
      programados: 0,
      en_proceso: 0,
      completados: 0,
      cancelados: 0,
      por_tipo: [],
      por_resultado: []
    };
  }
}
