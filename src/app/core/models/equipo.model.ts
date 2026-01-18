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

export interface EquipoWithSupervisor extends Equipo {
  supervisor?: {
    id: string;
    nombre_completo: string;
    email: string;
  };
}
