// ============================================================================
// Horario Service
// ============================================================================
// Servicio para gestión de horarios/turnos del sistema
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
  Horario,
  HorarioWithCount,
  CreateHorarioDTO,
  UpdateHorarioDTO,
  HorarioFilters
} from '../models';
import { ServiceResponse, PaginatedResponse, PaginationOptions } from '../models';
import { environment } from '../../../environments/environment';
import { TABLES } from '../constants/tables';
@Injectable({
  providedIn: 'root'
})
export class HorarioService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // READ Operations
  // ============================================================================

  /**
   * Obtiene todos los horarios con filtros y paginación
   */
  getHorarios(
    filters?: HorarioFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<HorarioWithCount>> {
    return from(this.fetchHorarios(filters, pagination));
  }

  private async fetchHorarios(
    filters?: HorarioFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<HorarioWithCount>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'nombre';
    const sortOrder = pagination?.sortOrder ?? 'asc';

    const from_idx = (page - 1) * pageSize;
    const to_idx = from_idx + pageSize - 1;

    let query = this.supabase.client
      .from(TABLES.HORARIOS)
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
      }
      if (filters.estatus) {
        query = query.eq('estatus', filters.estatus);
      }
      if (filters.es_horario_habil !== undefined) {
        query = query.eq('es_horario_habil', filters.es_horario_habil);
      }
    }

    // Ordenamiento y paginación
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_idx, to_idx);

    const { data, error, count } = await query;

    if (error) {
      if (!environment.production) { console.error('Error fetching horarios:', error); }
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    // Obtener conteo de usuarios para cada horario
    const horariosWithCount = await this.addUserCounts(data as Horario[]);

    const total = count ?? 0;
    return {
      data: horariosWithCount,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene un horario por ID
   */
  getHorarioById(id: string): Observable<ServiceResponse<HorarioWithCount>> {
    return from(this.fetchHorarioById(id));
  }

  private async fetchHorarioById(id: string): Promise<ServiceResponse<HorarioWithCount>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.HORARIOS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (!environment.production) { console.error('Error fetching horario by ID:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Obtener conteo de usuarios asignados
    const userCount = await this.getUserCount(id);
    const horarioWithCount: HorarioWithCount = {
      ...data,
      _count: { usuarios: userCount }
    };

    return { data: horarioWithCount, error: null, success: true };
  }

  /**
   * Obtiene todos los horarios activos (para selectores)
   */
  getHorariosActivos(): Observable<ServiceResponse<Horario[]>> {
    return from(this.fetchHorariosActivos());
  }

  private async fetchHorariosActivos(): Promise<ServiceResponse<Horario[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.HORARIOS)
      .select('*')
      .eq('estatus', 'Activo')
      .order('nombre');

    if (error) {
      if (!environment.production) { console.error('Error fetching horarios activos:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data, error: null, success: true };
  }

  /**
   * Obtiene usuarios asignados a un horario
   */
  getUsuariosByHorario(horarioId: string): Observable<ServiceResponse<any[]>> {
    return from(this.fetchUsuariosByHorario(horarioId));
  }

  private async fetchUsuariosByHorario(horarioId: string): Promise<ServiceResponse<any[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .select(`
        id,
        nombre_completo,
        email,
        avatar_url,
        rol:roles(id, nombre),
        equipo:equipos!profiles_area_equipo_id_fkey(id, nombre)
      `)
      .eq('turno_horario_id', horarioId)
      .eq('estatus', 'Activo')
      .order('nombre_completo');

    if (error) {
      if (!environment.production) { console.error('Error fetching usuarios by horario:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Map data to ensure proper typing
    const usuarios = (data || []).map((item: any) => ({
      id: item.id,
      nombre_completo: item.nombre_completo,
      email: item.email,
      avatar_url: item.avatar_url,
      rol: item.rol || undefined,
      equipo: item.equipo || undefined
    }));

    return { data: usuarios, error: null, success: true };
  }

  // ============================================================================
  // CREATE Operations
  // ============================================================================

  /**
   * Crea un nuevo horario
   */
  createHorario(horarioData: CreateHorarioDTO): Observable<ServiceResponse<Horario>> {
    return from(this.createHorarioAsync(horarioData));
  }

  private async createHorarioAsync(horarioData: CreateHorarioDTO): Promise<ServiceResponse<Horario>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.HORARIOS)
      .insert({
        nombre: horarioData.nombre,
        descripcion: horarioData.descripcion,
        hora_inicio: horarioData.hora_inicio,
        hora_fin: horarioData.hora_fin,
        dias_semana: horarioData.dias_semana,
        es_horario_habil: horarioData.es_horario_habil ?? true,
        estatus: horarioData.estatus || 'Activo'
      })
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error creating horario:', error); }
      return { data: null, error: this.mapError(error.message), success: false };
    }

    return { data, error: null, success: true };
  }

  // ============================================================================
  // UPDATE Operations
  // ============================================================================

  /**
   * Actualiza un horario
   */
  updateHorario(id: string, horarioData: UpdateHorarioDTO): Observable<ServiceResponse<Horario>> {
    return from(this.updateHorarioAsync(id, horarioData));
  }

  private async updateHorarioAsync(id: string, horarioData: UpdateHorarioDTO): Promise<ServiceResponse<Horario>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.HORARIOS)
      .update({
        ...horarioData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error updating horario:', error); }
      return { data: null, error: this.mapError(error.message), success: false };
    }

    return { data, error: null, success: true };
  }

  // ============================================================================
  // DELETE Operations
  // ============================================================================

  /**
   * Desactiva un horario (soft delete)
   */
  deactivateHorario(id: string): Observable<ServiceResponse<Horario>> {
    return this.updateHorario(id, { estatus: 'Inactivo' });
  }

  /**
   * Reactiva un horario
   */
  activateHorario(id: string): Observable<ServiceResponse<Horario>> {
    return this.updateHorario(id, { estatus: 'Activo' });
  }

  // ============================================================================
  // User Assignment
  // ============================================================================

  /**
   * Asigna un horario a un usuario
   */
  assignHorarioToUser(userId: string, horarioId: string): Observable<ServiceResponse<boolean>> {
    return from(this.assignHorarioAsync(userId, horarioId));
  }

  private async assignHorarioAsync(userId: string, horarioId: string): Promise<ServiceResponse<boolean>> {
    const { error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .update({
        turno_horario_id: horarioId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      if (!environment.production) { console.error('Error assigning horario to user:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: true, error: null, success: true };
  }

  /**
   * Remueve el horario de un usuario
   */
  removeHorarioFromUser(userId: string): Observable<ServiceResponse<boolean>> {
    return from(this.removeHorarioAsync(userId));
  }

  private async removeHorarioAsync(userId: string): Promise<ServiceResponse<boolean>> {
    const { error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .update({
        turno_horario_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      if (!environment.production) { console.error('Error removing horario from user:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: true, error: null, success: true };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Agrega el conteo de usuarios a cada horario
   */
  private async addUserCounts(horarios: Horario[]): Promise<HorarioWithCount[]> {
    if (horarios.length === 0) return horarios;

    const { data: counts, error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .select('turno_horario_id')
      .eq('estatus', 'Activo')
      .not('turno_horario_id', 'is', null);

    if (error) {
      if (!environment.production) { console.error('Error fetching user counts:', error); }
      return horarios.map(h => ({ ...h, _count: { usuarios: 0 } }));
    }

    const countMap = new Map<string, number>();
    counts?.forEach(profile => {
      const horarioId = profile.turno_horario_id;
      countMap.set(horarioId, (countMap.get(horarioId) || 0) + 1);
    });

    return horarios.map(horario => ({
      ...horario,
      _count: { usuarios: countMap.get(horario.id) || 0 }
    }));
  }

  /**
   * Obtiene el conteo de usuarios para un horario específico
   */
  private async getUserCount(horarioId: string): Promise<number> {
    const { count, error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .select('*', { count: 'exact', head: true })
      .eq('turno_horario_id', horarioId)
      .eq('estatus', 'Activo');

    if (error) {
      if (!environment.production) { console.error('Error fetching user count:', error); }
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Verifica si una hora está dentro del horario
   */
  isWithinSchedule(horario: Horario, date: Date = new Date()): boolean {
    const dayOfWeek = date.getDay(); // 0=Domingo, 1=Lunes, etc.

    // Normalizar días a números (pueden venir como strings de la BD)
    const diasNormalizados = this.normalizeDias(horario.dias_semana);

    if (!diasNormalizados.includes(dayOfWeek)) {
      return false;
    }

    const currentTime = date.toTimeString().slice(0, 8); // "HH:MM:SS"
    return currentTime >= horario.hora_inicio && currentTime <= horario.hora_fin;
  }

  /**
   * Formatea los días de la semana para mostrar
   */
  formatDiasSemana(dias: (number | string)[]): string {
    const nombres: { [key: number]: string } = {
      0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb'
    };
    // Normalizar días a números
    const diasNormalizados = this.normalizeDias(dias);
    return diasNormalizados.sort((a, b) => a - b).map(d => nombres[d]).join(', ');
  }

  /**
   * Normaliza array de días (pueden ser strings o números) a números
   */
  private normalizeDias(dias: (number | string)[]): number[] {
    return dias.map(d => typeof d === 'string' ? parseInt(d, 10) : d);
  }

  /**
   * Formatea la hora para mostrar (HH:MM)
   */
  formatHora(hora: string): string {
    return hora.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
  }

  private mapError(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('duplicate') || lowerMessage.includes('unique')) {
      return 'Ya existe un horario con ese nombre';
    }

    return message;
  }
}
