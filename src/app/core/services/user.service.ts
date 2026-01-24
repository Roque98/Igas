// ============================================================================
// User Service
// ============================================================================
// Servicio para gestión de usuarios/perfiles del sistema
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of, BehaviorSubject, tap } from 'rxjs';
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
import { compressImage, IMAGE_PRESETS } from '../helpers/image.utils';
import { environment } from '../../../environments/environment';
import { TABLES, STORAGE_BUCKETS } from '../constants/tables';
// Interfaz para el perfil del usuario actual (navbar, etc.)
export interface CurrentUserProfile {
  id: string;
  nombre_completo: string;
  avatar_url: string | null;
  email: string;
  rol_id: string;
  rol_nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // Estado global del perfil del usuario actual
  // ============================================================================
  private currentProfileSubject = new BehaviorSubject<CurrentUserProfile | null>(null);
  public currentProfile$ = this.currentProfileSubject.asObservable();

  constructor() {
    // Cargar perfil cuando el usuario se autentique
    this.supabase.currentUser$.subscribe(user => {
      if (user) {
        this.loadCurrentProfile();
      } else {
        this.currentProfileSubject.next(null);
      }
    });
  }

  /**
   * Carga el perfil del usuario actual
   */
  async loadCurrentProfile(): Promise<void> {
    const userId = this.supabase.user?.id;
    if (!userId) return;

    const { data, error } = await this.supabase.client
      .from(TABLES.PROFILES)
      .select('id, nombre_completo, avatar_url, email, rol_id, roles(nombre)')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const profile: CurrentUserProfile = {
        id: data.id,
        nombre_completo: data.nombre_completo,
        avatar_url: data.avatar_url,
        email: data.email,
        rol_id: data.rol_id,
        rol_nombre: (data.roles as any)?.nombre
      };
      this.currentProfileSubject.next(profile);
    }
  }

  /**
   * Actualiza el perfil en el estado global (para uso interno)
   */
  updateCurrentProfileState(updates: Partial<CurrentUserProfile>): void {
    const current = this.currentProfileSubject.value;
    if (current) {
      this.currentProfileSubject.next({ ...current, ...updates });
    }
  }

  /**
   * Obtiene el perfil actual de forma síncrona
   */
  get currentProfile(): CurrentUserProfile | null {
    return this.currentProfileSubject.value;
  }

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

    // Usar función RPC para evitar problemas con RLS
    // La función get_all_users() tiene SECURITY DEFINER y maneja permisos internamente
    const { data: rpcData, error: rpcError } = await this.supabase.client
      .rpc('get_all_users');

    if (rpcError) {
      if (!environment.production) { console.error('Error fetching users via RPC:', rpcError); }
      // Fallback a consulta directa si la función RPC no existe
      return this.fetchUsersDirectQuery(filters, pagination);
    }

    // Si la función RPC existe, procesar los datos
    let users = rpcData as ProfileWithRelations[];

    // Obtener relaciones para cada usuario
    const userIds = users.map(u => u.id);

    // Obtener roles, equipos y horarios en paralelo
    const [rolesResult, equiposResult, horariosResult] = await Promise.all([
      this.supabase.client.from(TABLES.ROLES).select('*'),
      this.supabase.client.from(TABLES.EQUIPOS).select('*'),
      this.supabase.client.from(TABLES.HORARIOS).select('*')
    ]);

    const rolesMap = new Map((rolesResult.data || []).map(r => [r.id, r]));
    const equiposMap = new Map((equiposResult.data || []).map(e => [e.id, e]));
    const horariosMap = new Map((horariosResult.data || []).map(h => [h.id, h]));

    // Agregar relaciones a cada usuario
    users = users.map(user => ({
      ...user,
      rol: rolesMap.get(user.rol_id) || null,
      equipo: equiposMap.get(user.area_equipo_id) || null,
      horario: horariosMap.get(user.turno_horario_id) || null
    }));

    // Aplicar filtros en memoria
    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        users = users.filter(u =>
          u.nombre_completo?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.rol_id) {
        users = users.filter(u => u.rol_id === filters.rol_id);
      }
      if (filters.area_equipo_id) {
        users = users.filter(u => u.area_equipo_id === filters.area_equipo_id);
      }
      if (filters.estatus) {
        users = users.filter(u => u.estatus === filters.estatus);
      }
      if (filters.disponibilidad) {
        users = users.filter(u => u.disponibilidad === filters.disponibilidad);
      }
    }

    // Ordenar
    users.sort((a, b) => {
      const aVal = (a as any)[sortBy] ?? '';
      const bVal = (b as any)[sortBy] ?? '';
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginar
    const total = users.length;
    const paginatedUsers = users.slice(from, to + 1);

    return {
      data: paginatedUsers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Fallback: consulta directa a profiles (usa RLS estándar)
   */
  private async fetchUsersDirectQuery(
    filters?: UserFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<ProfileWithRelations>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'created_at';
    const sortOrder = pagination?.sortOrder ?? 'desc';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase.client
      .from(TABLES.PROFILES)
      .select(`
        *,
        rol:roles(*),
        equipo:equipos!profiles_area_equipo_id_fkey(*),
        horario:horarios(*)
      `, { count: 'exact' });

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

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      if (!environment.production) { console.error('Error fetching users:', error); }
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
      .from(TABLES.PROFILES)
      .select(`
        *,
        rol:roles(*),
        equipo:equipos!profiles_area_equipo_id_fkey(*),
        horario:horarios(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (!environment.production) { console.error('Error fetching user by ID:', error); }
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
      // 1. Crear usuario en auth.users usando signUp
      const { data: authData, error: authError } = await this.supabase.client.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            nombre_completo: userData.nombre_completo
          }
        }
      });

      if (authError) {
        if (!environment.production) { console.error('Error creating auth user:', authError); }
        return { data: null, error: this.mapAuthError(authError.message), success: false };
      }

      if (!authData.user) {
        return { data: null, error: 'No se pudo crear el usuario', success: false };
      }

      // 2. Crear el profile directamente (sin depender del trigger)
      const { data: profileData, error: profileError } = await this.supabase.client
        .from(TABLES.PROFILES)
        .insert({
          id: authData.user.id,
          nombre_completo: userData.nombre_completo,
          email: userData.email,
          rol_id: userData.rol_id,
          area_equipo_id: userData.area_equipo_id,
          telefono: userData.telefono,
          turno_horario_id: userData.turno_horario_id,
          estatus: 'Activo'
        })
        .select()
        .single();

      if (profileError) {
        if (!environment.production) { console.error('Error updating profile:', profileError); }
        // El usuario fue creado pero el profile no se actualizó completamente
        return { data: null, error: 'Usuario creado pero error al actualizar perfil', success: false };
      }

      return { data: profileData as Profile, error: null, success: true };
    } catch (error: any) {
      if (!environment.production) { console.error('Unexpected error creating user:', error); }
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
      .from(TABLES.PROFILES)
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error updating profile:', error); }
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
      .from(TABLES.PROFILES)
      .update({
        estatus: 'Inactivo',
        disponibilidad: 'Fuera de turno',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error deactivating user:', error); }
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
      .from(TABLES.PROFILES)
      .update({
        estatus: 'Activo',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error activating user:', error); }
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
      // Comprimir imagen antes de subir (máx 200x200px)
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        try {
          processedFile = await compressImage(file, IMAGE_PRESETS.avatar);
          if (!environment.production) { console.log(`Avatar comprimido: ${file.size} bytes -> ${processedFile.size} bytes`); }
        } catch (compressionError) {
          if (!environment.production) { console.warn('No se pudo comprimir la imagen, usando original:', compressionError); }
        }
      }

      // Usar siempre .jpg ya que comprimimos a JPEG
      const fileName = `${userId}/avatar.jpg`;

      // Subir archivo al storage
      const { data: uploadData, error: uploadError } = await this.supabase.client.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(fileName, processedFile, {
          upsert: true, // Sobrescribir si existe
          contentType: processedFile.type
        });

      if (uploadError) {
        if (!environment.production) { console.error('Error uploading avatar:', uploadError); }
        return { data: null, error: 'Error al subir imagen', success: false };
      }

      // Obtener URL pública con cache-busting
      const { data: urlData } = this.supabase.client.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(fileName);

      // Agregar timestamp para evitar caché del navegador
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Actualizar el profile con la nueva URL
      await this.updateProfileAsync(userId, { avatar_url: avatarUrl });

      // Actualizar el estado global del perfil para que se refleje en toda la app
      this.updateCurrentProfileState({ avatar_url: avatarUrl });

      return { data: avatarUrl, error: null, success: true };
    } catch (error: any) {
      if (!environment.production) { console.error('Unexpected error uploading avatar:', error); }
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
        .from(STORAGE_BUCKETS.AVATARS)
        .list(userId);

      if (listError) {
        if (!environment.production) { console.error('Error listing avatar files:', listError); }
        return { data: null, error: 'Error al buscar avatar', success: false };
      }

      if (files && files.length > 0) {
        // Eliminar archivos
        const filePaths = files.map(file => `${userId}/${file.name}`);
        const { error: deleteError } = await this.supabase.client.storage
          .from(STORAGE_BUCKETS.AVATARS)
          .remove(filePaths);

        if (deleteError) {
          if (!environment.production) { console.error('Error deleting avatar:', deleteError); }
          return { data: null, error: 'Error al eliminar avatar', success: false };
        }
      }

      // Actualizar profile para quitar avatar_url
      await this.updateProfileAsync(userId, { avatar_url: undefined });

      // Actualizar el estado global del perfil
      this.updateCurrentProfileState({ avatar_url: null });

      return { data: true, error: null, success: true };
    } catch (error: any) {
      if (!environment.production) { console.error('Unexpected error deleting avatar:', error); }
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
      .from(TABLES.ROLES)
      .select('*')
      .order('nombre');

    if (error) {
      if (!environment.production) { console.error('Error fetching roles:', error); }
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
      .from(TABLES.EQUIPOS)
      .select('*')
      .eq('estatus', 'Activo')
      .order('nombre');

    if (error) {
      if (!environment.production) { console.error('Error fetching equipos:', error); }
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
      .from(TABLES.HORARIOS)
      .select('*')
      .order('nombre');

    if (error) {
      if (!environment.production) { console.error('Error fetching horarios:', error); }
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
  // Statistics Methods
  // ============================================================================

  /**
   * Obtiene estadísticas de usuarios para el dashboard
   */
  async getUserStats(): Promise<{
    total: number;
    activos: number;
    inactivos: number;
    porRol: { nombre: string; cantidad: number; color: string }[];
    porEquipo: { nombre: string; cantidad: number }[];
    porDisponibilidad: { estado: string; cantidad: number }[];
  }> {
    try {
      // Obtener todos los usuarios
      const { data: users } = await this.supabase.client.rpc('get_all_users');

      if (!users || users.length === 0) {
        return {
          total: 0,
          activos: 0,
          inactivos: 0,
          porRol: [],
          porEquipo: [],
          porDisponibilidad: []
        };
      }

      // Obtener roles y equipos para nombres
      const [rolesResult, equiposResult] = await Promise.all([
        this.supabase.client.from(TABLES.ROLES).select('*'),
        this.supabase.client.from(TABLES.EQUIPOS).select('*')
      ]);

      const rolesMap = new Map((rolesResult.data || []).map(r => [r.id, r.nombre]));
      const equiposMap = new Map((equiposResult.data || []).map(e => [e.id, e.nombre]));

      // Colores para roles
      const roleColors: Record<string, string> = {
        'Administrador': '#4680ff',
        'Supervisor': '#fc6180',
        'Técnico': '#93be52',
        'Analista': '#ffba57'
      };

      // Calcular estadísticas
      const total = users.length;
      const activos = users.filter((u: any) => u.estatus === 'Activo').length;
      const inactivos = total - activos;

      // Por rol
      const rolCount = new Map<string, number>();
      users.forEach((u: any) => {
        const rolNombre = rolesMap.get(u.rol_id) || 'Sin rol';
        rolCount.set(rolNombre, (rolCount.get(rolNombre) || 0) + 1);
      });
      const porRol = Array.from(rolCount.entries()).map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
        color: roleColors[nombre] || '#6c757d'
      }));

      // Por equipo
      const equipoCount = new Map<string, number>();
      users.forEach((u: any) => {
        const equipoNombre = equiposMap.get(u.area_equipo_id) || 'Sin equipo';
        equipoCount.set(equipoNombre, (equipoCount.get(equipoNombre) || 0) + 1);
      });
      const porEquipo = Array.from(equipoCount.entries()).map(([nombre, cantidad]) => ({
        nombre,
        cantidad
      }));

      // Por disponibilidad
      const dispCount = new Map<string, number>();
      users.forEach((u: any) => {
        const disp = u.disponibilidad || 'Sin estado';
        dispCount.set(disp, (dispCount.get(disp) || 0) + 1);
      });
      const porDisponibilidad = Array.from(dispCount.entries()).map(([estado, cantidad]) => ({
        estado,
        cantidad
      }));

      return { total, activos, inactivos, porRol, porEquipo, porDisponibilidad };
    } catch (error) {
      if (!environment.production) { console.error('Error getting user stats:', error); }
      return {
        total: 0,
        activos: 0,
        inactivos: 0,
        porRol: [],
        porEquipo: [],
        porDisponibilidad: []
      };
    }
  }

  /**
   * Obtiene todos los usuarios para exportación (sin paginación)
   */
  async getAllUsersForExport(): Promise<ProfileWithRelations[]> {
    const result = await this.fetchUsers(undefined, { page: 1, pageSize: 10000 });
    return result.data;
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
