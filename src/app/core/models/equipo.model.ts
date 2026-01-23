// ============================================================================
// Equipo Model
// ============================================================================

export type EquipoEstatus = 'Activo' | 'Inactivo';

export interface Equipo {
  id: string;
  nombre: string;
  descripcion?: string;
  supervisor_id?: string;
  estatus: EquipoEstatus;
  created_at: string;
  updated_at: string;
}

export interface EquipoMember {
  id: string;
  nombre_completo: string;
  email: string;
  avatar_url?: string;
  disponibilidad?: string;
  rol?: {
    id: string;
    nombre: string;
  };
}

export interface EquipoWithRelations extends Equipo {
  supervisor?: {
    id: string;
    nombre_completo: string;
    email: string;
    avatar_url?: string;
  };
  miembros?: EquipoMember[];
  _count?: {
    miembros: number;
  };
}

// Alias para compatibilidad
export type EquipoWithSupervisor = EquipoWithRelations;

// DTOs
export interface CreateEquipoDTO {
  nombre: string;
  descripcion?: string;
  supervisor_id?: string;
  estatus?: EquipoEstatus;
}

export interface UpdateEquipoDTO {
  nombre?: string;
  descripcion?: string;
  supervisor_id?: string | null;
  estatus?: EquipoEstatus;
}

// Filtros
export interface EquipoFilters {
  search?: string;
  estatus?: EquipoEstatus;
  supervisor_id?: string;
}
