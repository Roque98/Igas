// ============================================================================
// Instalacion Service
// ============================================================================
// Servicio para gestión de instalaciones con pipeline y pendientes
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { compressImage, IMAGE_PRESETS } from '../helpers/image.utils';
import {
  Instalacion,
  InstalacionCompleta,
  InstalacionFilters,
  CreateInstalacionDTO,
  UpdateInstalacionDTO,
  FirmarInstalacionDTO,
  CreatePendienteDTO,
  UpdatePendienteDTO,
  ResolverPendienteDTO,
  EjecutarChecklistItemDTO,
  InstalacionModulo,
  InstalacionChecklist,
  InstalacionPendiente,
  InstalacionEvidencia,
  InstalacionPorEstatus,
  InstalacionStats,
  EstatusInstalacion,
  ModuloSistema,
  EvidenciaTipo,
  PaginationOptions,
  PaginatedResponse,
  ServiceResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class InstalacionService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Obtiene lista de instalaciones con filtros y paginación
   */
  getInstalaciones(
    filters?: InstalacionFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<InstalacionCompleta>> {
    return from(this.fetchInstalaciones(filters, pagination));
  }

  private async fetchInstalaciones(
    filters?: InstalacionFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<InstalacionCompleta>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'fecha_programada';
    const sortOrder = pagination?.sortOrder ?? 'desc';

    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    let query = this.supabase.client
      .from('v_instalaciones_completo')
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
      if (filters.estatus_id) {
        query = query.eq('estatus_id', filters.estatus_id);
      }
      if (filters.estatus_nombre) {
        query = query.eq('estatus_nombre', filters.estatus_nombre);
      }
      if (filters.tecnico_id) {
        query = query.eq('tecnico_id', filters.tecnico_id);
      }
      if (filters.fecha_desde) {
        query = query.gte('fecha_programada', filters.fecha_desde);
      }
      if (filters.fecha_hasta) {
        query = query.lte('fecha_programada', filters.fecha_hasta);
      }
      if (filters.tiene_pendientes) {
        query = query.gt('pendientes_abiertos', 0);
      }
      if (filters.solo_mis_instalaciones) {
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
      console.error('Error fetching instalaciones:', error);
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
      data: data as InstalacionCompleta[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene una instalación por ID
   */
  getInstalacionById(id: string): Observable<ServiceResponse<InstalacionCompleta>> {
    return from(this.fetchInstalacionById(id));
  }

  private async fetchInstalacionById(id: string): Promise<ServiceResponse<InstalacionCompleta>> {
    const { data, error } = await this.supabase.client
      .from('v_instalaciones_completo')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching instalacion:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as InstalacionCompleta, error: null, success: true };
  }

  /**
   * Crea una nueva instalación
   */
  createInstalacion(dto: CreateInstalacionDTO): Observable<ServiceResponse<Instalacion>> {
    return from(this.createInstalacionAsync(dto));
  }

  private async createInstalacionAsync(dto: CreateInstalacionDTO): Promise<ServiceResponse<Instalacion>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return { data: null, error: 'Usuario no autenticado', success: false };
    }

    const { modulos_ids, ...instalacionData } = dto;

    const { data, error } = await this.supabase.client
      .from('instalaciones')
      .insert({
        ...instalacionData,
        creado_por: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating instalacion:', error);
      return { data: null, error: error.message, success: false };
    }

    // Insertar módulos
    if (modulos_ids && modulos_ids.length > 0) {
      const modulosData = modulos_ids.map(moduloId => ({
        instalacion_id: data.id,
        modulo_id: moduloId
      }));

      await this.supabase.client
        .from('instalacion_modulos')
        .insert(modulosData);

      // Copiar checklist de templates de cada módulo
      await this.copiarChecklistPorModulos(data.id, modulos_ids);
    }

    return { data: data as Instalacion, error: null, success: true };
  }

  /**
   * Actualiza una instalación
   */
  updateInstalacion(id: string, dto: UpdateInstalacionDTO): Observable<ServiceResponse<Instalacion>> {
    return from(this.updateInstalacionAsync(id, dto));
  }

  private async updateInstalacionAsync(id: string, dto: UpdateInstalacionDTO): Promise<ServiceResponse<Instalacion>> {
    const { data, error } = await this.supabase.client
      .from('instalaciones')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating instalacion:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Instalacion, error: null, success: true };
  }

  // ============================================================================
  // Pipeline / Por Estatus
  // ============================================================================

  /**
   * Obtiene instalaciones agrupadas por estatus
   */
  getInstalacionesPorEstatus(): Observable<ServiceResponse<InstalacionPorEstatus[]>> {
    return from(this.fetchInstalacionesPorEstatus());
  }

  private async fetchInstalacionesPorEstatus(): Promise<ServiceResponse<InstalacionPorEstatus[]>> {
    const { data, error } = await this.supabase.client
      .rpc('get_instalaciones_por_estatus');

    if (error) {
      console.error('Error fetching instalaciones por estatus:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as InstalacionPorEstatus[], error: null, success: true };
  }

  /**
   * Cambia el estatus de una instalación
   */
  cambiarEstatus(id: string, nuevoEstatusId: string): Observable<ServiceResponse<Instalacion>> {
    return from(this.cambiarEstatusAsync(id, nuevoEstatusId));
  }

  private async cambiarEstatusAsync(id: string, nuevoEstatusId: string): Promise<ServiceResponse<Instalacion>> {
    const { data, error } = await this.supabase.client
      .from('instalaciones')
      .update({ estatus_id: nuevoEstatusId })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error changing estatus:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Instalacion, error: null, success: true };
  }

  /**
   * Inicia una instalación
   */
  iniciarInstalacion(id: string): Observable<ServiceResponse<Instalacion>> {
    return from(this.iniciarInstalacionAsync(id));
  }

  private async iniciarInstalacionAsync(id: string): Promise<ServiceResponse<Instalacion>> {
    const { data: estatusEnProceso } = await this.supabase.client
      .from('estatus_instalaciones')
      .select('id')
      .eq('nombre', 'En proceso')
      .single();

    const { data, error } = await this.supabase.client
      .from('instalaciones')
      .update({
        estatus_id: estatusEnProceso?.id,
        fecha_inicio: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error iniciando instalacion:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Instalacion, error: null, success: true };
  }

  // ============================================================================
  // Módulos
  // ============================================================================

  /**
   * Obtiene módulos de una instalación
   */
  getModulos(instalacionId: string): Observable<ServiceResponse<InstalacionModulo[]>> {
    return from(this.fetchModulos(instalacionId));
  }

  private async fetchModulos(instalacionId: string): Promise<ServiceResponse<InstalacionModulo[]>> {
    const { data, error } = await this.supabase.client
      .from('instalacion_modulos')
      .select(`
        *,
        modulo:modulos_sistema(*)
      `)
      .eq('instalacion_id', instalacionId);

    if (error) {
      console.error('Error fetching modulos:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as InstalacionModulo[], error: null, success: true };
  }

  // ============================================================================
  // Checklist
  // ============================================================================

  /**
   * Obtiene el checklist de una instalación
   */
  getChecklist(instalacionId: string): Observable<ServiceResponse<InstalacionChecklist[]>> {
    return from(this.fetchChecklist(instalacionId));
  }

  private async fetchChecklist(instalacionId: string): Promise<ServiceResponse<InstalacionChecklist[]>> {
    const { data, error } = await this.supabase.client
      .from('instalacion_checklist')
      .select(`
        *,
        modulo:modulos_sistema(nombre)
      `)
      .eq('instalacion_id', instalacionId)
      .order('modulo_id')
      .order('orden');

    if (error) {
      console.error('Error fetching checklist:', error);
      return { data: null, error: error.message, success: false };
    }

    // Mapear nombre del módulo
    const checklistConModulo = (data || []).map(item => ({
      ...item,
      modulo_nombre: (item as any).modulo?.nombre
    }));

    return { data: checklistConModulo as InstalacionChecklist[], error: null, success: true };
  }

  /**
   * Ejecuta un item del checklist
   */
  ejecutarChecklistItem(itemId: string, dto: EjecutarChecklistItemDTO): Observable<ServiceResponse<InstalacionChecklist>> {
    return from(this.ejecutarChecklistItemAsync(itemId, dto));
  }

  private async ejecutarChecklistItemAsync(itemId: string, dto: EjecutarChecklistItemDTO): Promise<ServiceResponse<InstalacionChecklist>> {
    const userId = this.supabase.user?.id;

    const { data, error } = await this.supabase.client
      .from('instalacion_checklist')
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

    return { data: data as InstalacionChecklist, error: null, success: true };
  }

  private async copiarChecklistPorModulos(instalacionId: string, modulosIds: string[]): Promise<void> {
    // Obtener templates de checklist para cada módulo
    const { data: templates } = await this.supabase.client
      .from('checklist_templates')
      .select(`
        *,
        items:checklist_items_template(*)
      `)
      .eq('tipo', 'instalacion')
      .eq('activo', true)
      .in('modulo_id', modulosIds);

    if (templates && templates.length > 0) {
      const checklistItems: any[] = [];

      templates.forEach(template => {
        if (template.items) {
          template.items.forEach((item: any) => {
            checklistItems.push({
              instalacion_id: instalacionId,
              modulo_id: template.modulo_id,
              item_template_id: item.id,
              descripcion: item.descripcion,
              orden: item.orden,
              obligatorio: item.obligatorio,
              requiere_evidencia: item.requiere_evidencia
            });
          });
        }
      });

      if (checklistItems.length > 0) {
        await this.supabase.client
          .from('instalacion_checklist')
          .insert(checklistItems);
      }
    }
  }

  // ============================================================================
  // Pendientes
  // ============================================================================

  /**
   * Obtiene pendientes de una instalación
   */
  getPendientes(instalacionId: string): Observable<ServiceResponse<InstalacionPendiente[]>> {
    return from(this.fetchPendientes(instalacionId));
  }

  private async fetchPendientes(instalacionId: string): Promise<ServiceResponse<InstalacionPendiente[]>> {
    const { data, error } = await this.supabase.client
      .from('instalacion_pendientes')
      .select(`
        *,
        ticket:tickets(folio)
      `)
      .eq('instalacion_id', instalacionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pendientes:', error);
      return { data: null, error: error.message, success: false };
    }

    const pendientesConTicket = (data || []).map(p => ({
      ...p,
      ticket_folio: (p as any).ticket?.folio
    }));

    return { data: pendientesConTicket as InstalacionPendiente[], error: null, success: true };
  }

  /**
   * Crea un pendiente
   */
  createPendiente(instalacionId: string, dto: CreatePendienteDTO): Observable<ServiceResponse<InstalacionPendiente>> {
    return from(this.createPendienteAsync(instalacionId, dto));
  }

  private async createPendienteAsync(instalacionId: string, dto: CreatePendienteDTO): Promise<ServiceResponse<InstalacionPendiente>> {
    const userId = this.supabase.user?.id;

    const { data, error } = await this.supabase.client
      .from('instalacion_pendientes')
      .insert({
        instalacion_id: instalacionId,
        ...dto,
        prioridad: dto.prioridad || 'Media',
        creado_por: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pendiente:', error);
      return { data: null, error: error.message, success: false };
    }

    // Cambiar estatus de instalación a "Pendientes" si no lo está
    const { data: instalacion } = await this.supabase.client
      .from('v_instalaciones_completo')
      .select('estatus_nombre')
      .eq('id', instalacionId)
      .single();

    if (instalacion && instalacion.estatus_nombre !== 'Pendientes' && instalacion.estatus_nombre !== 'Cerrada') {
      const { data: estatusPendientes } = await this.supabase.client
        .from('estatus_instalaciones')
        .select('id')
        .eq('nombre', 'Pendientes')
        .single();

      if (estatusPendientes) {
        await this.supabase.client
          .from('instalaciones')
          .update({ estatus_id: estatusPendientes.id })
          .eq('id', instalacionId);
      }
    }

    return { data: data as InstalacionPendiente, error: null, success: true };
  }

  /**
   * Actualiza un pendiente
   */
  updatePendiente(pendienteId: string, dto: UpdatePendienteDTO): Observable<ServiceResponse<InstalacionPendiente>> {
    return from(this.updatePendienteAsync(pendienteId, dto));
  }

  private async updatePendienteAsync(pendienteId: string, dto: UpdatePendienteDTO): Promise<ServiceResponse<InstalacionPendiente>> {
    const { data, error } = await this.supabase.client
      .from('instalacion_pendientes')
      .update(dto)
      .eq('id', pendienteId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pendiente:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as InstalacionPendiente, error: null, success: true };
  }

  /**
   * Resuelve un pendiente
   */
  resolverPendiente(pendienteId: string, dto?: ResolverPendienteDTO): Observable<ServiceResponse<InstalacionPendiente>> {
    return from(this.resolverPendienteAsync(pendienteId, dto));
  }

  private async resolverPendienteAsync(pendienteId: string, dto?: ResolverPendienteDTO): Promise<ServiceResponse<InstalacionPendiente>> {
    const userId = this.supabase.user?.id;

    const { data, error } = await this.supabase.client
      .from('instalacion_pendientes')
      .update({
        resuelto: true,
        resuelto_por: userId,
        resuelto_at: new Date().toISOString(),
        notas_resolucion: dto?.notas_resolucion
      })
      .eq('id', pendienteId)
      .select()
      .single();

    if (error) {
      console.error('Error resolviendo pendiente:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as InstalacionPendiente, error: null, success: true };
  }

  /**
   * Genera ticket desde pendiente
   */
  generarTicketDesdePendiente(pendienteId: string): Observable<ServiceResponse<string>> {
    return from(this.generarTicketDesdePendienteAsync(pendienteId));
  }

  private async generarTicketDesdePendienteAsync(pendienteId: string): Promise<ServiceResponse<string>> {
    const { data, error } = await this.supabase.client
      .rpc('generar_ticket_desde_pendiente', { p_pendiente_id: pendienteId });

    if (error) {
      console.error('Error generando ticket:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as string, error: null, success: true };
  }

  // ============================================================================
  // Evidencias
  // ============================================================================

  /**
   * Obtiene evidencias de una instalación
   */
  getEvidencias(instalacionId: string): Observable<ServiceResponse<InstalacionEvidencia[]>> {
    return from(this.fetchEvidencias(instalacionId));
  }

  private async fetchEvidencias(instalacionId: string): Promise<ServiceResponse<InstalacionEvidencia[]>> {
    const { data, error } = await this.supabase.client
      .from('instalacion_evidencias')
      .select('*')
      .eq('instalacion_id', instalacionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evidencias:', error);
      return { data: null, error: error.message, success: false };
    }

    // Generar URLs firmadas
    const evidenciasConUrl = await Promise.all(
      (data as InstalacionEvidencia[]).map(async (ev) => {
        const { data: urlData } = await this.supabase.client.storage
          .from('instalacion-evidencias')
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
    instalacionId: string,
    file: File,
    tipo: EvidenciaTipo,
    checklistItemId?: string,
    descripcion?: string
  ): Observable<ServiceResponse<InstalacionEvidencia>> {
    return from(this.subirEvidenciaAsync(instalacionId, file, tipo, checklistItemId, descripcion));
  }

  private async subirEvidenciaAsync(
    instalacionId: string,
    file: File,
    tipo: EvidenciaTipo,
    checklistItemId?: string,
    descripcion?: string
  ): Promise<ServiceResponse<InstalacionEvidencia>> {
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

    const fileName = `${instalacionId}/${Date.now()}_${processedFile.name}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('instalacion-evidencias')
      .upload(fileName, processedFile);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { data: null, error: 'Error al subir archivo', success: false };
    }

    const { data, error } = await this.supabase.client
      .from('instalacion_evidencias')
      .insert({
        instalacion_id: instalacionId,
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
        .from('instalacion_checklist')
        .update({ tiene_evidencia: true })
        .eq('id', checklistItemId);
    }

    return { data: data as InstalacionEvidencia, error: null, success: true };
  }

  /**
   * Elimina una evidencia
   */
  eliminarEvidencia(evidenciaId: string): Observable<ServiceResponse<void>> {
    return from(this.eliminarEvidenciaAsync(evidenciaId));
  }

  private async eliminarEvidenciaAsync(evidenciaId: string): Promise<ServiceResponse<void>> {
    // Obtener la evidencia para saber el path en storage
    const { data: evidencia, error: fetchError } = await this.supabase.client
      .from('instalacion_evidencias')
      .select('ruta_storage, checklist_item_id')
      .eq('id', evidenciaId)
      .single();

    if (fetchError || !evidencia) {
      return { data: null, error: 'Evidencia no encontrada', success: false };
    }

    // Eliminar del storage
    const { error: deleteStorageError } = await this.supabase.client.storage
      .from('instalacion-evidencias')
      .remove([evidencia.ruta_storage]);

    if (deleteStorageError) {
      console.error('Error deleting from storage:', deleteStorageError);
      // Continuar de todas formas para eliminar el registro
    }

    // Eliminar registro
    const { error } = await this.supabase.client
      .from('instalacion_evidencias')
      .delete()
      .eq('id', evidenciaId);

    if (error) {
      console.error('Error deleting evidencia:', error);
      return { data: null, error: error.message, success: false };
    }

    // Actualizar checklist item si aplica
    if (evidencia.checklist_item_id) {
      // Verificar si quedan otras evidencias para ese item
      const { count } = await this.supabase.client
        .from('instalacion_evidencias')
        .select('*', { count: 'exact', head: true })
        .eq('checklist_item_id', evidencia.checklist_item_id);

      if (count === 0) {
        await this.supabase.client
          .from('instalacion_checklist')
          .update({ tiene_evidencia: false })
          .eq('id', evidencia.checklist_item_id);
      }
    }

    return { data: undefined, error: null, success: true };
  }

  // ============================================================================
  // Firma Digital
  // ============================================================================

  /**
   * Firma una instalación
   */
  firmarInstalacion(id: string, dto: FirmarInstalacionDTO): Observable<ServiceResponse<Instalacion>> {
    return from(this.firmarInstalacionAsync(id, dto));
  }

  private async firmarInstalacionAsync(id: string, dto: FirmarInstalacionDTO): Promise<ServiceResponse<Instalacion>> {
    // Convertir base64 a blob
    const base64Data = dto.firma_base64.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // Subir firma a storage
    const fileName = `${id}/${Date.now()}_firma.png`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('firmas-clientes')
      .upload(fileName, blob);

    if (uploadError) {
      console.error('Error uploading firma:', uploadError);
      return { data: null, error: 'Error al subir firma', success: false };
    }

    // Obtener URL pública de la firma
    const { data: urlData } = await this.supabase.client.storage
      .from('firmas-clientes')
      .createSignedUrl(fileName, 31536000); // 1 año

    // Actualizar instalación
    const { data, error } = await this.supabase.client
      .from('instalaciones')
      .update({
        firma_cliente_url: urlData?.signedUrl || fileName,
        nombre_firmante: dto.nombre_firmante,
        puesto_firmante: dto.puesto_firmante,
        firmado_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating instalacion con firma:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Instalacion, error: null, success: true };
  }

  /**
   * Cierra una instalación
   */
  cerrarInstalacion(id: string): Observable<ServiceResponse<Instalacion>> {
    return from(this.cerrarInstalacionAsync(id));
  }

  private async cerrarInstalacionAsync(id: string): Promise<ServiceResponse<Instalacion>> {
    const { data: estatusCerrada } = await this.supabase.client
      .from('estatus_instalaciones')
      .select('id')
      .eq('nombre', 'Cerrada')
      .single();

    const { data, error } = await this.supabase.client
      .from('instalaciones')
      .update({
        estatus_id: estatusCerrada?.id,
        fecha_fin: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error cerrando instalacion:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Instalacion, error: null, success: true };
  }

  // ============================================================================
  // Catálogos
  // ============================================================================

  /**
   * Obtiene estatus de instalación
   */
  getEstatus(): Observable<ServiceResponse<EstatusInstalacion[]>> {
    return from(this.fetchEstatus());
  }

  private async fetchEstatus(): Promise<ServiceResponse<EstatusInstalacion[]>> {
    const { data, error } = await this.supabase.client
      .from('estatus_instalaciones')
      .select('*')
      .order('orden');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as EstatusInstalacion[], error: null, success: true };
  }

  /**
   * Obtiene módulos del sistema
   */
  getModulosSistema(): Observable<ServiceResponse<ModuloSistema[]>> {
    return from(this.fetchModulosSistema());
  }

  private async fetchModulosSistema(): Promise<ServiceResponse<ModuloSistema[]>> {
    const { data, error } = await this.supabase.client
      .from('modulos_sistema')
      .select('*')
      .eq('activo', true)
      .order('orden');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as ModuloSistema[], error: null, success: true };
  }

  // ============================================================================
  // Estadísticas
  // ============================================================================

  /**
   * Obtiene estadísticas de instalaciones
   */
  async getInstalacionStats(): Promise<InstalacionStats> {
    try {
      const { data: instalaciones } = await this.supabase.client
        .from('v_instalaciones_completo')
        .select('*');

      if (!instalaciones || instalaciones.length === 0) {
        return this.emptyStats();
      }

      const total = instalaciones.length;
      const programadas = instalaciones.filter(i => i.estatus_nombre === 'Programada').length;
      const en_proceso = instalaciones.filter(i => i.estatus_nombre === 'En proceso').length;
      const con_pendientes = instalaciones.filter(i => i.estatus_nombre === 'Pendientes').length;
      const cerradas = instalaciones.filter(i => i.estatus_nombre === 'Cerrada').length;

      // Agrupar por módulo
      const { data: modulos } = await this.supabase.client
        .from('instalacion_modulos')
        .select(`
          modulo:modulos_sistema(nombre)
        `);

      const modulosMap = new Map<string, number>();
      if (modulos) {
        modulos.forEach((m: any) => {
          const nombre = m.modulo?.nombre || 'Sin módulo';
          modulosMap.set(nombre, (modulosMap.get(nombre) || 0) + 1);
        });
      }

      // Promedio de pendientes
      const totalPendientes = instalaciones.reduce((acc, i) => acc + (i.pendientes_abiertos || 0), 0);
      const instalacionesConPendientes = instalaciones.filter(i => (i.pendientes_abiertos || 0) > 0).length;
      const promedio_pendientes = instalacionesConPendientes > 0 ? totalPendientes / instalacionesConPendientes : 0;

      return {
        total,
        programadas,
        en_proceso,
        con_pendientes,
        cerradas,
        por_modulo: Array.from(modulosMap.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad })),
        promedio_pendientes: Math.round(promedio_pendientes * 10) / 10
      };
    } catch (error) {
      console.error('Error getting instalacion stats:', error);
      return this.emptyStats();
    }
  }

  private emptyStats(): InstalacionStats {
    return {
      total: 0,
      programadas: 0,
      en_proceso: 0,
      con_pendientes: 0,
      cerradas: 0,
      por_modulo: [],
      promedio_pendientes: 0
    };
  }
}
