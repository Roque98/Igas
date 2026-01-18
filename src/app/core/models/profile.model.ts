// ============================================================================
// Profile Model
// ============================================================================

import { Role, RoleName } from './role.model';
import { Equipo } from './equipo.model';
import { Horario } from './horario.model';

// Tipos base
export type ProfileEstatus = 'Activo' | 'Inactivo';
export type Disponibilidad = 'En línea' | 'Ocupado' | 'Fuera de turno';

// Configuración del usuario (preferencias)
export interface ProfileConfig {
  theme?: 'light' | 'dark';
  notifications?: {
    email?: boolean;
    push?: boolean;
    sound?: boolean;
  };
  language?: string;
  [key: string]: any;
}

// Interfaz base del perfil
export interface Profile {
  id: string;
  nombre_completo: string;
  email: string;
  rol_id: string;
  area_equipo_id?: string;
  telefono?: string;
  estatus: ProfileEstatus;
  turno_horario_id?: string;
  avatar_url?: string;
  disponibilidad: Disponibilidad;
  configuracion: ProfileConfig;
  password_changed_at?: string;
  created_at: string;
  updated_at: string;
}

// Perfil con relaciones expandidas
export interface ProfileWithRelations extends Profile {
  rol?: Role;
  equipo?: Equipo;
  horario?: Horario;
}

// DTO para crear un usuario (admin)
export interface CreateUserDTO {
  email: string;
  password: string;
  nombre_completo: string;
  rol_id: string;
  area_equipo_id?: string;
  telefono?: string;
  turno_horario_id?: string;
}

// DTO para actualizar un perfil
export interface UpdateProfileDTO {
  nombre_completo?: string;
  telefono?: string;
  avatar_url?: string;
  disponibilidad?: Disponibilidad;
  configuracion?: ProfileConfig;
}

// DTO para actualizar un usuario (admin)
export interface UpdateUserDTO extends UpdateProfileDTO {
  rol_id?: string;
  area_equipo_id?: string;
  turno_horario_id?: string;
  estatus?: ProfileEstatus;
}

// Filtros para búsqueda de usuarios
export interface UserFilters {
  search?: string;           // Búsqueda por nombre o email
  rol_id?: string;
  area_equipo_id?: string;
  estatus?: ProfileEstatus;
  disponibilidad?: Disponibilidad;
}

// Opciones de paginación
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: keyof Profile;
  sortOrder?: 'asc' | 'desc';
}

// Respuesta paginada
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Respuesta de servicio
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}
