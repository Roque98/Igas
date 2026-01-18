// ============================================================================
// User Service
// ============================================================================
// Servicio para gestión de usuarios/perfiles del sistema
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
  Profile,
  ProfileWithRelations,
  CreateUserDTO,
  UpdateProfileDTO,
  UpdateUserDTO,
  UserFilters,
  PaginationOptions,
  PaginatedResponse,
  ServiceResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // READ Operations
  // ============================================================================

  /**
   * Obtiene todos los usuarios con filtros y paginación
   */
  getUsers(
    filters?: UserFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<ProfileWithRelations>> {
    return from(this.fetchUsers(filters, pagination));
  }

  private async fetchUsers(
    filters?: UserFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<ProfileWithRelations>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'created_at';
    const sortOrder = pagination?.sortOrder ?? 'desc';

    // Calcular offset
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Construir query base con relaciones
    let query = this.supabase.client
      .from('profiles')
      .select(`
        *,
        rol:roles(*),
        equipo:equipos(*),
        horario:horarios(*)
      `, { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.or(`nombre_completo.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      if (filters.rol_id) {
        query = query.eq('rol_id', filters.rol_id);
      }
      if (filters.area_equipo_id) {
        query = query.eq('area_equipo_id', filters.area_equipo_id);
      }
      if (filters.estatus) {
        query = query.eq('estatus', filters.estatus);
      }
      if (filters.disponibilidad) {
        query = query.eq('disponibilidad', filters.disponibilidad);
      }
    }

    // Aplicar ordenamiento y paginación
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
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
      data: data as ProfileWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene un usuario por ID con sus relaciones
   */
  getUserById(id: string): Observable<ServiceResponse<ProfileWithRelations>> {
    return from(this.fetchUserById(id));
  }

  private async fetchUserById(id: string): Promise<ServiceResponse<ProfileWithRelations>> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select(`
        *,
        rol:roles(*),
        equipo:equipos(*),
        horario:horarios(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user by ID:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as ProfileWithRelations, error: null, success: true };
  }

  /**
   * Obtiene el perfil del usuario actual
   */
  getCurrentUserProfile(): Observable<ServiceResponse<ProfileWithRelations>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return of({ data: null, error: 'Usuario no autenticado', success: false });
    }
    return this.getUserById(userId);
  }

  // ============================================================================
  // CREATE Operations
  // ============================================================================

  /**
   * Crea un nuevo usuario (solo admin)
   * Utiliza Supabase Admin API para crear el usuario en auth.users
   * El trigger handle_new_user() crea automáticamente el profile
   */
  createUser(userData: CreateUserDTO): Observable<ServiceResponse<Profile>> {
    return from(this.createUserAsync(userData));
  }

  private async createUserAsync(userData: CreateUserDTO): Promise<ServiceResponse<Profile>> {
    try {
      // 1. Crear usuario en auth.users con metadata
      const { data: authData, error: authError } = await this.supabase.client.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          nombre_completo: userData.nombre_completo
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return { data: null, error: this.mapAuthError(authError.message), success: false };
      }

      if (!authData.user) {
        return { data: null, error: 'No se pudo crear el usuario', success: false };
      }

      // 2. Actualizar el profile con los datos adicionales
      // (el trigger ya creó el profile base)
      const { data: profileData, error: profileError } = await this.supabase.client
        .from('profiles')
        .update({
          rol_id: userData.rol_id,
          area_equipo_id: userData.area_equipo_id,
          telefono: userData.telefono,
          turno_horario_id: userData.turno_horario_id
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // El usuario fue creado pero el profile no se actualizó completamente
        return { data: null, error: 'Usuario creado pero error al actualizar perfil', success: false };
      }

      return { data: profileData as Profile, error: null, success: true };
    } catch (error: any) {
      console.error('Unexpected error creating user:', error);
      return { data: null, error: error.message || 'Error inesperado', success: false };
    }
  }

  // ============================================================================
  // UPDATE Operations
  // ============================================================================

  /**
   * Actualiza el perfil del usuario actual
   */
  updateCurrentUserProfile(data: UpdateProfileDTO): Observable<ServiceResponse<Profile>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return of({ data: null, error: 'Usuario no autenticado', success: false });
    }
    return this.updateProfile(userId, data);
  }

  /**
   * Actualiza un usuario por ID (solo admin)
   */
  updateUser(id: string, data: UpdateUserDTO): Observable<ServiceResponse<Profile>> {
    return this.updateProfile(id, data);
  }

  private updateProfile(id: string, data: UpdateProfileDTO | UpdateUserDTO): Observable<ServiceResponse<Profile>> {
    return from(this.updateProfileAsync(id, data));
  }

  private async updateProfileAsync(
    id: string,
    data: UpdateProfileDTO | UpdateUserDTO
  ): Promise<ServiceResponse<Profile>> {
    const { data: profileData, error } = await this.supabase.client
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: profileData as Profile, error: null, success: true };
  }

  /**
   * Actualiza la disponibilidad del usuario actual
   */
  updateDisponibilidad(disponibilidad: Profile['disponibilidad']): Observable<ServiceResponse<Profile>> {
    return this.updateCurrentUserProfile({ disponibilidad });
  }

  // ============================================================================
  // DELETE Operations
  // ============================================================================

  /**
   * Desactiva un usuario (soft delete)
   * No elimina el registro, solo cambia el estatus a 'Inactivo'
   */
  deactivateUser(id: string): Observable<ServiceResponse<Profile>> {
    return from(this.deactivateUserAsync(id));
  }

  private async deactivateUserAsync(id: string): Promise<ServiceResponse<Profile>> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({
        estatus: 'Inactivo',
        disponibilidad: 'Fuera de turno',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating user:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Profile, error: null, success: true };
  }

  /**
   * Reactiva un usuario
   */
  activateUser(id: string): Observable<ServiceResponse<Profile>> {
    return from(this.activateUserAsync(id));
  }

  private async activateUserAsync(id: string): Promise<ServiceResponse<Profile>> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({
        estatus: 'Activo',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error activating user:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Profile, error: null, success: true };
  }

  // ============================================================================
  // Avatar Operations
  // ============================================================================

  /**
   * Sube un avatar para el usuario actual
   */
  uploadAvatar(file: File): Observable<ServiceResponse<string>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return of({ data: null, error: 'Usuario no autenticado', success: false });
    }
    return from(this.uploadAvatarAsync(userId, file));
  }

  private async uploadAvatarAsync(userId: string, file: File): Promise<ServiceResponse<string>> {
    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Subir archivo al storage
      const { data: uploadData, error: uploadError } = await this.supabase.client.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true, // Sobrescribir si existe
          contentType: file.type
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return { data: null, error: 'Error al subir imagen', success: false };
      }

      // Obtener URL pública
      const { data: urlData } = this.supabase.client.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Actualizar el profile con la nueva URL
      await this.updateProfileAsync(userId, { avatar_url: avatarUrl });

      return { data: avatarUrl, error: null, success: true };
    } catch (error: any) {
      console.error('Unexpected error uploading avatar:', error);
      return { data: null, error: error.message || 'Error inesperado', success: false };
    }
  }

  /**
   * Elimina el avatar del usuario actual
   */
  deleteAvatar(): Observable<ServiceResponse<boolean>> {
    const userId = this.supabase.user?.id;
    if (!userId) {
      return of({ data: null, error: 'Usuario no autenticado', success: false });
    }
    return from(this.deleteAvatarAsync(userId));
  }

  private async deleteAvatarAsync(userId: string): Promise<ServiceResponse<boolean>> {
    try {
      // Listar archivos del usuario
      const { data: files, error: listError } = await this.supabase.client.storage
        .from('avatars')
        .list(userId);

      if (listError) {
        console.error('Error listing avatar files:', listError);
        return { data: null, error: 'Error al buscar avatar', success: false };
      }

      if (files && files.length > 0) {
        // Eliminar archivos
        const filePaths = files.map(file => `${userId}/${file.name}`);
        const { error: deleteError } = await this.supabase.client.storage
          .from('avatars')
          .remove(filePaths);

        if (deleteError) {
          console.error('Error deleting avatar:', deleteError);
          return { data: null, error: 'Error al eliminar avatar', success: false };
        }
      }

      // Actualizar profile para quitar avatar_url
      await this.updateProfileAsync(userId, { avatar_url: undefined });

      return { data: true, error: null, success: true };
    } catch (error: any) {
      console.error('Unexpected error deleting avatar:', error);
      return { data: null, error: error.message || 'Error inesperado', success: false };
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Obtiene todos los roles disponibles
   */
  getRoles(): Observable<ServiceResponse<any[]>> {
    return from(this.fetchRoles());
  }

  private async fetchRoles(): Promise<ServiceResponse<any[]>> {
    const { data, error } = await this.supabase.client
      .from('roles')
      .select('*')
      .order('nombre');

    if (error) {
      console.error('Error fetching roles:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data, error: null, success: true };
  }

  /**
   * Obtiene todos los equipos disponibles
   */
  getEquipos(): Observable<ServiceResponse<any[]>> {
    return from(this.fetchEquipos());
  }

  private async fetchEquipos(): Promise<ServiceResponse<any[]>> {
    const { data, error } = await this.supabase.client
      .from('equipos')
      .select('*')
      .eq('estatus', 'Activo')
      .order('nombre');

    if (error) {
      console.error('Error fetching equipos:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data, error: null, success: true };
  }

  /**
   * Obtiene todos los horarios disponibles
   */
  getHorarios(): Observable<ServiceResponse<any[]>> {
    return from(this.fetchHorarios());
  }

  private async fetchHorarios(): Promise<ServiceResponse<any[]>> {
    const { data, error } = await this.supabase.client
      .from('horarios')
      .select('*')
      .order('nombre');

    if (error) {
      console.error('Error fetching horarios:', error);
      return { data: null, error: error.message, success: false };
    }

    return { data, error: null, success: true };
  }

  /**
   * Verifica si el usuario actual es administrador
   */
  isAdmin(): Observable<boolean> {
    return this.getCurrentUserProfile().pipe(
      map(response => {
        if (!response.success || !response.data) return false;
        return response.data.rol?.nombre === 'Administrador';
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Verifica si el usuario actual tiene un rol específico
   */
  hasRole(roleName: string): Observable<boolean> {
    return this.getCurrentUserProfile().pipe(
      map(response => {
        if (!response.success || !response.data) return false;
        return response.data.rol?.nombre === roleName;
      }),
      catchError(() => of(false))
    );
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapAuthError(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('email already registered') || lowerMessage.includes('user already registered')) {
      return 'Este correo electrónico ya está registrado';
    }
    if (lowerMessage.includes('invalid email')) {
      return 'El correo electrónico no es válido';
    }
    if (lowerMessage.includes('password')) {
      return 'La contraseña no cumple con los requisitos mínimos';
    }

    return message;
  }
}
