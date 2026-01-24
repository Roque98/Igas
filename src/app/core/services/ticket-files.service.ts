// ============================================================================
// Ticket Files Service
// ============================================================================
// Servicio para gestión de bitácora y adjuntos de tickets
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { compressImage, IMAGE_PRESETS } from '../helpers/image.utils';
import {
  TicketBitacora,
  TicketAdjunto,
  AgregarNotaDTO,
  ServiceResponse
} from '../models';
import { environment } from '../../../environments/environment';
import { TABLES, STORAGE_BUCKETS } from '../constants/tables';

@Injectable({
  providedIn: 'root'
})
export class TicketFilesService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // Bitácora
  // ============================================================================

  /**
   * Obtiene la bitácora de un ticket
   */
  getBitacora(ticketId: string): Observable<ServiceResponse<TicketBitacora[]>> {
    return from(this.fetchBitacora(ticketId));
  }

  private async fetchBitacora(ticketId: string): Promise<ServiceResponse<TicketBitacora[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.TICKET_BITACORA)
      .select(`
        *,
        usuario:profiles(nombre_completo, avatar_url)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) {
      if (!environment.production) { console.error('Error fetching ticket timeline:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TicketBitacora[], error: null, success: true };
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
      .from(TABLES.TICKET_BITACORA)
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
      if (!environment.production) { console.error('Error adding note:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: data as TicketBitacora, error: null, success: true };
  }

  /**
   * Registra una entrada en la bitácora (uso interno)
   */
  async registrarEnBitacora(
    ticketId: string,
    tipo: 'nota' | 'asignacion' | 'adjunto' | 'cambio_estatus',
    mensaje: string,
    datosAdicionales?: Record<string, unknown>
  ): Promise<void> {
    const userId = this.supabase.user?.id;

    await this.supabase.client
      .from(TABLES.TICKET_BITACORA)
      .insert({
        ticket_id: ticketId,
        usuario_id: userId,
        tipo,
        mensaje,
        datos_adicionales: datosAdicionales
      });
  }

  // ============================================================================
  // Adjuntos
  // ============================================================================

  /**
   * Obtiene los adjuntos de un ticket
   */
  getAdjuntos(ticketId: string): Observable<ServiceResponse<TicketAdjunto[]>> {
    return from(this.fetchAdjuntos(ticketId));
  }

  private async fetchAdjuntos(ticketId: string): Promise<ServiceResponse<TicketAdjunto[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.TICKET_ADJUNTOS)
      .select(`
        *,
        usuario:profiles(nombre_completo)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) {
      if (!environment.production) { console.error('Error fetching attachments:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Generar URLs firmadas para cada adjunto
    const adjuntosConUrl = await Promise.all(
      (data as TicketAdjunto[]).map(async (adj) => {
        const { data: urlData } = await this.supabase.client.storage
          .from(STORAGE_BUCKETS.TICKET_ATTACHMENTS)
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

    // Comprimir imagen si es una imagen
    let processedFile = file;
    if (file.type.startsWith('image/')) {
      try {
        processedFile = await compressImage(file, IMAGE_PRESETS.evidencia);
        if (!environment.production) { console.log(`Adjunto comprimido: ${file.size} -> ${processedFile.size} bytes`); }
      } catch (err) {
        if (!environment.production) { console.warn('No se pudo comprimir la imagen:', err); }
      }
    }

    // Generar ruta única
    const fileName = `${ticketId}/${Date.now()}_${processedFile.name}`;

    // Subir archivo a storage
    const { error: uploadError } = await this.supabase.client.storage
      .from(STORAGE_BUCKETS.TICKET_ATTACHMENTS)
      .upload(fileName, processedFile);

    if (uploadError) {
      if (!environment.production) { console.error('Error uploading file:', uploadError); }
      return { data: null, error: 'Error al subir archivo', success: false };
    }

    // Registrar en base de datos
    const { data, error } = await this.supabase.client
      .from(TABLES.TICKET_ADJUNTOS)
      .insert({
        ticket_id: ticketId,
        nombre_archivo: processedFile.name,
        ruta_storage: fileName,
        tipo_archivo: processedFile.type,
        tamanio_bytes: processedFile.size,
        subido_por: userId
      })
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error registering attachment:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Registrar en bitácora
    await this.registrarEnBitacora(
      ticketId,
      'adjunto',
      `Archivo adjuntado: ${file.name}`,
      { adjunto_id: data.id, nombre: file.name }
    );

    return { data: data as TicketAdjunto, error: null, success: true };
  }

  /**
   * Elimina un adjunto
   */
  eliminarAdjunto(adjuntoId: string, rutaStorage: string): Observable<ServiceResponse<void>> {
    return from(this.eliminarAdjuntoAsync(adjuntoId, rutaStorage));
  }

  private async eliminarAdjuntoAsync(adjuntoId: string, rutaStorage: string): Promise<ServiceResponse<void>> {
    // Eliminar de storage
    const { error: storageError } = await this.supabase.client.storage
      .from(STORAGE_BUCKETS.TICKET_ATTACHMENTS)
      .remove([rutaStorage]);

    if (storageError) {
      if (!environment.production) { console.error('Error deleting file from storage:', storageError); }
    }

    // Eliminar de base de datos
    const { error } = await this.supabase.client
      .from(TABLES.TICKET_ADJUNTOS)
      .delete()
      .eq('id', adjuntoId);

    if (error) {
      if (!environment.production) { console.error('Error deleting attachment record:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: null, error: null, success: true };
  }
}
