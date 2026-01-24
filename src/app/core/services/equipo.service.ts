// ============================================================================
// Equipo Service
// ============================================================================
// Servicio para gestión de equipos/áreas del sistema
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
  Equipo,
  EquipoWithRelations,
  EquipoMember,
  CreateEquipoDTO,
  UpdateEquipoDTO,
  EquipoFilters
} from '../models';
import { ServiceResponse, PaginatedResponse, PaginationOptions } from '../models';
import { environment } from '../../../environments/environment';
import { TABLES } from '../constants/tables';
@Injectable({
  providedIn: 'root'
})
export class EquipoService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // READ Operations
  // ============================================================================

  /**
   * Obtiene todos los equipos con filtros y paginación
   */
  getEquipos(
    filters?: EquipoFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<EquipoWithRelations>> {
    return from(this.fetchEquipos(filters, pagination));
  }

  private async fetchEquipos(
    filters?: EquipoFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<EquipoWithRelations>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'nombre';
    const sortOrder = pagination?.sortOrder ?? 'asc';

    const from_idx = (page - 1) * pageSize;
    const to_idx = from_idx + pageSize - 1;

    // Query base con relación al supervisor
    let query = this.supabase.client
      .from(TABLES.EQUIPOS)
      .select(`
        *,
        supervisor:profiles!equipos_supervisor_id_fkey(
          id,
          nombre_completo,
          email,
          avatar_url
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
      }
      if (filters.estatus) {
        query = query.eq('estatus', filters.estatus);
      }
      if (filters.supervisor_id) {
        query = query.eq('supervisor_id', filters.supervisor_id);
      }
    }

    // Ordenamiento y paginación
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_idx, to_idx);

    const { data, error, count } = await query;

    if (error) {
      if (!environment.production) { console.error('Error fetching equipos:', error); }
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    // Obtener conteo de miembros para cada equipo
    const equiposWithCount = await this.addMemberCounts(data as EquipoWithRelations[]);

    const total = count ?? 0;
    return {
      data: equiposWithCount,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene un equipo por ID con sus relaciones
   */
  getEquipoById(id: string): Observable<ServiceResponse<EquipoWithRelations>> {
    return from(this.fetchEquipoById(id));
  }

  private async fetchEquipoById(id: string): Promise<ServiceResponse<EquipoWithRelations>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.EQUIPOS)
      .select(`
        *,
        supervisor:profiles!equipos_supervisor_id_fkey(
          id,
          nombre_completo,
          email,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (!environment.production) { console.error('Error fetching equipo by ID:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Obtener miembros del equipo
    const miembros = await this.fetchEquipoMembers(id);
    const equipoWithMembers: EquipoWithRelations = {
      ...data,
      miembros,
      _count: { miembros: miembros.length }
    };

    return { data: equipoWithMembers, error: null, success: true };
  }

  /**
   * Obtiene los miembros de un equipo
   */
  getEquipoMembers(equipoId: string): Observable<ServiceResponse<EquipoMember[]>> {
    return from(this.fetchEquipoMembersResponse(equipoId));
  }

  private async fetchEquipoMembersResponse(equipoId: string): Promise<ServiceResponse<EquipoMember[]>> {
    const members = await this.fetchEquipoMembers(equipoId);
    return { data: members, error: null, success: true };
  }

  private async fetchEquipoMembers(equipoId: string): Promise<EquipoMember[]> {
    const { data, error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .select(`
        id,
        nombre_completo,
        email,
        avatar_url,
        disponibilidad,
        rol:roles(id, nombre)
      `)
      .eq('area_equipo_id', equipoId)
      .eq('estatus', 'Activo')
      .order('nombre_completo');

    if (error) {
      if (!environment.production) { console.error('Error fetching equipo members:', error); }
      return [];
    }

    // Map the data to ensure proper typing (rol comes as single object from Supabase)
    return (data || []).map((item: any) => ({
      id: item.id,
      nombre_completo: item.nombre_completo,
      email: item.email,
      avatar_url: item.avatar_url,
      disponibilidad: item.disponibilidad,
      rol: item.rol || undefined
    }));
  }

  /**
   * Agrega el conteo de miembros a cada equipo
   */
  private async addMemberCounts(equipos: EquipoWithRelations[]): Promise<EquipoWithRelations[]> {
    if (equipos.length === 0) return equipos;

    // Obtener conteo de miembros por equipo
    const { data: counts, error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .select('area_equipo_id')
      .eq('estatus', 'Activo')
      .not('area_equipo_id', 'is', null);

    if (error) {
      if (!environment.production) { console.error('Error fetching member counts:', error); }
      return equipos.map(e => ({ ...e, _count: { miembros: 0 } }));
    }

    // Contar miembros por equipo
    const countMap = new Map<string, number>();
    counts?.forEach(profile => {
      const equipoId = profile.area_equipo_id;
      countMap.set(equipoId, (countMap.get(equipoId) || 0) + 1);
    });

    return equipos.map(equipo => ({
      ...equipo,
      _count: { miembros: countMap.get(equipo.id) || 0 }
    }));
  }

  /**
   * Obtiene todos los equipos activos (para selectores)
   */
  getEquiposActivos(): Observable<ServiceResponse<Equipo[]>> {
    return from(this.fetchEquiposActivos());
  }

  private async fetchEquiposActivos(): Promise<ServiceResponse<Equipo[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.EQUIPOS)
      .select('*')
      .eq('estatus', 'Activo')
      .order('nombre');

    if (error) {
      if (!environment.production) { console.error('Error fetching equipos activos:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data, error: null, success: true };
  }

  // ============================================================================
  // CREATE Operations
  // ============================================================================

  /**
   * Crea un nuevo equipo
   */
  createEquipo(equipoData: CreateEquipoDTO): Observable<ServiceResponse<Equipo>> {
    return from(this.createEquipoAsync(equipoData));
  }

  private async createEquipoAsync(equipoData: CreateEquipoDTO): Promise<ServiceResponse<Equipo>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.EQUIPOS)
      .insert({
        nombre: equipoData.nombre,
        descripcion: equipoData.descripcion,
        supervisor_id: equipoData.supervisor_id || null,
        estatus: equipoData.estatus || 'Activo'
      })
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error creating equipo:', error); }
      return { data: null, error: this.mapError(error.message), success: false };
    }

    return { data, error: null, success: true };
  }

  // ============================================================================
  // UPDATE Operations
  // ============================================================================

  /**
   * Actualiza un equipo
   */
  updateEquipo(id: string, equipoData: UpdateEquipoDTO): Observable<ServiceResponse<Equipo>> {
    return from(this.updateEquipoAsync(id, equipoData));
  }

  private async updateEquipoAsync(id: string, equipoData: UpdateEquipoDTO): Promise<ServiceResponse<Equipo>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.EQUIPOS)
      .update({
        ...equipoData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error updating equipo:', error); }
      return { data: null, error: this.mapError(error.message), success: false };
    }

    return { data, error: null, success: true };
  }

  /**
   * Asigna un supervisor al equipo
   */
  assignSupervisor(equipoId: string, supervisorId: string | null): Observable<ServiceResponse<Equipo>> {
    return this.updateEquipo(equipoId, { supervisor_id: supervisorId });
  }

  // ============================================================================
  // DELETE Operations
  // ============================================================================

  /**
   * Desactiva un equipo (soft delete)
   */
  deactivateEquipo(id: string): Observable<ServiceResponse<Equipo>> {
    return this.updateEquipo(id, { estatus: 'Inactivo' });
  }

  /**
   * Reactiva un equipo
   */
  activateEquipo(id: string): Observable<ServiceResponse<Equipo>> {
    return this.updateEquipo(id, { estatus: 'Activo' });
  }

  // ============================================================================
  // Member Management
  // ============================================================================

  /**
   * Asigna un usuario a un equipo
   */
  assignMember(userId: string, equipoId: string): Observable<ServiceResponse<boolean>> {
    return from(this.assignMemberAsync(userId, equipoId));
  }

  private async assignMemberAsync(userId: string, equipoId: string): Promise<ServiceResponse<boolean>> {
    const { error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .update({
        area_equipo_id: equipoId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      if (!environment.production) { console.error('Error assigning member to equipo:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: true, error: null, success: true };
  }

  /**
   * Remueve un usuario de un equipo
   */
  removeMember(userId: string): Observable<ServiceResponse<boolean>> {
    return from(this.removeMemberAsync(userId));
  }

  private async removeMemberAsync(userId: string): Promise<ServiceResponse<boolean>> {
    const { error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .update({
        area_equipo_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      if (!environment.production) { console.error('Error removing member from equipo:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: true, error: null, success: true };
  }

  /**
   * Obtiene usuarios sin equipo asignado (para asignar a equipos)
   */
  getUnassignedUsers(): Observable<ServiceResponse<EquipoMember[]>> {
    return from(this.fetchUnassignedUsers());
  }

  private async fetchUnassignedUsers(): Promise<ServiceResponse<EquipoMember[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .select(`
        id,
        nombre_completo,
        email,
        avatar_url,
        disponibilidad,
        rol:roles(id, nombre)
      `)
      .is('area_equipo_id', null)
      .eq('estatus', 'Activo')
      .order('nombre_completo');

    if (error) {
      if (!environment.production) { console.error('Error fetching unassigned users:', error); }
      return { data: null, error: error.message, success: false };
    }

    // Map the data to ensure proper typing (rol comes as single object from Supabase)
    const members: EquipoMember[] = (data || []).map((item: any) => ({
      id: item.id,
      nombre_completo: item.nombre_completo,
      email: item.email,
      avatar_url: item.avatar_url,
      disponibilidad: item.disponibilidad,
      rol: item.rol || undefined
    }));

    return { data: members, error: null, success: true };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private mapError(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('duplicate') || lowerMessage.includes('unique')) {
      return 'Ya existe un equipo con ese nombre';
    }
    if (lowerMessage.includes('foreign key')) {
      return 'El supervisor seleccionado no existe';
    }

    return message;
  }
}
