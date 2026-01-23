// ============================================================================
// Horario Model
// ============================================================================
// Representa los turnos/horarios de trabajo del sistema
// ============================================================================

export type HorarioEstatus = 'Activo' | 'Inactivo';

// Días de la semana como números (0=Domingo, 1=Lunes, ..., 6=Sábado)
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Horario {
  id: string;
  nombre: string;
  descripcion?: string;
  hora_inicio: string;    // TIME format: "HH:MM:SS"
  hora_fin: string;       // TIME format: "HH:MM:SS"
  dias_semana: number[];  // Array de días: [1,2,3,4,5] = Lun-Vie
  es_horario_habil: boolean;
  estatus: HorarioEstatus;
  created_at: string;
  updated_at?: string;
}

// Horario con conteo de usuarios asignados
export interface HorarioWithCount extends Horario {
  _count?: {
    usuarios: number;
  };
}

// DTOs
export interface CreateHorarioDTO {
  nombre: string;
  descripcion?: string;
  hora_inicio: string;
  hora_fin: string;
  dias_semana: number[];
  es_horario_habil?: boolean;
  estatus?: HorarioEstatus;
}

export interface UpdateHorarioDTO {
  nombre?: string;
  descripcion?: string;
  hora_inicio?: string;
  hora_fin?: string;
  dias_semana?: number[];
  es_horario_habil?: boolean;
  estatus?: HorarioEstatus;
}

// Filtros
export interface HorarioFilters {
  search?: string;
  estatus?: HorarioEstatus;
  es_horario_habil?: boolean;
}

// Helper para convertir número de día a nombre
export const DIAS_SEMANA_NOMBRES: { [key: number]: string } = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado'
};

// Helper para convertir número de día a abreviatura
export const DIAS_SEMANA_ABREV: { [key: number]: string } = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb'
};
